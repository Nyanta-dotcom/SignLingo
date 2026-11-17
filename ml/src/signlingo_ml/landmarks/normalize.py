"""Landmark normalisation `lm-v1` (P1-15): must match how keypoint.csv was normalised.

Verified on all 33,536 usable rows of the real file: the wrist (landmark 0) is at (0, 0) and the
largest |coordinate| (over x and y) of every row is exactly 1. So the scale is the L-infinity
norm, NOT the largest Euclidean point norm.

Steps (the TypeScript implementation must repeat them exactly):
  1. translate so the wrist is the origin;
  2. divide every coordinate by max(|x_i|, |y_i|) over all landmarks;
  3. flatten as x0, y0, x1, y1, ... x20, y20 (42 numbers).

Only x and y are used; z (if given) is ignored. No mirroring is part of lm-v1: the file does not
say which hand a row shows, so mirroring is an experiment (P1-19), not a preprocessing step.
"""

import numpy as np

PREPROCESS_VERSION = "lm-v1"
N_LANDMARKS = 21
_EPS = 1e-12


def normalize_batch(points: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Normalise (N, 21, 2|3) landmarks -> ((N, 42) float32, valid mask (N,)).

    Rows whose points all coincide with the wrist cannot be scaled; they are marked invalid and
    their output row is all zeros.
    """
    p = np.asarray(points, dtype=np.float64)
    if p.ndim != 3 or p.shape[1] != N_LANDMARKS or p.shape[2] not in (2, 3):
        raise ValueError(f"expected (N, {N_LANDMARKS}, 2 or 3), got {p.shape}")
    xy = p[:, :, :2] - p[:, :1, :2]
    scale = np.abs(xy).reshape(len(xy), -1).max(axis=1)
    ok = scale > _EPS
    out = np.zeros((len(xy), N_LANDMARKS * 2), dtype=np.float64)
    out[ok] = (xy[ok] / scale[ok, None, None]).reshape(-1, N_LANDMARKS * 2)
    return out.astype(np.float32), ok


def normalize_lm_v1(landmarks: np.ndarray) -> np.ndarray | None:
    """Normalise one hand, (21, 2) or (21, 3) -> float32 (42,), or None if degenerate."""
    p = np.asarray(landmarks, dtype=np.float64)
    if p.ndim != 2 or p.shape[0] != N_LANDMARKS or p.shape[1] not in (2, 3):
        raise ValueError(f"expected ({N_LANDMARKS}, 2 or 3), got {p.shape}")
    out, ok = normalize_batch(p[None])
    return out[0] if ok[0] else None
