"""Loader for keypoint.csv (ASL landmark dataset, MIT, AkramOM606/American-Sign-Language-Detection).

File format (verified on the real file): no header, space-padded fields,
label + 42 numbers = 21 landmarks (x, y), wrist at (0, 0), scaled so max |value| = 1.
Labels 0..25 = A..Z; J (9) and Z (25) need motion and are dropped (-> 24 static classes).
"""

from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np

from signlingo_ml.config import KAGGLE_TO_INDEX

N_FEATURES = 42


@dataclass
class LoadReport:
    n_lines: int = 0
    n_bad_lines: int = 0
    bad_line_numbers: list[int] = field(default_factory=list)
    n_dropped_dynamic: int = 0
    n_rows: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


def load_keypoint_csv(path: str | Path) -> tuple[np.ndarray, np.ndarray, LoadReport]:
    """Return (X (N, 42) float32, y (N,) in 0..23, report). Malformed lines are skipped."""
    rep = LoadReport()
    feats, labels = [], []
    with open(path, encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            if not line.strip():
                continue
            rep.n_lines += 1
            parts = [p.strip() for p in line.split(",")]
            if len(parts) != N_FEATURES + 1:
                rep.n_bad_lines += 1
                rep.bad_line_numbers.append(i)
                continue
            label = int(float(parts[0]))
            if label not in KAGGLE_TO_INDEX:
                rep.n_dropped_dynamic += 1
                continue
            labels.append(KAGGLE_TO_INDEX[label])
            feats.append([float(v) for v in parts[1:]])
    rep.n_rows = len(labels)
    return np.asarray(feats, dtype=np.float32), np.asarray(labels, dtype=np.int64), rep


def order_split(y: np.ndarray, val_frac: float = 0.2) -> np.ndarray:
    """Hold out the LAST `val_frac` of each class in file order (assumed collection order).

    The file has no session or signer column, and rows of one class form long contiguous
    blocks, so a random split leaks near-identical neighbouring frames.
    Assumption (unverified): file order reflects collection order. Even so, the held-out part
    probably comes from the same signer, so this is NOT a signer-holdout (see FT-ML-07).
    """
    split = np.full(len(y), "train", dtype=object)
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        n_val = round(val_frac * len(idx))
        if n_val:
            split[idx[-n_val:]] = "val"
    return split.astype(str)
