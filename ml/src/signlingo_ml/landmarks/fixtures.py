"""Golden fixture `landmarks_lm-v1.json` shared by Python and TypeScript (P1-16, AC-ML-09).

Each case is a MediaPipe-style hand frame (image coordinates, wrist anywhere) plus the expected
`lm-v1` output computed by `normalize_lm_v1`. The TypeScript normaliser must reproduce every
`expected` within 1e-6 and return null where `expected` is null.

Most inputs are real keypoint.csv rows pushed back through a random scale + translation (so the
expected output is a real, already-normalised row). Special cases cover z being ignored, the
handedness label being ignored, and degenerate / near-degenerate hands.
"""

import json
from pathlib import Path

import numpy as np

from signlingo_ml.config import SEED
from signlingo_ml.landmarks.normalize import N_LANDMARKS, PREPROCESS_VERSION, normalize_lm_v1

DEGENERATE_EPS = 1e-12  # must equal normalize._EPS; the TypeScript side uses the same value


def _frame(points_xyz: np.ndarray, handedness: str, t_ms: int) -> dict:
    return {
        "landmarks": [{"x": float(x), "y": float(y), "z": float(z)} for x, y, z in points_xyz],
        "handedness": handedness,
        "score": 0.99,
        "timestampMs": t_ms,
    }


def _case(kind: str, frame: dict) -> dict:
    pts = np.array([[p["x"], p["y"], p["z"]] for p in frame["landmarks"]])
    out = normalize_lm_v1(pts)
    return {
        "kind": kind,
        "input": frame,
        "expected": None if out is None else [float(v) for v in out],
    }


def build_fixture(rows: np.ndarray, seed: int = SEED, n_cases: int = 50) -> dict:
    """`rows` are (N, 42) already-normalised landmark rows; returns the fixture dict."""
    rng = np.random.default_rng(seed)
    P = np.asarray(rows, dtype=np.float64).reshape(-1, N_LANDMARKS, 2)
    cases, t = [], 0

    for i in rng.choice(len(P), size=min(n_cases, len(P)), replace=False):
        scale = rng.uniform(0.08, 0.6)  # hand size as a fraction of the image
        origin = rng.uniform(0.15, 0.85, size=2)  # wrist position in the image
        xy = P[i] * scale + origin
        z = rng.normal(0, 0.05, size=(N_LANDMARKS, 1))
        hand = "Right" if rng.random() < 0.7 else "Left"
        cases.append(_case("row_inverse_transform", _frame(np.hstack([xy, z]), hand, t)))
        t += 33

    base = P[int(rng.integers(len(P)))] * 0.3 + 0.4
    for _ in range(3):  # z is ignored
        z = rng.uniform(-5, 5, size=(N_LANDMARKS, 1))
        cases.append(_case("with_z", _frame(np.hstack([base, z]), "Right", t)))
        t += 33
    for _ in range(3):  # the handedness label is ignored (no mirroring in lm-v1)
        cases.append(_case("left_label", _frame(np.hstack([base, np.zeros((21, 1))]), "Left", t)))
        t += 33
    for v in (0.3, 0.5):  # every point on the wrist: cannot be scaled -> null
        cases.append(_case("degenerate", _frame(np.full((N_LANDMARKS, 3), v), "Right", t)))
        t += 33
    near = np.zeros((N_LANDMARKS, 3))
    near[1:, :2] = 0.5 * DEGENERATE_EPS  # below the threshold -> null
    cases.append(_case("near_degenerate", _frame(near, "Right", t)))
    for s in (1e-6, 1e-9):  # tiny but valid
        tiny = np.hstack([base * s + 0.5, np.zeros((N_LANDMARKS, 1))])
        cases.append(_case("tiny_scale", _frame(tiny, "Right", t)))
        t += 33

    return {
        "preprocess_version": PREPROCESS_VERSION,
        "degenerate_eps": DEGENERATE_EPS,
        "tolerance": 1e-6,
        "source": (
            "keypoint.csv rows (MIT, AkramOM606/American-Sign-Language-Detection) mapped back "
            "to image coordinates; expected values computed by signlingo_ml.landmarks.normalize"
        ),
        "seed": seed,
        "cases": cases,
    }


def write_fixture(path: str | Path, rows: np.ndarray, seed: int = SEED, n_cases: int = 50) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(build_fixture(rows, seed, n_cases), indent=1), encoding="utf-8")
    return path


def main() -> None:
    from signlingo_ml.config import ROOT, raw_path
    from signlingo_ml.landmarks.dataset import load_keypoint_csv

    X, _, _ = load_keypoint_csv(raw_path("keypoint.csv"))
    out = ROOT.parent / "shared" / "contracts" / "fixtures" / "landmarks_lm-v1.json"
    print("wrote", write_fixture(out, X), f"({len(build_fixture(X)['cases'])} cases)")


if __name__ == "__main__":
    main()
