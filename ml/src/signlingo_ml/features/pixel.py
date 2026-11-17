import numpy as np


def pixel_features(X: np.ndarray) -> np.ndarray:
    """(N, 28, 28) -> (N, 784)."""
    return X.reshape(len(X), -1)
