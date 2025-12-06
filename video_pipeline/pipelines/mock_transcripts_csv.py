import argparse
import csv
import re
from pathlib import Path

def parse_filename(filename):
    stem = filename.stem
    match = re.search(r'^(.*)\s\[([a-zA-Z0-9_-]{11,})\]$', stem)
    if match:
        return match.group(1), match.group(2)
    return stem, None

def to_csv(input_dir, output_file):
    input_path = Path(input_dir)
    output_path = Path(output_file)
    
    # create output directory if it doesn't exist
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    txt_files = list(input_path.glob("*.txt"))
    
    if not txt_files:
        print(f"No .txt files found in {input_dir}")
        return

    print(f"Found {len(txt_files)} transcript files. Processing...")
    
    rows = []
    for txt_file in txt_files:
        title, vid_id = parse_filename(txt_file)
        content = txt_file.read_text(encoding="utf-8").strip()
        
        rows.append({
            "title": title,
            "video_id": vid_id,
            "transcript": content,
            "filename": txt_file.name
        })
    
    # write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ["title", "video_id", "transcript", "filename"]
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        
        writer.writeheader()
        writer.writerows(rows)
        
    print(f"Successfully wrote {len(rows)} rows to {output_file}")

def main():
    parser = argparse.ArgumentParser(description="Convert transcript text files to CSV")
    parser.add_argument("--input", "-i", default="transcripts_dl", help="Input directory containing .txt files")
    parser.add_argument("--out", "-o", default="transcripts/mock_video_transcript.csv", help="Output CSV file path")
    
    args = parser.parse_args()
    
    to_csv(args.input, args.out)

if __name__ == "__main__":
    main()
