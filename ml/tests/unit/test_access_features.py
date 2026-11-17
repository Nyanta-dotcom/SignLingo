import numpy as np
import pytest

from signlingo_ml.data.access import TestSetAccessError, require_split_access
from signlingo_ml.features.hog import hog_features
from signlingo_ml.features.pixel import pixel_features


def test_train_and_val_always_allowed():
    require_split_access("train")
    require_split_access("val")


def test_test_split_blocked_unless_final():
    with pytest.raises(TestSetAccessError):
        require_split_access("test")
    require_split_access("test", final=True)


def test_unknown_split_rejected():
    with pytest.raises(ValueError):
        require_split_access("holdout")


def test_pixel_features_shape():
    X = np.zeros((5, 28, 28), dtype=np.float32)
    assert pixel_features(X).shape == (5, 784)


def test_hog_features_shape_is_1296_and_deterministic():
    rng = np.random.default_rng(42)
    X = rng.random((3, 28, 28)).astype(np.float32)
    a, b = hog_features(X), hog_features(X)
    assert a.shape == (3, 1296)
    np.testing.assert_array_equal(a, b)
