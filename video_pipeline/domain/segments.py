"""
Segments Functionality:

We're trying to detect when code is being shown on screen by using keywords and symbols
We score segments based on the density of these 
"""

import re
from typing import List, Dict

CODE_KEYWORDS = re.compile(r'\b(def|class|return|for|while|if|else|elif|try|except|lambda|import|from|with|yield|static|public|void|int|long|bool|queue|stack|heap|graph|dp)\b', re.I)
SYMBOLS = set('()[]{}:=;,.<>_+-/*|&%!`')

def score_code_likelihood(text: str) -> float:
    t = text or ""
    kw = len(CODE_KEYWORDS.findall(t))
    sym_ratio = sum(ch in SYMBOLS for ch in t) / max(1, len(t))
    # light heuristic: keywords weigh more than symbols
    score = min(1.0, 0.2 * kw + 0.8 * sym_ratio)

    # can implement nudge down for pure narration phrases
    # if "blah blah" in t: score *=0.5

    return score

def plan_segments(utts: List[Dict], video_duration: float,
                  thresh=0.55, min_len_sec=3.0, merge_gap_sec=3.0, pad_sec=4.0) -> List[Dict]:
    hits = []
    for u in utts:
        s = score_code_likelihood(u["text"])
        if s >= thresh:
            hits.append({"t0": u["start"], "t1": u["end"], "score": s})

    # merge by gap
    merged = []
    for h in sorted(hits, key=lambda x: x["t0"]):
        if not merged:
            merged.append(dict(h))
            continue
        last = merged[-1]
        if h["t0"] <= last["t1"] + merge_gap_sec:
            last["t1"] = max(last["t1"], h["t1"])
            last["score"] = max(last["score"], h["score"])
        else:
            merged.append(dict(h))

    # pad and filter by min length
    out = []
    for i, seg in enumerate(merged, 1):
        t0 = max(0.0, seg["t0"] - pad_sec)
        t1 = seg["t1"] + pad_sec
        if video_duration:
            t1 = min(video_duration, t1)
        if (t1 - t0) >= min_len_sec:
            out.append({
                "id": f"seg_{i:04d}",
                "t0": round(t0, 3),
                "t1": round(t1, 3),
                "score": round(seg["score"], 3),
                "reason": "heuristic_v1"
            })
    return out
