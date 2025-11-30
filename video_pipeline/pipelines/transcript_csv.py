import pandas as pd
import re
from pathlib import Path

MANIFEST_PATH = Path("video_pipeline/manifests/manifest.csv")
TRANSCRIPTS_DIR = Path("transcripts")
OUTPUT_PATH = Path("transcripts/video_problem_transcripts.csv")

def extract_problem_id(title: str):
    match = re.search(r"Leetcode\s+(\d+)", title)
    return int(match.group(1)) if match else None

def load_transcript(video_id: str):
    transcript_path = TRANSCRIPTS_DIR / video_id / "transcript.txt"
    if transcript_path.exists():
        return transcript_path.read_text(encoding="utf-8")
    return None

def main():
    df = pd.read_csv(MANIFEST_PATH)
    df["problem_id"] = df["title"].apply(extract_problem_id).astype("Int64") # int
    df["transcript"] = df["video_id"].apply(load_transcript) # transcript text
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Saved final CSV to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
