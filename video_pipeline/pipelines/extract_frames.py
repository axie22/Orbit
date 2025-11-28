"""
extract_frames.py

Local frame extraction for code segments.

1. Reads segment windows from DynamoDB ("segments#v0" items).
2. Ensures a local video file exists in work/<video_id>/video.mp4
  (downloads via yt-dlp if missing).
- Uses ffmpeg to grab frames within each [t0, t1] window.
- Save frame: work/<video_id>/frames/<segment_id>/frame_0001.jpg

Usage (DEV / single video):

    pipenv run python -m video_pipeline.pipelines.extract_frames \
        --video-id <VIDEO_ID> \
        --fps 0.5 \
        --max-segments 3 # optional for local dev, default is 3 segments

TO BE IMPLEMENTED, when we want to scale this up to many videos, we can add a
"scan_add_segment" mode.
"""

import argparse
import subprocess
from pathlib import Path
from typing import Optional

from video_pipeline.services.ddb import read_segments

WORK = Path("work")


def run(cmd: str) -> None:
    """Utility to run a shell command and echo it."""
    print(f"\n$ {cmd}")
    subprocess.check_call(cmd, shell=True)


def ensure_video_downloaded(video_id: str) -> Path:
    """
    Make sure we have a local video file for this video_id.

    For now we:
      - store it as work/<video_id>/video.mp4
      - download from YouTube via yt-dlp if it's missing.

    NOTE: Currently local-only. We are NOT uploading the raw video to S3.
    """
    vdir = WORK / video_id
    vdir.mkdir(parents=True, exist_ok=True)

    video_path = vdir / "video.mp4"
    if video_path.exists():
        print(f"[{video_id}] using existing {video_path}")
        return video_path

    url = f"https://www.youtube.com/watch?v={video_id}"
    # Simple, robust mp4 download – no need for super fancy formats for frame extraction
    cmd = (
        'yt-dlp '
        '-f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best" '
        f'-o "{video_path}" "{url}"'
    )
    run(cmd)

    if not video_path.exists():
        raise RuntimeError(f"Expected {video_path} to exist after download")

    print(f"[{video_id}] downloaded video to {video_path}")
    return video_path


def extract_frames_for_segment(
    video_path: Path,
    out_dir: Path,
    t0: float,
    t1: float,
    fps: float,
) -> None:
    """
    Use ffmpeg to extract frames from [t0, t1] at the given FPS.
    Frames go to: out_dir/frame_0001.jpg, frame_0002.jpg, ...
    """
    out_dir.mkdir(parents=True, exist_ok=True)

    duration = max(0.0, t1 - t0)
    if duration <= 0.0:
        print(f" ! --- Skipping segment with non-positive duration t0={t0}, t1={t1}")
        return

    # Example:
    # ffmpeg -hide_banner -loglevel error -ss 120.0 -i video.mp4 -t 15.0 -vf "fps=0.5" frames/frame_%04d.jpg
    cmd = (
        f'ffmpeg -hide_banner -loglevel error '
        f'-ss {t0:.3f} -i "{video_path}" -t {duration:.3f} '
        f'-vf "fps={fps}" '
        f'"{out_dir}/frame_%04d.jpg"'
    )
    run(cmd)


def process_video(video_id: str, fps: float, max_segments: Optional[int] = None,) -> None:
    """
    Main per-video flow:
      1) Read segments from DynamoDB.
      2) Download (or reuse) video.mp4 under work/<video_id>/.
      3) For each segment (optionally limited), extract frames.
    """
    seg_item = read_segments(video_id)
    if not seg_item:
        print(f"[{video_id}] no 'segments#v0' item found in DynamoDB; skipping")
        return

    segs = seg_item.get("segments") or []
    if not segs:
        print(f"[{video_id}] segments item exists but has empty 'segments' list; skipping")
        return

    print(f"[{video_id}] found {len(segs)} segments in DynamoDB")

    if max_segments is not None:
        segs = segs[-max_segments:]   # take the LAST N segments
        print(f"[{video_id}] limiting to last {len(segs)} segments for local test")

    video_path = ensure_video_downloaded(video_id)

    for seg in segs:
        seg_id = seg.get("id") or f"{seg['t0']:.0f}_{seg['t1']:.0f}"
        t0 = float(seg["t0"])
        t1 = float(seg["t1"])
        out_dir = WORK / video_id / "frames" / seg_id

        print(f"  - Segment {seg_id}: [{t0:.3f}, {t1:.3f}] -> {out_dir}")
        extract_frames_for_segment(video_path, out_dir, t0, t1, fps=fps)

    print(f"[{video_id}] done extracting frames")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--video-id",
        required=True,
        help="YouTube video ID to process (must already have segments in DynamoDB)",
    )
    ap.add_argument(
        "--fps",
        type=float,
        default=0.5,
        help="Frames per second to extract within each segment (default: 0.5 = 1 frame every 2s)",
    )
    ap.add_argument(
        "--max-segments",
        type=int,
        default=3,
        help="Max number of segments to process (for local dev). "
             "Set to a higher number or remove this flag to process more later.",
    )
    args = ap.parse_args()

    process_video(args.video_id, fps=args.fps, max_segments=args.max_segments)


if __name__ == "__main__":
    main()
