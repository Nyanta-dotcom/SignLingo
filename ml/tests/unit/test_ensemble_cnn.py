import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

pytest.importorskip("torch")

from signlingo_ml.train.ensemble_cnn import run_cnn_ensemble

SCHEMA = json.loads(
    (
        Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json"
    ).read_text(encoding="utf-8")
)
N_CLS = 3


def _toy(n_per_class=12, seed=0):
    rng = np.random.default_rng(seed)
    X, y = [], []
    for c in range(N_CLS):
        for _ in range(n_per_class):
            img = rng.random((28, 28)).astype(np.float32) * 0.1
            img[4 + 8 * c : 10 + 8 * c, 4:10] += 0.9  # class-specific bright block
            X.append(np.clip(img, 0, 1))
            y.append(c)
    return np.array(X, dtype=np.float32), np.array(y)


@pytest.fixture(scope="module")
def data():
    return _toy(12, 0), _toy(6, 1), _toy(6, 2)


def test_ensemble_record_is_schema_valid_and_test_stays_closed(data):
    (Xtr, ytr), (Xva, yva), (Xte, yte) = data
    rec = run_cnn_ensemble(
        "e1", "base", 2, [42, 43], Xtr, ytr, Xva, yva, num_classes=N_CLS, kind="ablation"
    )
    jsonschema.validate(rec, SCHEMA)
    assert rec["hyperparams"]["n_members"] == 2 and rec["hyperparams"]["config"] == "base_e2__ens2"
    assert len(rec["hyperparams"]["member_val_macro_f1"]) == 2
    assert "test_acc" not in rec["metrics"] and "confusion_matrix" not in rec

    rec2 = run_cnn_ensemble(
        "e2", "base", 2, [42, 43], Xtr, ytr, Xva, yva, Xte, yte,
        eval_test=True, num_classes=N_CLS, kind="main",
    )  # fmt: skip
    jsonschema.validate(rec2, SCHEMA)
    assert 0.0 <= rec2["metrics"]["test_acc"] <= 1.0 and "confusion_matrix" in rec2


def test_params_are_the_sum_over_members_and_seeds_are_recorded(data):
    (Xtr, ytr), (Xva, yva), _ = data
    one = run_cnn_ensemble("a", "base", 1, [42], Xtr, ytr, Xva, yva, num_classes=N_CLS)
    three = run_cnn_ensemble("b", "base", 1, [42, 43, 44], Xtr, ytr, Xva, yva, num_classes=N_CLS)
    assert three["metrics"]["params"] == 3 * one["metrics"]["params"]
    assert three["hyperparams"]["member_seeds"] == [42, 43, 44]
