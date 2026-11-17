"""Landmark augmentation (P1-18): operates on lm-v1 rows and returns valid lm-v1 rows.

Operations per selected row, drawn from one seeded stream (independent of `p`):
  mirror (x := -x) with probability p_mirror -> rotate about the wrist by +/- `rotation` degrees
  -> per-axis aspect change -> Gaussian jitter on non-wrist points -> re-normalise (lm-v1).
Ranges are starting hypotheses, compared on validation in P1-19. `p_mirror` defaults to 0: whether
mirroring helps is an experiment, not an assumption (see landmarks/orientation.py).
"""

import numpy as np

from signlingo_ml.config import SEED
from signlingo_ml.landmarks.normalize import N_LANDMARKS, normalize_batch


def augment_landmarks(
    X: np.ndarray,
    seed: int = SEED,
    p: float = 0.7,
    p_mirror: float = 0.0,
    rotation: float = 15.0,
    jitter: float = 0.01,
    aspect: tuple[float, float] = (0.9, 1.1),
) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = len(X)
    P = np.asarray(X, dtype=np.float64).reshape(n, N_LANDMARKS, 2)
    take = rng.random(n) < p
    mirror = rng.random(n) < p_mirror
    ang = np.deg2rad(rng.uniform(-rotation, rotation, n))
    sx, sy = rng.uniform(*aspect, n), rng.uniform(*aspect, n)
    noise = rng.normal(0.0, jitter, size=(n, N_LANDMARKS, 2)) if jitter else np.zeros_like(P)
    noise[:, 0] = 0.0  # the wrist is the origin and never moves

    Q = P.copy()
    Q[mirror, :, 0] *= -1.0
    c, s = np.cos(ang)[:, None], np.sin(ang)[:, None]
    x, y = Q[:, :, 0].copy(), Q[:, :, 1].copy()
    Q[:, :, 0], Q[:, :, 1] = c * x - s * y, s * x + c * y
    Q[:, :, 0] *= sx[:, None]
    Q[:, :, 1] *= sy[:, None]
    Q += noise

    out, ok = normalize_batch(Q)
    keep_original = ~take | ~ok  # not selected, or degenerate after augmentation
    out[keep_original] = np.asarray(X, dtype=np.float32)[keep_original]
    return out
