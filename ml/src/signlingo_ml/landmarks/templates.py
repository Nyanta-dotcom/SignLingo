"""Per-letter finger-angle templates and confusable-letter lists (P1-20, FT-LRN-04).

The web app compares the learner's 15 joint angles with the per-letter template (mean and std
measured on training rows) to point at fingers that deviate, and uses the confusable lists
(from a confusion matrix) for hints like "this looks like S". Angles are in degrees, at each
finger joint, thumb first; they do not depend on rotation, scale or mirroring.
"""

import numpy as np

from signlingo_ml.landmarks.features import _FLEX

_FINGERS = ["thumb", "index", "middle", "ring", "pinky"]
_JOINTS = ["mcp", "pip", "dip"]
# names of the 15 angles, aligned with _FLEX; thumb joints are cmc, mcp, ip
FINGER_JOINTS = [
    f"{f}_{j}" for f in _FINGERS for j in (["cmc", "mcp", "ip"] if f == "thumb" else _JOINTS)
]


def finger_angles_deg(X: np.ndarray) -> np.ndarray:
    """(N, 42) lm-v1 rows -> (N, 15) joint angles in degrees (180 = straight)."""
    P = np.asarray(X, dtype=np.float64).reshape(-1, 21, 2)
    out = []
    for a, b, c in _FLEX:
        u, v = P[:, a] - P[:, b], P[:, c] - P[:, b]
        n = np.linalg.norm(u, axis=1) * np.linalg.norm(v, axis=1) + 1e-12
        out.append(np.degrees(np.arccos(np.clip((u * v).sum(1) / n, -1.0, 1.0))))
    return np.stack(out, axis=1)


def class_templates(X: np.ndarray, y: np.ndarray, labels: list[str]) -> dict:
    """Mean and standard deviation of the 15 joint angles for every letter."""
    ang = finger_angles_deg(X)
    templates = {}
    for i, label in enumerate(labels):
        rows = ang[np.asarray(y) == i]
        if len(rows) == 0:
            continue
        templates[label] = {
            "finger_angles": [round(float(v), 3) for v in rows.mean(axis=0)],
            "finger_angles_std": [round(float(v), 3) for v in rows.std(axis=0)],
            "n": len(rows),
        }
    return templates


def confusable_from_matrix(
    cm: np.ndarray, labels: list[str], min_rate: float = 0.05, top: int = 3
) -> dict:
    """For each true letter, the letters it is predicted as at least `min_rate` of the time.

    `cm` is a row-normalised confusion matrix (rows = true). Letters with no such confusion are
    omitted; each list is ordered by decreasing rate and limited to `top` entries.
    """
    cm = np.asarray(cm, dtype=float)
    out = {}
    for i, true in enumerate(labels):
        rates = [
            (cm[i, j], labels[j]) for j in range(len(labels)) if j != i and cm[i, j] >= min_rate
        ]
        if rates:
            out[true] = [name for _, name in sorted(rates, key=lambda r: (-r[0], r[1]))[:top]]
    return out
