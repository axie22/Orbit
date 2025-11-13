"""
Plan Segments Functionality: 
- Load transcript (VTT) if present; otherwise fall back to a coarse ASR later (for now, mark needs_alignment).
- Convert captions → utterances: {utterance_id, text, start, end}.
- Score each utterance for “code-talk”.
- Smooth + merge contiguous hits into segments.Pad segment boundaries and clamp to duration.
- Write a single DDB item SK="segments#v0" and (optionally) derived/segments.json in S3.

pipenv run python -m video_pipeline.pipelines.plan_segments --video-id <ID>
pipenv run python -m video_pipeline.pipelines.plan_segments --parse_all

"""

import argparse, os
from pathlib import Path

from video_pipeline.services.captions import load_transcript, parse_vtt
from video_pipeline.services.ddb import write_segments_item, read_meta
from video_pipeline.domain.segments import plan_segments

BASE = Path('work')


def process_video(vid: str):
    """
    Each element inserted into "segments" represents a time window in the YouTube video where the model or 
    heuristic believes the code editor/problem-solving portion occurs, the part of the video that's worth analyzing further
    """
    meta = read_meta(vid) or {}
    dur = float(meta.get("dur_sec", 0.0))

    vtt = load_transcript(vid)  # Path or None
    print(f"[{vid}] VTT? {vtt}")
    if not vtt:
        # record empty segments with a flag; downstream can trigger whisperx backfill
        write_segments_item(
            vid, [], scorer_version="v1", pad_sec=4.0,
            notes={"needs_alignment": True, "reason": "no_vtt_found"}
        )
        return

    utts = parse_vtt(vtt, start_offset_sec=300.0)  # skip first 5 minutes
    segs = plan_segments(
        utts, video_duration=dur,
        thresh=0.55, min_len_sec=3.0, merge_gap_sec=3.0, pad_sec=4.0
    )

    write_segments_item(vid, segs, scorer_version="v1", pad_sec=4.0)
    # print(f"[{vid}] wrote {len(segs)} segments")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video-id", required=False)
    ap.add_argument('--parse_all', required=False, action="store_true")
    args = ap.parse_args()

    if args.parse_all:
        for p in BASE.iterdir():
            if not p.is_dir():
                continue
            has_any_vtt = any("en" in v.name.lower() and v.suffix == ".vtt" for v in p.glob("*.vtt"))
            if not has_any_vtt:
                continue
            process_video(p.name)
    
    if args.video_id:
        process_video(args.video_id)

if __name__ == "__main__":
    main()