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


def order_split3(
    y: np.ndarray, val_frac: float = 0.2, test_frac: float = 0.2, gap_frac: float = 0.02
) -> np.ndarray:
    """Per class, in file order: train | gap | val | gap | test (labels 'train'/'val'/'test'/'gap').

    keypoint.csv has no official test set, no session and no signer column. Rows of one class are
    long contiguous bursts of near-identical frames, so the segments are separated by a gap that
    is dropped, to avoid directly adjacent frames on both sides of a boundary. A gap of 2% of a
    class does not remove all similarity between neighbours; this is NOT a signer holdout and
    results are optimistic until webcam data from several people exists (P1-21).
    """
    split = np.full(len(y), "train", dtype=object)
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        n = len(idx)
        n_val, n_test, gap = round(val_frac * n), round(test_frac * n), round(gap_frac * n)
        test_start = n - n_test
        val_end = test_start - gap
        val_start = val_end - n_val
        train_end = val_start - gap
        if gap:
            split[idx[train_end:val_start]] = "gap"
            split[idx[val_end:test_start]] = "gap"
        split[idx[val_start:val_end]] = "val"
        split[idx[test_start:]] = "test"
    return split.astype(str)
