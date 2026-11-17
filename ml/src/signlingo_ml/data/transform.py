"""Transform: remap labels 0..25 (no 9, 25) -> 0..23, scale pixels to [0, 1], reshape 28x28."""
import numpy as np
import pandas as pd

from signlingo_ml.config import KAGGLE_TO_INDEX
from signlingo_ml.data.quality import _pixels


def transform(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    X = (_pixels(df).to_numpy(dtype=np.float32) / 255.0).reshape(-1, 28, 28)
    y = df["label"].map(KAGGLE_TO_INDEX).to_numpy(dtype=np.int64)
    return X, y
