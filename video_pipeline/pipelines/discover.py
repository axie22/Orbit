import os
import csv
import logging
from pathlib import Path
import yaml
from googleapiclient.discovery import build
from dotenv import load_dotenv
from video_pipeline.utils.file_utils import to_abs_path

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv()

CONFIG_ENV   = os.getenv("CONFIG_PATH")
MANIFEST_ENV = os.getenv("MANIFEST_PATH")
LOG_ENV      = os.getenv("LOG_PATH")

CONFIG_PATH   = to_abs_path(CONFIG_ENV, BASE_DIR)
MANIFEST_PATH = to_abs_path(MANIFEST_ENV, BASE_DIR)
LOG_PATH      = to_abs_path(LOG_ENV, BASE_DIR)

print("Resolved paths:")
print(CONFIG_PATH)
print(MANIFEST_PATH)
print(LOG_PATH)

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s"
)
log = logging.getLogger(__name__)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
if not YOUTUBE_API_KEY:
    raise ValueError("Missing YOUTUBE_API_KEY in environment!")

yt = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)

# load channel config
with open(CONFIG_PATH, "r") as f:
    cfg = yaml.safe_load(f)

channels = cfg.get("sources", [])
min_dur = cfg["limits"]["min_duration_sec"]
max_dur = cfg["limits"]["max_duration_sec"]

# get videos
def get_videos_from_playlist(playlist_id):
    videos = []
    next_page = None

    while True:
        request = yt.playlistItems().list(
            part="snippet,contentDetails",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page
        )
        response = request.execute()

        for item in response["items"]:
            video_id = item["contentDetails"]["videoId"]
            title = item["snippet"]["title"]
            videos.append({"video_id": video_id, "title": title})
        next_page = response.get("nextPageToken")
        if not next_page:
            break

    return videos

# write to manifest.csv 
def write_manifest(entries):
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["video_id", "title"])
        writer.writeheader()
        writer.writerows(entries)

    log.info(f"Wrote manifest with {len(entries)} videos")


def main():
    all_videos = []

    for src in channels:
        if src["type"] == "playlist":
            vids = get_videos_from_playlist(src["id"])
            all_videos.extend(vids)

    write_manifest(all_videos)
    print(f"Saved {len(all_videos)} videos to manifest.csv")

if __name__ == "__main__":
    main()
