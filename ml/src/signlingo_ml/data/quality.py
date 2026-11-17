"""Data quality review and cleaning (docs/02 §4.1 steps 2-3)."""
from dataclasses import asdict, dataclass

import pandas as pd

from signlingo_ml.config import KAGGLE_TO_INDEX

PIXEL_COLS_PREFIX = "pixel"


@dataclass
class QualityReport:
    n_rows: int
    n_missing_rows: int
    n_duplicate_rows: int
    n_invalid_labels: int
    pixel_min: float
    pixel_max: float
    class_counts: dict[int, int]
    class_balance_ratio: float

    def to_dict(self) -> dict:
        return asdict(self)


def _pixels(df: pd.DataFrame) -> pd.DataFrame:
    return df[[c for c in df.columns if c.startswith(PIXEL_COLS_PREFIX)]]


def quality_report(df: pd.DataFrame) -> QualityReport:
    valid = df["label"].isin(KAGGLE_TO_INDEX)
    counts = df.loc[valid, "label"].value_counts().to_dict()
    ratio = max(counts.values()) / min(counts.values()) if counts else float("nan")
    px = _pixels(df)
    return QualityReport(
        n_rows=len(df),
        n_missing_rows=int(df.isna().any(axis=1).sum()),
        n_duplicate_rows=int(df.duplicated().sum()),
        n_invalid_labels=int((~valid).sum()),
        pixel_min=float(px.min().min()),
        pixel_max=float(px.max().max()),
        class_counts={int(k): int(v) for k, v in counts.items()},
        class_balance_ratio=float(ratio),
    )


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Drop NaN rows, out-of-range labels (J=9, Z=25 etc.) and exact duplicates."""
    out = df.dropna()
    out = out[out["label"].isin(KAGGLE_TO_INDEX)]
    return out.drop_duplicates().reset_index(drop=True)
