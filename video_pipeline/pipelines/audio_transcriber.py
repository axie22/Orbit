"""
Fallback ASR using Whisper when captions are missing.
"""

import whisper
from pathlib import Path


def process_audio(video_id: str) -> str:
    work_dir = Path("work") / video_id
    audio_file = work_dir / "audio.wav"

    if not audio_file.exists() or audio_file.stat().st_size < 2000:
        print(f"[{video_id}] No usable audio.wav found.")
        return ""

    print(f"[{video_id}] Loading Whisper model (small)...")
    model = whisper.load_model("small")

    print(f"[{video_id}] Transcribing audio...")
    result = model.transcribe(str(audio_file), fp16=False)
    text = result.get("text", "").strip()

    out_file = work_dir / "transcript.txt"
    out_file.write_text(text, encoding="utf-8")

    print(f"[{video_id}] Saved transcript → {out_file}")
    print(f"[{video_id}] length = {len(text.split())} words\n")

    return text


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", required=True)
    args = parser.parse_args()
    process_audio(args.video_id)
