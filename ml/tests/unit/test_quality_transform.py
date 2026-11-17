import numpy as np
import pandas as pd

from signlingo_ml.data.load import load_kaggle_csv
from signlingo_ml.data.quality import clean, quality_report
from signlingo_ml.data.transform import transform


def test_quality_report_counts_nan_dup_and_bad_labels(tiny_df):
    df = tiny_df.copy()
    df.loc[0, "pixel5"] = np.nan                      # 1 NaN row
    df = pd.concat([df, df.iloc[[1]]], ignore_index=True)  # 1 exact duplicate
    df.loc[2, "label"] = 9                            # J is out of range
    rep = quality_report(df)
    assert rep.n_rows == len(df)
    assert rep.n_missing_rows == 1
    assert rep.n_duplicate_rows == 1
    assert rep.n_invalid_labels == 1
    assert rep.pixel_min >= 0 and rep.pixel_max <= 255


def test_clean_drops_bad_rows(tiny_df):
    df = tiny_df.copy()
    df.loc[0, "pixel5"] = np.nan
    df = pd.concat([df, df.iloc[[1]]], ignore_index=True)
    df.loc[2, "label"] = 25
    out = clean(df)
    assert len(out) == len(tiny_df) - 2  # NaN row and invalid label removed, duplicate dropped
    assert out.isna().sum().sum() == 0


def test_class_balance_ratio(tiny_df):
    assert quality_report(tiny_df).class_balance_ratio == 1.0


def test_transform_remaps_labels_and_scales(tiny_df):
    X, y = transform(tiny_df)
    assert X.shape == (len(tiny_df), 28, 28)
    assert X.dtype == np.float32 and X.min() >= 0.0 and X.max() <= 1.0
    assert set(y) == set(range(24))
    k = tiny_df.index[tiny_df["label"] == 10][0]  # Kaggle 10 (K) -> 9
    assert y[k] == 9
    k = tiny_df.index[tiny_df["label"] == 24][0]  # Kaggle 24 (Y) -> 23
    assert y[k] == 23


def test_load_kaggle_csv_roundtrip(tmp_path, tiny_df):
    p = tmp_path / "x.csv"
    tiny_df.to_csv(p, index=False)
    assert load_kaggle_csv(p).shape == tiny_df.shape
