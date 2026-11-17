import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from hypothesis.extra.numpy import arrays

from signlingo_ml.config import raw_path
from signlingo_ml.landmarks.dataset import load_keypoint_csv
from signlingo_ml.landmarks.normalize import (
    N_LANDMARKS,
    PREPROCESS_VERSION,
    normalize_batch,
    normalize_lm_v1,
)

finite = st.floats(min_value=-5, max_value=5, allow_nan=False, allow_infinity=False, width=32)
hands = arrays(np.float64, (N_LANDMARKS, 2), elements=finite).filter(
    lambda p: np.abs(p - p[0]).max() > 1e-3  # not degenerate
)


def test_version_constant():
    assert PREPROCESS_VERSION == "lm-v1"


@given(hands)
@settings(max_examples=100, deadline=None)
def test_wrist_at_origin_and_max_abs_coordinate_is_one(p):
    out = normalize_lm_v1(p)
    assert out.shape == (42,) and out.dtype == np.float32
    assert out[0] == 0 and out[1] == 0  # wrist (x0, y0)
    assert np.abs(out).max() == pytest.approx(1.0, abs=1e-6)


@given(hands, st.floats(-3, 3), st.floats(-3, 3))
@settings(max_examples=100, deadline=None)
def test_invariant_to_translation(p, dx, dy):
    np.testing.assert_allclose(
        normalize_lm_v1(p + np.array([dx, dy])), normalize_lm_v1(p), atol=1e-4
    )


@given(hands, st.floats(0.1, 10))
@settings(max_examples=100, deadline=None)
def test_invariant_to_positive_scale(p, k):
    np.testing.assert_allclose(normalize_lm_v1(p * k), normalize_lm_v1(p), atol=1e-4)


@given(hands)
@settings(max_examples=50, deadline=None)
def test_idempotent(p):
    once = normalize_lm_v1(p)
    np.testing.assert_allclose(normalize_lm_v1(once.reshape(21, 2)), once, atol=1e-6)


def test_layout_is_x0_y0_x1_y1_and_z_is_ignored():
    p3 = np.zeros((21, 3))
    p3[1] = [2.0, -1.0, 99.0]  # z must not matter
    p3[2] = [0.5, 0.25, -7.0]
    out = normalize_lm_v1(p3)
    assert out[2] == pytest.approx(1.0) and out[3] == pytest.approx(-0.5)  # landmark 1
    assert out[4] == pytest.approx(0.25) and out[5] == pytest.approx(0.125)  # landmark 2


def test_degenerate_hand_returns_none():
    assert normalize_lm_v1(np.full((21, 2), 0.3)) is None


def test_rejects_wrong_shapes():
    for bad in (np.zeros((20, 2)), np.zeros((21,)), np.zeros((21, 4))):
        with pytest.raises(ValueError):
            normalize_lm_v1(bad)


def test_batch_marks_degenerate_rows():
    good = np.arange(42, dtype=float).reshape(21, 2)
    X, ok = normalize_batch(np.stack([good, np.zeros((21, 2)), good]))
    assert ok.tolist() == [True, False, True]
    assert X.shape == (3, 42)
    np.testing.assert_allclose(X[0], normalize_lm_v1(good))


def test_matches_every_row_of_the_real_keypoint_file():
    """keypoint.csv rows are already normalised: lm-v1 must reproduce them exactly."""
    try:
        path = raw_path("keypoint.csv")
    except FileNotFoundError:
        pytest.skip("keypoint.csv not available")
    X, _, _ = load_keypoint_csv(path)
    out, ok = normalize_batch(X.reshape(-1, N_LANDMARKS, 2))
    assert ok.all()
    np.testing.assert_allclose(out, X, atol=1e-6)  # all 33,536 rows
