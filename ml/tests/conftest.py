import numpy as np
import pandas as pd
import pytest

from signlingo_ml.config import KAGGLE_TO_INDEX


def make_df(n_per_class: int = 3, seed: int = 0) -> pd.DataFrame:
    """Synthetic Kaggle-format frame: label + pixel1..pixel784 (test fixture only)."""
    rng = np.random.default_rng(seed)
    labels = np.repeat(sorted(KAGGLE_TO_INDEX), n_per_class)
    pix = rng.integers(0, 256, size=(len(labels), 784))
    df = pd.DataFrame(pix, columns=[f"pixel{i}" for i in range(1, 785)])
    df.insert(0, "label", labels)
    return df


@pytest.fixture
def tiny_df() -> pd.DataFrame:
    return make_df()
