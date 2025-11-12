import csv, json, os, pathlib, subprocess, hashlib, time, sys, argparse
import shlex, subprocess, random
import boto3
from botocore.exceptions import ClientError

# Environment
S3_BUCKET   = os.environ["S3_BUCKET"]
DDB_TABLE   = os.environ["DDB_TABLE"]
AWS_REGION  = os.environ.get("AWS_REGION", "us-east-1")
MANIFEST_PATH = pathlib.Path(os.environ.get("MANIFEST_PATH"))
KEEP_SOURCE = os.environ.get("KEEP_SOURCE", "false").lower() == "true"  # "keep original audio file"
PROCESSING_VERSION = os.environ.get("PROCESSING_VERSION", "v0.1.0")
CAPTION_LANGS = os.environ.get("CAPTION_LANGS", "en.*")  # comma pattern for yt-dlp

WORK = pathlib.Path("work")
WORK.mkdir(exist_ok=True, parents=True)

s3  = boto3.client("s3", region_name=AWS_REGION)
ddb = boto3.resource("dynamodb", region_name=AWS_REGION).Table(DDB_TABLE)

def run(cmd: str):
    subprocess.check_call(cmd, shell=True)

def sha256_of(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1<<20), b""):
            h.update(chunk)
    return h.hexdigest()

def s3_key(video_id: str, rel: str) -> str:
    return f"yt/{video_id}/{rel}"

def s3_exists(key: str) -> bool:
    try:
        s3.head_object(Bucket=S3_BUCKET, Key=key)
        return True
    except ClientError:
        return False

def upload_file(path: pathlib.Path, key: str, content_type: str):
    if not path or not path.exists():
        return
    if s3_exists(key):
        return
    s3.upload_file(
        Filename=str(path),
        Bucket=S3_BUCKET,
        Key=key,
        ExtraArgs={"ContentType": content_type}
    )

def pick_best_caption(raw_dir: pathlib.Path):
    # Prefer human en* first, else auto en*; yt-dlp may name files variably.
    human = sorted([p for p in raw_dir.glob("*.vtt") if ("auto" not in p.name.lower()) and ("en" in p.name.lower())])
    if human:
        return human[0]
    auto = sorted([p for p in raw_dir.glob("*.vtt") if ("auto" in p.name.lower()) and ("en" in p.name.lower())])
    return auto[0] if auto else None

def find_downloaded_audio(vdir: pathlib.Path) -> pathlib.Path | None:
    # yt-dlp may produce .mp4 (progressive), .m4a, .webm/.opus, etc.
    for ext in (".mp4", ".m4a", ".webm", ".opus", ".mp3", ".mkv"):
        p = vdir / f"source{ext}"
        if p.exists():
            return p
    # Fallback: first non-json/non-vtt file
    for p in sorted(vdir.iterdir()):
        if p.suffix.lower() not in {".json", ".vtt"} and p.is_file():
            return p
    return None

def _sh(cmd: str):
    subprocess.check_call(cmd, shell=True)

def _backoff(i: int):
    time.sleep((2 ** i) * 0.5 + random.random() * 0.25)

def download_audio_any(url: str, vdir: pathlib.Path, caption_langs: str):
    """
    Robust media+subs:
      - MEDIA: Android client (no cookies), prefer progressive 18; fallback to best.
      - SUBTITLES: Web client with cookies, best-effort (won't fail job).
    """
    vdir.mkdir(parents=True, exist_ok=True)

    # --- MEDIA: android client, NO cookies ---
    media_cmd = (
        'yt-dlp '
        '--extractor-args "youtube:player_client=android" '
        '--force-ipv4 '
        '--no-part --write-info-json --check-formats '
        '--retries 10 --fragment-retries 10 --sleep-requests 1 --concurrent-fragments 1 '
        '-f "18/best" '  # prefer progressive MP4 360p; fallback to anything playable
        f'-o "{vdir}/source.%(ext)s" '
        f'{shlex.quote(url)}'
    )
    # Try twice with small backoff
    for i in range(2):
        try:
            _sh(media_cmd)
            break
        except subprocess.CalledProcessError as e:
            if i == 1:
                raise
            _backoff(i)

    # --- SUBTITLES: web client + cookies (best effort) ---
    # Choose cookies: explicit cookies.txt beats browser extraction
    if os.getenv("YTDLP_COOKIES_FILE"):
        cookies_flag = f'--cookies "{os.environ["YTDLP_COOKIES_FILE"]}" '
    else:
        cookies_flag = f'--cookies-from-browser {os.getenv("YTDLP_COOKIES_FROM_BROWSER","chrome")} '

    subs_cmd = (
        'yt-dlp --skip-download '
        f'{cookies_flag}'
        '--extractor-args "youtube:player_client=web_creator" '
        '--force-ipv4 '
        f'--write-subs --write-auto-subs --sub-langs "{caption_langs}" '
        f'-o "{vdir}/source.%(ext)s" '
        f'{shlex.quote(url)}'
    )
    try:
        _sh(subs_cmd)
    except subprocess.CalledProcessError:
        # No subs or gated: proceed without captions
        pass



def ingest_one(video_id: str, title: str):
    url  = f"https://www.youtube.com/watch?v={video_id}"
    vdir = WORK / video_id
    vdir.mkdir(parents=True, exist_ok=True)

    # 1) MEDIA via Android (no cookies), captions via web+cookies (best-effort)
    download_audio_any(url, vdir, CAPTION_LANGS)

    # 2) Read info json (guard)
    info_json = vdir / "source.info.json"
    meta = json.loads(info_json.read_text()) if info_json.exists() else {}

    # 3) Locate downloaded media (progressive mp4, m4a, webm, etc.)
    audio_src = find_downloaded_audio(vdir)
    if not audio_src or not audio_src.exists():
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        ddb.put_item(Item={
            "PK": f"video#{video_id}",
            "SK": "meta#v0",
            "video_id": video_id,
            "title": title,
            "url": url,
            "status": "download_failed",
            "ingested_at": now_iso,
            "processing_version": PROCESSING_VERSION,
            "error": "no_playable_media_after_android",
        })
        return

    # 4) ffprobe
    ffprobe_path = vdir / "ffprobe.json"
    run(f'ffprobe -v quiet -print_format json -show_format -show_streams "{audio_src}" > "{ffprobe_path}"')

    # 5) Normalize captions -> captions.norm.en.vtt
    captions_best = pick_best_caption(vdir)
    captions_norm = None
    if captions_best:
        captions_norm = vdir / "captions.norm.en.vtt"
        captions_norm.write_text(captions_best.read_text())
    has_captions = captions_norm is not None

    # 6) Extract audio.wav
    audio_wav = vdir / "audio.wav"
    run(f'ffmpeg -y -i "{audio_src}" -ac 1 -ar 16000 -vn -acodec pcm_s16le "{audio_wav}"')

    # 7) Hashes (build once, omit optional fields when absent)
    hashes = {
        "audio_wav_sha256": sha256_of(audio_wav),
        "content_sha": None,
    }
    hashes["content_sha"] = hashes["audio_wav_sha256"]
    if has_captions:
        hashes["captions_norm_vtt_sha256"] = sha256_of(captions_norm)

    # 8) Provenance
    prov = {
        "video_id": video_id,
        "url": url,
        "downloaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "processing_version": PROCESSING_VERSION,
        "yt_etag": meta.get("http_headers", {}).get("ETag"),
        "pipeline": "audio-first"
    }

    # 9) Upload to S3
    upload_file(info_json,    s3_key(video_id, "raw/metadata.json"),  "application/json") if info_json.exists() else None
    upload_file(ffprobe_path, s3_key(video_id, "raw/ffprobe.json"),   "application/json")
    if captions_best:
        upload_file(captions_best, s3_key(video_id, f"raw/{captions_best.name}"), "text/vtt")
    upload_file(audio_wav,    s3_key(video_id, "derived/audio.wav"),  "audio/wav")
    if has_captions:
        upload_file(captions_norm, s3_key(video_id, "derived/captions.norm.en.vtt"), "text/vtt")

    (vdir / "hashes.json").write_text(json.dumps(hashes, indent=2))
    (vdir / "provenance.json").write_text(json.dumps(prov, indent=2))
    upload_file(vdir / "hashes.json",     s3_key(video_id, "hashes.json"),         "application/json")
    upload_file(vdir / "provenance.json", s3_key(video_id, "raw/provenance.json"), "application/json")

    # 10) Build DDB item (no None values)
    assets = {
        "audio_wav":     f"s3://{S3_BUCKET}/{s3_key(video_id, 'derived/audio.wav')}",
        "metadata_json": f"s3://{S3_BUCKET}/{s3_key(video_id, 'raw/metadata.json')}" if info_json.exists() else None,
        "ffprobe_json":  f"s3://{S3_BUCKET}/{s3_key(video_id, 'raw/ffprobe.json')}",
    }
    # strip Nones
    assets = {k: v for k, v in assets.items() if v is not None}
    if has_captions:
        assets["captions_norm_vtt"] = f"s3://{S3_BUCKET}/{s3_key(video_id, 'derived/captions.norm.en.vtt')}"

    item = {
        "videoid": f"video#{video_id}",
        "version": "meta#v0",
        "title": title,
        "url": url,
        "ingested_at": prov["downloaded_at"],
        "processing_version": PROCESSING_VERSION,
        "pipeline": "audio-first",
        "status": "audio_ingested",
        "has_captions": has_captions,
        "assets": assets,
        "hashes": hashes,
        "segments_planned": [],
        "frames_ready": False,
        "channel_id": meta.get("channel_id"),
        "channel_title": meta.get("channel"),
    }
    dur = meta.get("duration")
    if dur is not None:
        item["dur_sec"] = int(dur)

    ddb.put_item(Item=item)

    # 11) Cleanup local progressive file if desired
    if not KEEP_SOURCE and audio_src.exists() and audio_src.name != "audio.wav":
        audio_src.unlink()

def main():
    parser = argparse.ArgumentParser(prog='ingest')
    parser.add_argument('-s', '--start', help='Row to start ingestion process from', type=int)
    args = parser.parse_args()

    if not MANIFEST_PATH.exists():
        print(MANIFEST_PATH)
        print("manifest.csv not found", file=sys.stderr)
        sys.exit(1)
    
    start_row = 0
    if args.start:
        with open(MANIFEST_PATH, 'r', newline='') as file:
            reader = csv.reader(file)
            row_count = sum(1 for row in reader)
        if args.start > row_count:
            print("Start row can not be greater than manifest.csv length")
            sys.exit(1)
        start_row = args.start
    
    
    with MANIFEST_PATH.open() as f:
        reader = csv.DictReader(f)
        for _ in range(start_row):
            next(reader, None)

        for row in reader:
            ingest_one(row["video_id"], row.get("title",""))

if __name__ == "__main__":
    main()
