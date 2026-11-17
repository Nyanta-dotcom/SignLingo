"""Hand orientation (chirality) helpers for the mirroring experiment (P1-19).

keypoint.csv mixes both orientations without saying which hand a row is, so we use a purely
geometric signal: the sign of the cross product of (wrist -> index MCP) and (wrist -> pinky MCP).
Mirroring (x := -x) flips this sign. This conflates left/right hand with palm/back view; that is
fine because the experiment only asks whether a mirror-invariant input helps on validation.
"""

import numpy as np

INDEX_MCP, PINKY_MCP = 5, 17


def chirality(X: np.ndarray) -> np.ndarray:
    """Sign (+1, 0, -1) of cross(index_mcp, pinky_mcp) for (N, 42) lm-v1 rows."""
    P = np.asarray(X, dtype=np.float64).reshape(-1, 21, 2)
    cross = P[:, INDEX_MCP, 0] * P[:, PINKY_MCP, 1] - P[:, INDEX_MCP, 1] * P[:, PINKY_MCP, 0]
    return np.sign(cross)


def canonicalize(X: np.ndarray) -> np.ndarray:
    """Mirror hands with negative chirality so every row has chirality >= 0."""
    out = np.array(X, dtype=np.float32, copy=True)
    neg = chirality(out) < 0
    out[neg, 0::2] *= -1.0
    return out
