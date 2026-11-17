import numpy as np
from skimage.feature import hog


def hog_features(X: np.ndarray) -> np.ndarray:
    """HOG: 9 orientations, 4x4 cells, 2x2 blocks -> 1296 features for 28x28."""
    return np.stack(
        [
            hog(img, orientations=9, pixels_per_cell=(4, 4), cells_per_block=(2, 2))
            for img in X
        ]
    ).astype(np.float32)
