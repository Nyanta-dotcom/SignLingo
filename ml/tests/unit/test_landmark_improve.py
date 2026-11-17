import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

pytest.importorskip("torch")

from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.train.landmark_improve import (
    MODELS,
    Standardizer,
    run_ensemble,
    run_model,
)

SCHEMA = json.loads(
    (
        Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json"
    ).read_text(encoding="utf-8")
)
N_CLS = 3


def _toy(n_per_class=40, seed=0):
    """Classes differ by where the index fingertip sits; rows are valid lm-v1 hands."""
    rng = np.random.default_rng(seed)
    P, y = [], []
    for c in range(N_CLS):
        for _ in range(n_per_class):
            p = rng.uniform(-0.3, 0.3, (21, 2))
            p[5], p[17] = [0.8, 0.2], [-0.8, 0.3]  # fixed chirality
            p[8] += [0.7 * (c - 1), 0.6]
            P.append(p)
            y.append(c)
    X, ok = normalize_batch(np.array(P))
    return X, np.array(y)[ok]


@pytest.fixture(scope="module")
def data():
    X, y = _toy()
    return {"train": (X, y), "val": (X, y), "test": (X, y)}


def test_standardizer_is_fit_on_train_only():
    tr = np.random.default_rng(0).normal(5, 2, (100, 4)).astype(np.float32)
    other = tr + 100
    s = Standardizer.fit(tr)
    np.testing.assert_allclose(s.mean, tr.mean(axis=0), rtol=1e-5)
    np.testing.assert_allclose(s.transform(tr).mean(axis=0), 0, atol=1e-5)
    assert s.transform(other).mean() > 10  # not re-fit on the data it transforms


def test_model_registry_contains_the_planned_families():
    assert {"mlp_128_64", "mlp_256_128", "mlp_512_256", "hgb"} <= set(MODELS)


@pytest.mark.parametrize("model", ["mlp_128_64", "hgb"])
def test_run_model_record_is_schema_valid_and_test_stays_closed(model, data):
    kw = {"num_classes": N_CLS, "epochs": 3, "hgb_iters": 10}
    rec = run_model(f"t_{model}", "dist_ang", model, 42, data, kind="ablation", **kw)
    jsonschema.validate(rec, SCHEMA)
    assert rec["dataset"] == "landmarks" and rec["feature_set"] == "dist_ang"
    assert rec["hyperparams"]["config"] == f"dist_ang__{model}"
    assert "test_acc" not in rec["metrics"] and "confusion_matrix" not in rec

    rec2 = run_model(f"t2_{model}", "dist_ang", model, 42, data, kind="main", eval_test=True, **kw)
    jsonschema.validate(rec2, SCHEMA)
    assert 0.0 <= rec2["metrics"]["test_acc"] <= 1.0 and "confusion_matrix" in rec2


def test_ensemble_averages_probabilities_and_keeps_test_closed(data):
    kw = {"num_classes": N_CLS, "epochs": 3}
    rec = run_ensemble("t_ens", "dist_ang", "mlp_128_64", [42, 43, 44], data, **kw)
    jsonschema.validate(rec, SCHEMA)
    assert rec["hyperparams"]["n_members"] == 3 and "test_acc" not in rec["metrics"]
    rec2 = run_ensemble(
        "t_ens2", "dist_ang", "mlp_128_64", [42, 43], data, kind="main", eval_test=True, **kw
    )
    jsonschema.validate(rec2, SCHEMA)
    assert "test_macro_f1" in rec2["metrics"]
