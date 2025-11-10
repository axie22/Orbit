import csv, json, os, pathlib, subprocess, hashlib, time, sys
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
    # yt-dlp may produce .m4a or .webm/.opus depending on the video
    for ext in (".m4a", ".webm", ".mp3", ".opus", ".mkv"):
        p = vdir / f"source{ext}"
        if p.exists():
            return p
    # Fallback: first non-json file in dir
    for p in sorted(vdir.iterdir()):
        if p.suffix.lower() not in {".json", ".vtt"} and p.is_file():
            return p
    return None

def ingest_one(video_id: str, title: str):
    url  = f"https://www.youtube.com/watch?v={video_id}"
    vdir = WORK / video_id
    vdir.mkdir(parents=True, exist_ok=True)

    # 1) Download AUDIO ONLY + captions + info JSON (no full video)
    #    - Use bestaudio; store as source.<ext>
    #    - We still ask yt-dlp to write subtitles/captions if available
    run(
        'yt-dlp '
        f'-f "bestaudio[ext=m4a]/bestaudio" '
        f'--write-subs --write-auto-subs --sub-langs "{CAPTION_LANGS}" '
        '--write-info-json --no-part '
        f'-o "{vdir}/source.%(ext)s" "{url}"'
    )

    info_json = vdir / "source.info.json"
    meta = json.loads(info_json.read_text())

    # 2) Locate downloaded audio file
    audio_src = find_downloaded_audio(vdir)
    if not audio_src or not audio_src.exists():
        raise RuntimeError(f"No audio file downloaded for {video_id}")

    # 3) ffprobe on audio for metadata
    ffprobe_path = vdir / "ffprobe.json"
    run(f'ffprobe -v quiet -print_format json -show_format -show_streams "{audio_src}" > "{ffprobe_path}"')

    # 4) Normalize captions -> captions.norm.en.vtt
    captions_best = pick_best_caption(vdir)
    captions_norm = None
    if captions_best:
        captions_norm = vdir / "captions.norm.en.vtt"
        # Copy-through normalize for now
        captions_norm.write_text(captions_best.read_text())

    # 5) Extract audio.wav
    audio_wav = vdir / "audio.wav"
    run(f'ffmpeg -y -i "{audio_src}" -ac 1 -ar 16000 -vn -acodec pcm_s16le "{audio_wav}"')

    # 6) Hashes use audio.wav as stable content hash
    hashes = {
        "audio_wav_sha256": sha256_of(audio_wav),
        "captions_norm_vtt_sha256": sha256_of(captions_norm) if captions_norm else None,
        "content_sha": None
    }
    hashes["content_sha"] = hashes["audio_wav_sha256"]  # content hash anchor

    # 7) Provenance no raw video
    prov = {
        "video_id": video_id,
        "url": url,
        "downloaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "processing_version": PROCESSING_VERSION,
        "yt_etag": meta.get("http_headers", {}).get("ETag"),
        "pipeline": "audio-first"
    }

    # 8) Upload to S3
    # raw-ish metadata for traceability
    upload_file(info_json,    s3_key(video_id, "raw/metadata.json"),  "application/json")
    upload_file(ffprobe_path, s3_key(video_id, "raw/ffprobe.json"),   "application/json")
    if captions_best:
        upload_file(captions_best, s3_key(video_id, f"raw/{captions_best.name}"), "text/vtt")
    # derived assets
    upload_file(audio_wav,    s3_key(video_id, "derived/audio.wav"),             "audio/wav")
    if captions_norm:
        upload_file(captions_norm, s3_key(video_id, "derived/captions.norm.en.vtt"), "text/vtt")
    # housekeeping docs
    (vdir / "hashes.json").write_text(json.dumps(hashes, indent=2))
    (vdir / "provenance.json").write_text(json.dumps(prov, indent=2))
    upload_file(vdir / "hashes.json",     s3_key(video_id, "hashes.json"),          "application/json")
    upload_file(vdir / "provenance.json", s3_key(video_id, "raw/provenance.json"),  "application/json")

    # 9) DynamoDB upsert
    item = {
        "videoid": f"video#{video_id}",
        "version": "meta#v0",
        "title": title,
        "url": url,
        "ingested_at": prov["downloaded_at"],
        "processing_version": PROCESSING_VERSION,
        "pipeline": "audio-first",
        "status": "audio_ingested",
        "has_captions": bool(captions_best),
        "assets": {
            "audio_wav": f"s3://{S3_BUCKET}/{s3_key(video_id, 'derived/audio.wav')}",
            "metadata_json": f"s3://{S3_BUCKET}/{s3_key(video_id, 'raw/metadata.json')}",
            "ffprobe_json": f"s3://{S3_BUCKET}/{s3_key(video_id, 'raw/ffprobe.json')}",
            "captions_norm_vtt": (
                f"s3://{S3_BUCKET}/{s3_key(video_id, 'derived/captions.norm.en.vtt')}" if captions_norm else None
            )
        },
        "hashes": hashes,
        # Optional fields for later stages to fill:
        "segments_planned": [],     # you can populate after alignment
        "frames_ready": False
    }
    # Enrich with yt fields if present
    item["channel_id"] = meta.get("channel_id")
    item["channel_title"] = meta.get("channel")
    # duration may not exist on audio-only
    dur = meta.get("duration")
    if dur is not None:
        item["dur_sec"] = int(dur)

    ddb.put_item(Item=item)

    # 10) Cleanup: keep or remove original downloaded audio file
    if not KEEP_SOURCE and audio_src.exists() and audio_src.name != "audio.wav":
        audio_src.unlink()

def main():
    if not MANIFEST_PATH.exists():
        print(MANIFEST_PATH)
        print("manifest.csv not found", file=sys.stderr)
        sys.exit(1)
    with MANIFEST_PATH.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            ingest_one(row["video_id"], row.get("title",""))

if __name__ == "__main__":
    main()
