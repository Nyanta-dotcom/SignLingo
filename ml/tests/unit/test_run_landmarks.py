import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

pytest.importorskip("torch")

from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.train.run_landmarks import BASE, CONFIGS, run_one

SCHEMA = json.loads(
    (
        Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json"
    ).read_text(encoding="utf-8")
)


def test_each_variant_changes_exactly_one_factor_of_the_base_config():
    assert set(CONFIGS) == {"base", "no_aug", "mirror_aug", "canonical"}
    for name, over in CONFIGS.items():
        if name == "base":
            continue
        assert len(over) == 1, (name, over)
        ((k, v),) = over.items()
        assert BASE[k] != v


def _toy(n_per_class=20, n_classes=3, seed=0):
    """Classes differ by where a fingertip sits; rows are valid lm-v1 hands."""
    rng = np.random.default_rng(seed)
    P, y = [], []
    for c in range(n_classes):
        for _ in range(n_per_class):
            p = rng.uniform(-0.3, 0.3, (21, 2))
            p[8] += [0.6 * (c - 1), 0.5]  # fingertip position depends on the class
            P.append(p)
            y.append(c)
    X, ok = normalize_batch(np.array(P))
    return X, np.array(y)[ok]


def test_run_one_returns_schema_valid_records_and_keeps_test_closed():
    X, y = _toy()
    data = {"train": (X, y), "val": (X, y), "test": (X, y)}
    rec = run_one("lm_toy", "base", seed=42, data=data, epochs=2, num_classes=3, kind="ablation")
    jsonschema.validate(rec, SCHEMA)
    assert rec["dataset"] == "landmarks" and rec["kind"] == "ablation"
    assert rec["hyperparams"]["config"] == "base" and rec["metrics"]["params"] > 0
    assert "test_acc" not in rec["metrics"] and "confusion_matrix" not in rec

    rec2 = run_one(
        "lm_toy2",
        "canonical",
        seed=42,
        data=data,
        epochs=2,
        num_classes=3,
        kind="main",
        eval_test=True,
    )
    jsonschema.validate(rec2, SCHEMA)
    assert rec2["feature_set"] == "landmarks_xy_canonical"
    assert 0.0 <= rec2["metrics"]["test_acc"] <= 1.0 and "confusion_matrix" in rec2
