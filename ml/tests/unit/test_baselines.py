import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

from signlingo_ml.data.split import load_or_make_split
from signlingo_ml.data.transform import transform
from signlingo_ml.features.hog import hog_features
from signlingo_ml.features.pixel import pixel_features
from signlingo_ml.train.baselines import MODELS, build_model, run_baseline
from tests.conftest import make_df

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json")
    .read_text(encoding="utf-8")
)


@pytest.fixture(scope="module")
def data():
    X, y = transform(make_df(n_per_class=10, seed=1))
    cut_a, cut_b = int(len(y) * 0.6), int(len(y) * 0.8)
    parts = {"train": slice(0, cut_a), "val": slice(cut_a, cut_b), "test": slice(cut_b, None)}
    feats = {
        "pixel": {k: pixel_features(X[s]) for k, s in parts.items()},
        "hog": {k: hog_features(X[s]) for k, s in parts.items()},
    }
    return feats, {k: y[s] for k, s in parts.items()}


def test_scaler_is_fit_on_train_only(data):
    feats, y = data
    m = build_model("lr_pixel", seed=42).fit(feats["pixel"]["train"], y["train"])
    mean = m.named_steps["scaler"].mean_
    np.testing.assert_allclose(mean, feats["pixel"]["train"].mean(axis=0), rtol=1e-5)
    both = np.vstack([feats["pixel"]["train"], feats["pixel"]["val"]]).mean(axis=0)
    assert not np.allclose(mean, both)


@pytest.mark.parametrize("name", MODELS)
def test_every_model_produces_a_schema_valid_record(name, data):
    feats, y = data
    rec = run_baseline(name, seed=42, feats=feats, y=y, eval_test=True)
    jsonschema.validate(rec, SCHEMA)
    assert rec["kind"] == "baseline" and rec["split_strategy"] == "group_ward70"
    for k in ("val_acc", "val_macro_f1", "test_acc", "test_macro_f1", "latency_ms", "train_s"):
        assert k in rec["metrics"]
    assert abs(rec["metrics"]["error_rate"] - (1 - rec["metrics"]["test_acc"])) < 1e-9
    assert rec["run_id"].startswith(f"baseline_{name}_s42")


def test_test_set_is_not_touched_unless_requested(data):
    feats, y = data
    rec = run_baseline("lr_pixel", seed=42, feats=feats, y=y, eval_test=False)
    assert "test_acc" not in rec["metrics"] and "confusion_matrix" not in rec


def test_majority_baseline_predicts_the_most_frequent_class(data):
    feats, y = data
    m = build_model("majority", seed=42).fit(feats["pixel"]["train"], y["train"])
    top = np.bincount(y["train"]).argmax()
    assert (m.predict(feats["pixel"]["val"]) == top).all()


def test_split_is_cached_and_reproducible(tmp_path):
    X, y = transform(make_df(n_per_class=30, seed=2))
    p = tmp_path / "split.parquet"
    a = load_or_make_split(X, y, p, n_groups=10)
    assert p.exists()
    b = load_or_make_split(X, y, p, n_groups=10)  # second call reads the cache
    assert a["split"].tolist() == b["split"].tolist()
    assert set(a["split"]) == {"train", "val"}
