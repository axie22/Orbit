# Information on Cloud Databases

## S3 Bucket Layout

```bash
s3://{S3_BUCKET}/yt/{video_id}/
  raw/
    metadata.json
    ffprobe.json
    captions.en.vtt?          # if present
    provenance.json
  derived/
    audio.wav
    captions.norm.en.vtt
  hashes.json

```

## DynamoDB Proposed Item Schema

``` bash
    {
    "videoid": f"video#{video_id}",                                # PK
    "version": "meta#v0",                                          # SK
    "title": "Sqrt(x) - Leetcode 69 - Python",
    "url": "https://www.youtube.com/watch?v=zdMhGxRWutQ",
    "channel_id": "UC...",
    "channel_title": "NeetCode",
    "dur_sec": 832,
    "status": "audio_ingested",
    "processing_version": "v0.3.0",
    "ingested_at": "2025-11-10T16:08:03Z",
    "has_captions": true,
    "assets": {
        "audio_wav": "s3://bucket/yt/zdMhGxRWutQ/derived/audio.wav",
        "captions_norm_vtt": "s3://bucket/yt/zdMhGxRWutQ/derived/captions.norm.en.vtt",
        "metadata_json": "s3://bucket/yt/zdMhGxRWutQ/raw/metadata.json",
        "ffprobe_json": "s3://bucket/yt/zdMhGxRWutQ/raw/ffprobe.json"
    },
    "hashes": {
        "audio_wav_sha256": "…",
        "captions_norm_vtt_sha256": "…",
        "content_sha": "…"
    }
    }
```
