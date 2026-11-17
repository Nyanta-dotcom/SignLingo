import json
from pathlib import Path

import numpy as np
import pytest

from signlingo_ml.landmarks.fixtures import build_fixture, write_fixture
from signlingo_ml.landmarks.normalize import normalize_lm_v1

COMMITTED = Path(__file__).resolve().parents[3] / "shared/contracts/fixtures/landmarks_lm-v1.json"


@pytest.fixture(scope="module")
def rows():
    """Synthetic already-normalised rows (wrist 0, max |coord| 1), like keypoint.csv rows."""
    rng = np.random.default_rng(0)
    P = rng.uniform(-1, 1, (80, 21, 2))
    P[:, 0] = 0
    P /= np.abs(P).reshape(80, -1).max(axis=1)[:, None, None]
    return P.reshape(80, 42).astype(np.float32)


def test_fixture_has_enough_cases_and_the_required_kinds(rows):
    fx = build_fixture(rows, seed=42, n_cases=50)
    cases = fx["cases"]
    assert fx["preprocess_version"] == "lm-v1" and len(cases) >= 50
    kinds = {c["kind"] for c in cases}
    assert {"row_inverse_transform", "with_z", "left_label", "degenerate", "tiny_scale"} <= kinds
    assert any(c["expected"] is None for c in cases)  # degenerate hand -> null


def test_every_expected_value_equals_the_python_function(rows):
    for c in build_fixture(rows, seed=42, n_cases=50)["cases"]:
        pts = np.array([[p["x"], p["y"], p["z"]] for p in c["input"]["landmarks"]])
        out = normalize_lm_v1(pts)
        if c["expected"] is None:
            assert out is None
        else:
            np.testing.assert_allclose(out, c["expected"], atol=1e-7)


def test_input_has_the_hand_frame_shape_of_the_contract(rows):
    c = build_fixture(rows, seed=42, n_cases=50)["cases"][0]["input"]
    assert len(c["landmarks"]) == 21 and set(c["landmarks"][0]) == {"x", "y", "z"}
    assert c["handedness"] in ("Left", "Right") and "score" in c and "timestampMs" in c


def test_generation_is_deterministic(rows):
    a = json.dumps(build_fixture(rows, seed=42, n_cases=50), sort_keys=True)
    assert a == json.dumps(build_fixture(rows, seed=42, n_cases=50), sort_keys=True)
    assert a != json.dumps(build_fixture(rows, seed=7, n_cases=50), sort_keys=True)


def test_write_fixture_roundtrip(tmp_path, rows):
    p = write_fixture(tmp_path / "f.json", rows, seed=42, n_cases=50)
    assert json.loads(p.read_text(encoding="utf-8"))["cases"]


def test_committed_fixture_is_consistent_with_the_current_function():
    if not COMMITTED.exists():
        pytest.skip("fixture not generated yet")
    fx = json.loads(COMMITTED.read_text(encoding="utf-8"))
    assert len(fx["cases"]) >= 50
    for c in fx["cases"]:
        pts = np.array([[p["x"], p["y"], p["z"]] for p in c["input"]["landmarks"]])
        out = normalize_lm_v1(pts)
        if c["expected"] is None:
            assert out is None
        else:
            np.testing.assert_allclose(out, c["expected"], atol=1e-6)
