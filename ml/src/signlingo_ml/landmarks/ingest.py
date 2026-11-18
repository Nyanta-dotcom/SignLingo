"""Read webcam landmark captures (`landmark_capture.schema.json`) from `ml/data/raw/webcam/`.

Files come from the /collect page or ml/tools/capture.py, one per signer session. Each frame is
normalised with `lm-v1` exactly like keypoint.csv; frames that cannot be scaled are dropped and
counted. Rows keep their `signer_id` so a leave-one-signer-out evaluation is possible (P1-21).
"""

import json
from pathlib import Path

import jsonschema
import numpy as np

from signlingo_ml.config import LABELS, ROOT
from signlingo_ml.landmarks.normalize import normalize_batch

SCHEMA_PATH = ROOT.parent / "shared" / "contracts" / "schemas" / "landmark_capture.schema.json"
WEBCAM_DIR = ROOT / "data" / "raw" / "webcam"


def load_webcam_dir(directory: str | Path = WEBCAM_DIR):
    """Return (X (N, 42) float32 lm-v1, y (N,) class index, signer (N,) str, report dict)."""
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    frames, labels, signers, n_degenerate = [], [], [], 0
    for path in sorted(Path(directory).glob("*.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        try:
            jsonschema.validate(doc, schema)
        except jsonschema.ValidationError as e:
            raise ValueError(
                f"{path.name} does not match landmark_capture schema: {e.message}"
            ) from e
        for sample in doc["samples"]:
            label = LABELS.index(sample["sign_code"].removeprefix("LETTER_"))
            pts = np.array([[p[:2] for p in f] for f in sample["frames"]], dtype=np.float64)
            X, ok = normalize_batch(pts)
            n_degenerate += int((~ok).sum())
            frames.append(X[ok])
            labels += [label] * int(ok.sum())
            signers += [doc["signer_id"]] * int(ok.sum())
    X = np.concatenate(frames) if frames else np.zeros((0, 42), dtype=np.float32)
    rep = {"n_rows": len(labels), "n_degenerate": n_degenerate, "signers": sorted(set(signers))}
    return X, np.asarray(labels, dtype=np.int64), np.asarray(signers, dtype=str), rep
