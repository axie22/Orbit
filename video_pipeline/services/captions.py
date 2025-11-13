from pathlib import Path
import re
import logging
from typing import List, Dict, Optional

# In local, can read from local work dir
BASE = Path("work")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

VTT_NAMES = ["captions.norm.en.vtt",
             "source.en.vtt", 
             "source.en-orig.vtt"] # there are some that have none of these
IGNORE_PREFIXES = ('NOTE', 'STYLE', 'WEBVTT')

# Regex pattern for to process the .vtt files
TS = re.compile(r'(?P<s>\d+:\d{2}:\d{2}\.\d{3})\s*-->\s*(?P<e>\d+:\d{2}:\d{2}\.\d{3})')

def load_transcript(video_id: str) -> Path | None:
    """
    Takes a video id as input and looks for the transcript file. Returns the file if present otherwise returns None
    Prioritizes the normalized captions first, then goes to other candidates
    
    Args:
        video_id::str
            The video id to process in the directory
    
    Returns:
        path::Path
            Path to the transcript file or None
    """
    vdir = BASE / video_id
    for name in VTT_NAMES:
        path = vdir / name
        if path.exists():
            return path
    logger.warning("Did not find any transcript for %s", vdir)
    return None

def to_seconds(hms: str) -> float:
    """
    Converts hours, min, seconds to seconds

    Args:
        hms::str
            string of hours:mins:seconds
    
    Returns
        duration::int
            Duration in seconds calculated from hms
    """
    h, m, s = hms.split(':')
    return int(h) * 3600 + int(m) * 60 + float(s)

def parse_vtt(
        path: Path,
        *,
        start_offset_sec: float = 0.0,
        max_end_sec: Optional[float] = None
) -> List[Dict]:
    """
    Parses the vtt file to create a dictionary of the utterances

    Args:
        path::Path
            Path to the .vtt file to parse
        start_offset_sec::float
            Indicates what time to start parsing from, defaults to 0
            e.g., 300.0 to skip first 5 minutes
        max_end_sec::float
            indicates what second to end at max or None
            e.g., dur_sec - 60 to skip last minute
    
    Returns:
        utts::List
            A list of dictionaries containing utterance info
    """
    utts = []
    idx = 0
    with path.open(encoding="utf-8") as f:
        buf = []
        s = e = None
        for raw in f:
            line = raw.rstrip('\n')
            m = TS.search(line)
            if m:
                # flush previous cue
                if buf and s is not None and e is not None:
                    if not (e <= start_offset_sec or (max_end_sec is not None and s >= max_end_sec)): # apply windowing
                        text = " ".join(buf).strip()
                        if text:
                            idx += 1
                            utts.append({"id": f"utt_{idx:06d}", "text": text, "start": s, "end": e})
                # start a new cue
                buf = []
                s = to_seconds(m.group("s"))
                e = to_seconds(m.group("e"))
            else:
                if line and not line.startswith(IGNORE_PREFIXES):
                    buf.append(line)

        if buf and s is not None and e is not None:
            if not (e <= start_offset_sec or (max_end_sec is not None and s >= max_end_sec)):
                text = " ".join(buf).strip()
                if text:
                    idx += 1
                    utts.append({"id": f"utt_{idx:06d}", "text": text, "start": s, "end": e})
    return utts
