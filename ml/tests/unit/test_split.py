import numpy as np
import pytest

from signlingo_ml.data.split import (
    assign_groups,
    group_split,
    load_split_table,
    save_split_table,
    split_indices,
)

N_CLASSES, N_ORIG, N_COPIES = 24, 20, 5


@pytest.fixture(scope="module")
def augmented():
    """24 classes x 20 'original photos' x 5 copies with noise + brightness/contrast jitter; returns X, y, true_orig_id."""
    rng = np.random.default_rng(0)
    X, y, orig = [], [], []
    for c in range(N_CLASSES):
        for o in range(N_ORIG):
            base = rng.random((28, 28))
            for _ in range(N_COPIES):
                a, b = rng.uniform(0.7, 1.3), rng.uniform(-0.15, 0.15)  # contrast / brightness aug
                X.append(np.clip(a * base + b + rng.normal(0, 0.01, (28, 28)), 0, 1))
                y.append(c)
                orig.append(c * N_ORIG + o)
    return np.array(X, dtype=np.float32), np.array(y), np.array(orig)


def test_copies_of_one_original_share_a_group(augmented):
    X, y, orig = augmented
    g = assign_groups(X, y, n_groups=N_ORIG, seed=42)
    for o in np.unique(orig):
        assert len(set(g[orig == o])) == 1  # all copies together


def test_group_ids_are_unique_across_classes(augmented):
    X, y, _ = augmented
    g = assign_groups(X, y, n_groups=N_ORIG)
    for gid in np.unique(g):
        assert len(set(y[g == gid])) == 1  # a group never spans two classes


def test_split_has_no_group_overlap_and_right_fraction(augmented):
    X, y, _ = augmented
    g = assign_groups(X, y, n_groups=N_ORIG)
    s = group_split(g, y, val_frac=0.15, seed=42)
    assert set(g[s == "train"]).isdisjoint(set(g[s == "val"]))  # AC-ML-02
    assert abs((s == "val").mean() - 0.15) < 0.03
    for c in range(N_CLASSES):  # every class on both sides
        assert {"train", "val"} <= set(s[y == c])


def test_split_is_deterministic_and_seed_sensitive(augmented):
    X, y, _ = augmented
    g = assign_groups(X, y, n_groups=N_ORIG)
    a = group_split(g, y, seed=42)
    assert (a == group_split(g, y, seed=42)).all()
    assert (a != group_split(g, y, seed=7)).any()


def test_table_roundtrip_and_indices(tmp_path, augmented):
    X, y, _ = augmented
    g = assign_groups(X, y, n_groups=N_ORIG)
    s = group_split(g, y)
    p = tmp_path / "split.parquet"
    save_split_table(p, y, g, s)
    t = load_split_table(p)
    assert list(t.columns) == ["row_id", "label", "group_id", "split"]
    assert len(t) == len(y)
    idx = split_indices(t, "val")
    assert (t.loc[idx, "split"] == "val").all()
    with pytest.raises(ValueError):
        split_indices(t, "test")  # the official test set is never in this table
