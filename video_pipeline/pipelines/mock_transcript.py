
import argparse
import subprocess
import re
from pathlib import Path
import sys

def get_video_id(url_or_id):
    """
    Extracts video ID from a YouTube URL or returns the ID if it looks like one.
    """
    # simple regex for video ID (11 chars)
    # improved regex to catch v=... or just the id
    if len(url_or_id) == 11 and "youtube.com" not in url_or_id:
        return url_or_id
    
    match = re.search(r'(?:v=|\/)([0-9A-Za-z_-]{11}).*', url_or_id)
    if match:
        return match.group(1)
    return url_or_id # fallback, let yt-dlp handle if it fails

def clean_vtt(vtt_content):
    """
    Simple VTT cleaner to get plain text.
    Removes timestamps, header, and duplicate lines.
    """
    lines = vtt_content.splitlines()
    text_lines = []
    seen = set()
    
    for line in lines:
        line = line.strip()
        # skip header, timestamps, empty lines
        if not line: continue
        if line.startswith("WEBVTT"): continue
        if "-->" in line: continue
        if line.startswith("NOTE"): continue
        
        # remove unwanted tags 
        line = re.sub(r'<[^>]+>', '', line)
        
        # avoid immediate duplicates (common in auto-captions)
        if line in seen:
            continue
        
        # avoid repeats
        if text_lines and text_lines[-1] == line:
            continue
            
        text_lines.append(line)
        
    return " ".join(text_lines)

def download_transcript(url, output_dir):
    """
    Downloads subtitles using yt-dlp and converts to text.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Fetching info for: {url}")
    
    # 1. download subs
    # --skip-download: don't download video
    # --write-subs: write subtitle file
    # --write-auto-subs: write auto-generated subs if no manual ones
    # --sub-lang en.*: prefer English
    cmd = [

        "yt-dlp",
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-lang", "en.*",
        "--output", str(output_dir / "%(title)s [%(id)s].%(ext)s"),
        "--retries", "10",
        "--sleep-requests", "2",
        "--extractor-args", "youtube:player_client=web_creator,android", 
        url
    ]
    
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running yt-dlp: {e}")
        print("Moving on to check if any transcript was downloaded...")

    vtt_files = list(output_dir.glob("*.vtt"))
    if not vtt_files:
        print("No transcript downloaded (maybe no captions available?).")
        return

    print(f"Found {len(vtt_files)} subtitle files. Selecting best candidates...")

    video_map = {}

    for vtt_file in vtt_files:
        match = re.search(r'\[([a-zA-Z0-9_-]{11})\]', vtt_file.name)
        if not match:
            continue
            
        vid_id = match.group(1)
        stem = vtt_file.stem
        
        # priority: 
        # 1. .en (most standard)
        # 2. .en-US or others
        # 3. .en-orig
        
        priority = 0
        if stem.endswith(".en"):
            priority = 10
        elif ".en-" in stem and not stem.endswith("orig"):
            priority = 5
        elif stem.endswith("orig"):
            priority = 1
            
        if vid_id not in video_map:
            video_map[vid_id] = (priority, vtt_file)
        else:
            if priority > video_map[vid_id][0]:
                video_map[vid_id] = (priority, vtt_file)

    for vid_id, (_, vtt_file) in video_map.items():
        content = vtt_file.read_text(encoding="utf-8")
        clean_text = clean_vtt(content)
        
        original_stem = vtt_file.stem
        id_end_idx = original_stem.find(f"[{vid_id}]") + len(f"[{vid_id}]")
        clean_stem = original_stem[:id_end_idx]
        
        txt_file = vtt_file.with_name(f"{clean_stem}.txt")
        
        txt_file.write_text(clean_text, encoding="utf-8")
        print(f"Saved: {txt_file}")
        
def main():
    parser = argparse.ArgumentParser(description="Simple mock interview transcript downloader")
    parser.add_argument("url", help="YouTube video URL or ID")
    parser.add_argument("--out", "-o", default="transcripts_dl", help="Output directory")
    
    args = parser.parse_args()
    
    download_transcript(args.url, args.out)

if __name__ == "__main__":
    main()
