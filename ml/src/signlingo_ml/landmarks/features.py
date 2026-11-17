"""Engineered landmark features (P1-19b): distances, finger angles and finger crossing terms.

Why: the raw 2D coordinates make the 24 letters hard to separate where shapes differ in how
fingers cross or fold (U vs R, M vs N, F vs B). These features describe the hand shape
independently of rotation and of the global scale (everything is divided by the hand size).

Input rows must be lm-v1 rows (N, 42). Hands are first mirrored to a canonical orientation
(orientation.canonicalize), so every kind is mirror-invariant and the signed crossing terms keep
a consistent meaning.

Kinds: "xy" (42), "dist" (210 pairwise distances / hand size), "dist_ang" (210 + 31),
"xy_dist_ang" (42 + 210 + 31). The 31 angle features are: 15 flexion cosines (cosine of the angle
at each finger joint), then for 8 finger pairs (cosine, sine) of the angle between the
wrist->landmark vectors; the sine is the signed crossing term.
"""

import numpy as np

from signlingo_ml.landmarks.orientation import canonicalize

FEATURE_KINDS = ("xy", "dist", "dist_ang", "xy_dist_ang")
_EPS = 1e-9
_PAIRS = np.triu_indices(21, 1)  # 210 landmark pairs
# joint triplets (a, b, c): angle at b; 3 joints per finger, thumb first
_FLEX = [
    (0, 1, 2), (1, 2, 3), (2, 3, 4),
    (0, 5, 6), (5, 6, 7), (6, 7, 8),
    (0, 9, 10), (9, 10, 11), (10, 11, 12),
    (0, 13, 14), (13, 14, 15), (14, 15, 16),
    (0, 17, 18), (17, 18, 19), (18, 19, 20),
]  # fmt: skip
# wrist->landmark vector pairs: neighbouring finger bases, then neighbouring fingertips
_SPREAD = [(1, 5), (5, 9), (9, 13), (13, 17), (4, 8), (8, 12), (12, 16), (16, 20)]


def _distances(P: np.ndarray) -> np.ndarray:
    d = np.linalg.norm(P[:, _PAIRS[0]] - P[:, _PAIRS[1]], axis=2)
    return d / (d.max(axis=1, keepdims=True) + _EPS)


def _angles(P: np.ndarray) -> np.ndarray:
    out = []
    for a, b, c in _FLEX:
        u, v = P[:, a] - P[:, b], P[:, c] - P[:, b]
        out.append((u * v).sum(1) / (np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1) + _EPS))
    for a, b in _SPREAD:
        u, v = P[:, a], P[:, b]
        n = np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1) + _EPS
        out.append((u * v).sum(1) / n)
        out.append((u[:, 0] * v[:, 1] - u[:, 1] * v[:, 0]) / n)
    return np.stack(out, axis=1)


def build_features(X: np.ndarray, kind: str) -> np.ndarray:
    """(N, 42) lm-v1 rows -> (N, F) float32 features of the given kind."""
    if kind not in FEATURE_KINDS:
        raise ValueError(f"unknown feature kind {kind!r}; choose from {FEATURE_KINDS}")
    Xc = canonicalize(X)
    P = Xc.astype(np.float64).reshape(-1, 21, 2)
    parts = []
    if kind.startswith("xy"):
        parts.append(Xc.astype(np.float64))
    if "dist" in kind:
        parts.append(_distances(P))
    if kind.endswith("ang"):
        parts.append(_angles(P))
    return np.concatenate(parts, axis=1).astype(np.float32)
