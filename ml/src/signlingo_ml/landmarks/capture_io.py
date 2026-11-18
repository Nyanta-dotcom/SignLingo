"""Build and write `landmark_capture` files (used by ml/tools/capture.py; same format as /collect).

Only coordinates are stored: never images or video.
"""

import json
import re
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from signlingo_ml.config import LABELS

SIGNER_RE = re.compile(r"^S[0-9]{2,}$")


def sample_from_frames(letter: str, frames, handedness: str) -> dict:
    if letter not in LABELS:
        raise ValueError(f"{letter!r} is not one of the 24 static letters {''.join(LABELS)}")
    if len(frames) == 0:
        raise ValueError("a sample needs at least one frame")
    return {
        "sign_code": f"LETTER_{letter}",
        "handedness": handedness,
        "captured_at": datetime.now(UTC).isoformat(),
        "frames": [np.asarray(f, dtype=float).round(5).tolist() for f in frames],
    }


def build_document(signer_id: str, session_id: str, samples: list[dict], device: dict) -> dict:
    if not SIGNER_RE.match(signer_id):
        raise ValueError(f"signer_id must be an anonymous code like S01, got {signer_id!r}")
    return {
        "schema_version": 1, "preprocess_version": "raw", "signer_id": signer_id,
        "capture_session_id": session_id, "device": device, "samples": samples,
    }  # fmt: skip


def write_document(doc: dict, directory) -> Path:
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"landmarks_{doc['signer_id']}_{int(time.time())}.json"
    path.write_text(json.dumps(doc), encoding="utf-8")
    return path
