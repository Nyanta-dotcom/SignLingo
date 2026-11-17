"""Load Kaggle Sign Language MNIST CSV (label + pixel1..pixel784)."""
from pathlib import Path

import pandas as pd


def load_kaggle_csv(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)
