import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

from signlingo_ml.data.split import assign_groups
from signlingo_ml.train.leakage_study import (
    nn_distance_stats,
    random_split,
    run_leakage_study,
)

SCHEMA = json.loads(
    (
        Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json"
    ).read_text(encoding="utf-8")
)

N_CLASSES, N_ORIG, N_COPIES = 6, 20, 5


@pytest.fixture(scope="module")
def augmented():
    """6 classes x 20 'source photos' x 5 jittered copies, plus an unrelated test set."""
    rng = np.random.default_rng(0)

    def make(n_orig, copies):
        X, y = [], []
        for c in range(N_CLASSES):
            for _ in range(n_orig):
                base = rng.random((28, 28))
                for _ in range(copies):
                    a, b = rng.uniform(0.8, 1.2), rng.uniform(-0.1, 0.1)
                    X.append(np.clip(a * base + b + rng.normal(0, 0.01, (28, 28)), 0, 1))
                    y.append(c)
        return np.array(X, dtype=np.float32), np.array(y)

    X, y = make(N_ORIG, N_COPIES)
    Xt, yt = make(10, 1)  # different source photos: a genuinely held-out set
    return X, y, Xt, yt


def test_nn_distance_is_zero_for_exact_copies_and_large_for_unrelated():
    rng = np.random.default_rng(1)
    Xtr = rng.random((40, 28, 28)).astype(np.float32)
    ytr = np.repeat(np.arange(4), 10)
    same = nn_distance_stats(Xtr, ytr, Xtr[:8], ytr[:8])
    other = nn_distance_stats(Xtr, ytr, rng.random((8, 28, 28)).astype(np.float32), ytr[:8])
    assert same["median"] == pytest.approx(0.0, abs=1e-5)
    assert other["median"] > 1.0
    assert set(same) == {"median", "mean", "p10", "p90"}


def test_random_split_is_stratified_deterministic_and_about_15_percent():
    y = np.repeat(np.arange(24), 50)
    s = random_split(y, val_frac=0.15, seed=42)
    assert (s == random_split(y, val_frac=0.15, seed=42)).all()
    assert (s != random_split(y, val_frac=0.15, seed=7)).any()
    assert abs((s == "val").mean() - 0.15) < 0.01
    for c in range(24):
        assert {"train", "val"} <= set(s[y == c])


def test_random_split_leaks_more_than_group_split(augmented):
    X, y, Xt, yt = augmented
    groups = assign_groups(X, y, n_groups=N_ORIG)
    recs = run_leakage_study(X, y, Xt, yt, groups, seeds=[42], eval_test=True)
    by = {r["split_strategy"]: r for r in recs}
    assert set(by) == {"random", "group_ward70"}
    for r in recs:
        jsonschema.validate(r, SCHEMA)
        assert r["kind"] == "leakage_study"
    rnd, grp = by["random"], by["group_ward70"]
    # copies in both train and val -> val images have a near-identical neighbour in train
    d = "nn_dist_val_to_train"
    assert rnd["diagnostics"][d]["median"] < grp["diagnostics"][d]["median"]
    # ...which inflates validation accuracy and the val-test gap
    assert rnd["metrics"]["val_acc"] > grp["metrics"]["val_acc"]
    assert rnd["diagnostics"]["val_test_gap"] > grp["diagnostics"]["val_test_gap"]


def test_test_split_untouched_when_not_requested(augmented):
    X, y, Xt, yt = augmented
    groups = assign_groups(X, y, n_groups=N_ORIG)
    recs = run_leakage_study(X, y, Xt, yt, groups, seeds=[42], eval_test=False)
    assert all("test_acc" not in r["metrics"] for r in recs)
    assert all("val_test_gap" not in r["diagnostics"] for r in recs)
