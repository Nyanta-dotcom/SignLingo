"""Leakage-free train/validation split (docs/02 §4.2, AC-ML-02).

The Kaggle training set was built by augmenting ~1,704 original photos ~16x each, so a random
split puts near-copies of the same photo on both sides and inflates validation scores.
We recover the (unknown) photo groups by clustering each class on 10x10 thumbnails with Ward
linkage, then hold out *whole groups* as validation.

Limitations: (1) the groups are an estimate (no true photo ids are published), so some leakage
may remain; (2) the thumbnail size and standardisation were chosen by looking at the
validation-vs-test gap of a baseline, which uses the test set as a *diagnostic* of leakage (not
for model selection). Both must be stated in the report.
"""

from pathlib import Path

import numpy as np
import pandas as pd
from scipy.cluster.hierarchy import fcluster, linkage
from skimage.transform import resize

from signlingo_ml.config import SEED

THUMB = (10, 10)


def _thumbnails(X: np.ndarray) -> np.ndarray:
    """10x10 thumbnails, standardised per image (zero mean, unit variance).

    Per-image standardisation matters: Kaggle's augmentation changes brightness/contrast, so
    without it copies of one photo do not cluster together and leakage remains. Measured on the
    real data with the week 3 Logistic Regression baseline: without it val 0.987 vs test 0.691
    (gap 0.296, i.e. still leaking); with it val 0.773 vs test 0.705 (gap 0.068).
    """
    t = np.stack([resize(img, THUMB, anti_aliasing=True) for img in X]).reshape(len(X), -1)
    return (t - t.mean(axis=1, keepdims=True)) / (t.std(axis=1, keepdims=True) + 1e-6)


def assign_groups(X: np.ndarray, y: np.ndarray, n_groups: int = 70, seed: int = SEED) -> np.ndarray:
    """Cluster each class into <= n_groups groups; returns globally unique integer group ids.

    Ward linkage is deterministic, so `seed` is accepted for interface symmetry only.
    """
    del seed
    thumbs = _thumbnails(X)
    group = np.zeros(len(y), dtype=np.int64)
    next_id = 0
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        k = min(n_groups, len(idx))
        if len(idx) == 1:
            labels = np.array([1])
        else:
            labels = fcluster(linkage(thumbs[idx], method="ward"), t=k, criterion="maxclust")
        for lab in np.unique(labels):
            group[idx[labels == lab]] = next_id
            next_id += 1
    return group


def group_split(
    group_ids: np.ndarray, y: np.ndarray, val_frac: float = 0.15, seed: int = SEED
) -> np.ndarray:
    """Per class, move whole groups (random order) to validation until ~val_frac of images."""
    rng = np.random.default_rng(seed)
    split = np.full(len(y), "train", dtype=object)
    for c in np.unique(y):
        idx = np.flatnonzero(y == c)
        gids, sizes = np.unique(group_ids[idx], return_counts=True)
        order = rng.permutation(len(gids))
        target = val_frac * len(idx)
        taken = 0
        for j in order:
            if taken >= target:
                break
            if taken > 0 and taken + sizes[j] / 2 > target:
                continue  # skip a group that would overshoot the target by too much
            split[idx[group_ids[idx] == gids[j]]] = "val"
            taken += sizes[j]
        if taken == 0:  # tiny classes: guarantee at least one validation group
            split[idx[group_ids[idx] == gids[order[0]]]] = "val"
    return split.astype(str)


def save_split_table(path: str | Path, y, group_ids, split) -> Path:
    table = pd.DataFrame(
        {"row_id": np.arange(len(y)), "label": y, "group_id": group_ids, "split": split}
    )
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    table.to_parquet(path, index=False)
    return path


def load_split_table(path: str | Path) -> pd.DataFrame:
    return pd.read_parquet(path)


def split_indices(table: pd.DataFrame, name: str) -> np.ndarray:
    """Row indices of the 'train' or 'val' part. The official test set is not in this table."""
    if name not in ("train", "val"):
        raise ValueError(f"split table only holds 'train' and 'val', got {name!r}")
    return table.index[table["split"] == name].to_numpy()
