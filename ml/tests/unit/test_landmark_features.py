import numpy as np
import pytest

from signlingo_ml.landmarks.features import FEATURE_KINDS, build_features
from signlingo_ml.landmarks.normalize import normalize_batch

SIZES = {"xy": 42, "dist": 210, "dist_ang": 241, "xy_dist_ang": 283}


@pytest.fixture(scope="module")
def hands():
    rng = np.random.default_rng(0)
    X, ok = normalize_batch(rng.uniform(-1, 1, (150, 21, 2)))
    return X[ok]


def _mirror(X):
    M = X.copy()
    M[:, 0::2] *= -1
    return M


def _rotate(X, deg):
    t = np.deg2rad(deg)
    P = X.reshape(-1, 21, 2).astype(np.float64)
    R = np.stack(
        [
            P[..., 0] * np.cos(t) - P[..., 1] * np.sin(t),
            P[..., 0] * np.sin(t) + P[..., 1] * np.cos(t),
        ],
        axis=-1,
    )
    return normalize_batch(R)[0]  # re-normalised: a valid lm-v1 row again


@pytest.mark.parametrize("kind", FEATURE_KINDS)
def test_feature_sizes_dtype_and_finiteness(kind, hands):
    F = build_features(hands, kind)
    assert F.shape == (len(hands), SIZES[kind]) and F.dtype == np.float32
    assert np.isfinite(F).all()


def test_unknown_kind_is_rejected(hands):
    with pytest.raises(ValueError):
        build_features(hands, "nope")


@pytest.mark.parametrize("kind", ["dist", "dist_ang"])
def test_distance_and_angle_features_ignore_rotation_and_global_scale(kind, hands):
    a = build_features(hands, kind)
    b = build_features(_rotate(hands, 37.0), kind)
    np.testing.assert_allclose(a, b, atol=1e-4)


@pytest.mark.parametrize("kind", FEATURE_KINDS)
def test_all_features_are_mirror_invariant_because_orientation_is_canonicalised(kind, hands):
    np.testing.assert_allclose(
        build_features(_mirror(hands), kind), build_features(hands, kind), atol=1e-5
    )


def _hand_with_tips(tip8, tip12):
    """Hand with positive chirality (index MCP right of pinky MCP) and chosen fingertips."""
    P = np.zeros((21, 2))
    P[5], P[17] = [1.0, 0.2], [-1.0, 0.3]  # cross(index_mcp, pinky_mcp) = 0.5 > 0
    P[8], P[12] = tip8, tip12
    P[1:5] = [[0.3, 0.2], [0.4, 0.4], [0.5, 0.6], [0.6, 0.8]]
    return normalize_batch(P[None])[0]


def test_straight_finger_has_flexion_cosine_minus_one():
    P = np.zeros((21, 2))
    P[5], P[6], P[7], P[8] = [0, 1], [0, 2], [0, 3], [0, 4]  # index finger perfectly straight
    P[17] = [-1, 0.3]
    X, _ = normalize_batch(P[None])
    F = build_features(X, "dist_ang")[0]
    flex = F[210 : 210 + 15]  # first 15 angle features are flexion cosines (thumb first)
    assert flex[3] == pytest.approx(-1.0, abs=1e-5)  # index: joint at landmark 6


def test_swapping_two_fingertips_flips_the_sign_of_their_crossing_feature():
    a = build_features(_hand_with_tips([0.6, 3.0], [1.2, 2.5]), "dist_ang")[0]
    b = build_features(_hand_with_tips([1.2, 2.5], [0.6, 3.0]), "dist_ang")[0]
    sin_idx = 210 + 15 + 2 * 5 + 1  # tip pair (8, 12): its sine is the signed crossing term
    assert a[sin_idx] * b[sin_idx] < 0
    assert a[sin_idx] == pytest.approx(-b[sin_idx], abs=1e-5)
