import os, time, json
from decimal import Decimal
import boto3

_TABLE = os.environ.get("DDB_TABLE", "interviewai-videos")
ddb = boto3.resource("dynamodb").Table(_TABLE)

def read_meta(video_id: str):
    resp = ddb.get_item(Key={"videoid": f"video#{video_id}", "version": "meta#v0"})
    return resp.get("Item")

def write_segments_item(video_id: str, segments, scorer_version: str, pad_sec: float, notes: dict | None = None):
    item = {
        "videoid": f"video#{video_id}",
        "version": "segments#v0",
        "video_id": video_id,
        "planned_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "scorer_version": scorer_version,
        "pad_sec": pad_sec,
        "segments": segments,
    }
    item = json.loads(json.dumps(item), parse_float=Decimal)
    if notes:
        item["notes"] = notes
    ddb.put_item(Item=item)

def read_segments(video_id: str):
    resp = ddb.get_item(
        Key={"videoid": f"video#{video_id}", "version": "segments#v0"}
    )
    return resp.get("Item")
