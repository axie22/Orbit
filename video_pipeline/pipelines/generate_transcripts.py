"""
Generate transcripts for ALL videos or ONE video.

Logic:
1. if contains captions → use caption_cleaner
2. captions missing → fallback to Whisper ASR
3. save final transcript in transcripts/<video_id>/transcript.txt
"""

from pathlib import Path
from .caption_cleaner import process_caption
from .audio_transcriber import process_audio


def generate_transcripts(video_id: str = None):
    work_dir = Path("work")
    output_root = Path("transcripts")
    output_root.mkdir(exist_ok=True)

    if video_id:
        video_dirs = [work_dir / video_id]
    else:
        video_dirs = [d for d in work_dir.iterdir() if d.is_dir()]

    print(f"Processing {len(video_dirs)} videos...\n")

    for vd in video_dirs:
        vid = vd.name
        print("====================================")
        print(f"[{vid}] Starting...")

        transcript = ""

        # 1 — try captions first
        if (vd / "captions.norm.en.vtt").exists():
            transcript = process_caption(vid)

        # 2 — if captions empty or missing --> audio
        if not transcript:
            print(f"[{vid}] Trying audio fallback...")
            transcript = process_audio(vid)

        # 3 - if still nothing, skip
        if not transcript:
            print(f"[{vid}] No transcript available. Skipping.\n")
            continue

        # 4 — save into transcripts/<video_id>/transcript.txt
        out_dir = output_root / vid
        out_dir.mkdir(exist_ok=True)
        (out_dir / "transcript.txt").write_text(transcript, encoding="utf-8")

        print(f"[{vid}] FINAL transcript saved → transcripts/{vid}/transcript.txt\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", help="Process one video only")
    args = parser.parse_args()

    generate_transcripts(video_id=args.video_id)
