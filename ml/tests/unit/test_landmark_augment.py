import numpy as np
import pytest

from signlingo_ml.landmarks.augment import augment_landmarks
from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.landmarks.orientation import chirality

IDENTITY = {"p": 1.0, "p_mirror": 0.0, "rotation": 0.0, "jitter": 0.0, "aspect": (1.0, 1.0)}


@pytest.fixture(scope="module")
def hands():
    rng = np.random.default_rng(0)
    X, ok = normalize_batch(rng.uniform(-1, 1, (400, 21, 2)))
    return X[ok]


def test_output_is_a_valid_lm_v1_row(hands):
    out = augment_landmarks(hands, seed=42, p_mirror=0.5)
    assert out.shape == hands.shape and out.dtype == np.float32
    assert (out[:, :2] == 0).all()  # wrist stays at the origin
    np.testing.assert_allclose(np.abs(out).max(axis=1), 1.0, atol=1e-6)


def test_deterministic_for_a_seed(hands):
    a = augment_landmarks(hands, seed=42)
    np.testing.assert_array_equal(a, augment_landmarks(hands, seed=42))
    assert not np.array_equal(a, augment_landmarks(hands, seed=7))


def test_identity_and_zero_probability_leave_rows_unchanged(hands):
    np.testing.assert_allclose(augment_landmarks(hands, seed=1, **IDENTITY), hands, atol=1e-6)
    np.testing.assert_array_equal(augment_landmarks(hands, seed=1, p=0.0), hands)


def test_mirror_only_negates_x_and_keeps_y(hands):
    out = augment_landmarks(hands, seed=3, **{**IDENTITY, "p_mirror": 1.0})
    np.testing.assert_allclose(out[:, 0::2], -hands[:, 0::2], atol=1e-6)
    np.testing.assert_allclose(out[:, 1::2], hands[:, 1::2], atol=1e-6)


def test_mirror_fraction_follows_p_mirror(hands):
    out = augment_landmarks(hands, seed=5, **{**IDENTITY, "p_mirror": 0.5})
    flipped = (chirality(out) != chirality(hands)) & (chirality(hands) != 0)
    assert 0.4 < flipped.mean() < 0.6


def test_rotation_keeps_the_hand_shape(hands):
    out = augment_landmarks(hands, seed=2, **{**IDENTITY, "rotation": 15.0})
    assert not np.allclose(out, hands)  # it really rotated

    def shape(X):  # per-point distance to the wrist, relative to the largest one
        n = np.linalg.norm(X.reshape(-1, 21, 2), axis=2)
        return n / n.max(axis=1, keepdims=True)

    np.testing.assert_allclose(shape(out), shape(hands), atol=1e-5)


def test_jitter_never_moves_the_wrist(hands):
    out = augment_landmarks(hands, seed=4, **{**IDENTITY, "jitter": 0.05})
    assert (out[:, :2] == 0).all() and not np.allclose(out, hands)
