import inspect

import numpy as np

from signlingo_ml.features import augment
from signlingo_ml.features.augment import augment_batch


def _asymmetric(n=8):
    """Images with a bright blob on the left only, so a horizontal flip is detectable."""
    X = np.zeros((n, 28, 28), dtype=np.float32)
    X[:, 8:20, 4:12] = 0.8
    return X


def test_shape_dtype_and_range_preserved():
    out = augment_batch(_asymmetric(), seed=42)
    assert out.shape == (8, 28, 28) and out.dtype == np.float32
    assert out.min() >= 0.0 and out.max() <= 1.0


def test_deterministic_for_same_seed_and_different_for_other_seed():
    X = _asymmetric()
    a = augment_batch(X, seed=42)
    assert np.array_equal(a, augment_batch(X, seed=42))
    assert not np.array_equal(a, augment_batch(X, seed=7))


def test_probability_zero_returns_inputs_unchanged():
    X = _asymmetric()
    assert np.array_equal(augment_batch(X, seed=42, p=0.0), X)


def test_identity_parameters_give_identity():
    X = _asymmetric()
    out = augment_batch(
        X, seed=42, p=1.0, rotation=0, shift=0, zoom=(1.0, 1.0), brightness=0, contrast=0
    )
    np.testing.assert_allclose(out, X, atol=1e-6)


def test_no_horizontal_flip_available_or_applied():
    assert "flip" not in " ".join(inspect.signature(augment_batch).parameters)
    assert "fliplr" not in inspect.getsource(augment) and "[::-1]" not in inspect.getsource(augment)
    X = _asymmetric()
    out = augment_batch(X, seed=42, p=1.0)
    # an augmented image stays closer to its original than to the mirrored original
    assert np.abs(out - X).mean() < np.abs(X[:, :, ::-1] - X).mean()


def test_actually_changes_images_when_enabled():
    X = _asymmetric()
    assert np.abs(augment_batch(X, seed=42, p=1.0) - X).mean() > 1e-3
