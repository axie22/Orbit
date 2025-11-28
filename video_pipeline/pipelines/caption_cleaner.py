"""
Clean captions.norm.en.vtt into a natural transcript.
"""

import re
from pathlib import Path

TIMESTAMP_RE = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?\.\d{3}")  # 0:00.000 or 00:00:00.000


def clean_vtt(vtt_path: str) -> str:
    raw = Path(vtt_path).read_text(encoding="utf-8")
    lines = raw.split("\n")

    cleaned = []
    last_line = None

    # skip first 4 non-empty header lines
    skip_count = 4
    processed = []
    for line in lines:
        if line.strip():
            if skip_count > 0:
                skip_count -= 1
                continue
        processed.append(line)

    for line in processed:
        stripped = line.strip()
        if not stripped:
            continue

        # timestamp lines
        if TIMESTAMP_RE.match(stripped) or "-->" in stripped:
            continue

        # subtitle markup
        if "<" in stripped or ">" in stripped:
            continue

        # must contain letters
        if not re.search(r"[A-Za-z]", stripped):
            continue

        # dedupe consecutive lines
        if stripped == last_line:
            continue

        cleaned.append(stripped)
        last_line = stripped

    return " ".join(cleaned).strip()


def process_caption(video_id: str) -> str:
    work_dir = Path("work") / video_id
    vtt_file = work_dir / "captions.norm.en.vtt"

    if not vtt_file.exists():
        print(f"[{video_id}] No captions found.")
        return ""

    print(f"[{video_id}] Cleaning captions...")
    transcript = clean_vtt(str(vtt_file))

    out_file = work_dir / "transcript.txt"
    out_file.write_text(transcript, encoding="utf-8")

    print(f"[{video_id}] Saved transcript → {out_file}")
    print(f"[{video_id}] length = {len(transcript.split())} words\n")

    return transcript


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--video-id", required=True)
    args = parser.parse_args()
    process_caption(args.video_id)
