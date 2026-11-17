import json
from pathlib import Path

import jsonschema
import numpy as np
from sklearn.metrics import accuracy_score, f1_score

from signlingo_ml.config import LABELS
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json")
    .read_text(encoding="utf-8")
)


def _data():
    rng = np.random.default_rng(42)
    y = rng.integers(0, 24, 500)
    p = np.where(rng.random(500) < 0.8, y, rng.integers(0, 24, 500))
    return y, p


def test_metrics_match_sklearn():
    y, p = _data()
    m = compute_metrics(y, p, LABELS)
    assert m["acc"] == accuracy_score(y, p)
    assert abs(m["macro_f1"] - f1_score(y, p, average="macro", labels=range(24))) < 1e-12
    assert len(m["per_class_f1"]) == 24


def test_confusion_matrix_is_row_normalised():
    y, p = _data()
    cm = np.array(compute_metrics(y, p, LABELS)["confusion_matrix"]["matrix"])
    assert cm.shape == (24, 24)
    np.testing.assert_allclose(cm.sum(axis=1), 1.0)


def test_top_confusions_sorted_and_off_diagonal():
    y, p = _data()
    top = compute_metrics(y, p, LABELS, top_k=5)["top_confusions"]
    assert len(top) == 5
    assert all(t["true"] != t["pred"] for t in top)
    rates = [t["rate"] for t in top]
    assert rates == sorted(rates, reverse=True)


def test_record_validates_against_schema_and_is_written(tmp_path):
    y, p = _data()
    m = compute_metrics(y, p, LABELS)
    rec = build_record(
        run_id="t1", kind="baseline", dataset="sign_mnist", model_name="dummy",
        feature_set="pixel", split_strategy="group_ward70",
        metrics={"test_acc": m["acc"], "test_macro_f1": m["macro_f1"]},
        details=m,
    )
    jsonschema.validate(rec, SCHEMA)
    assert rec["seed"] == 42
    out = write_record(rec, tmp_path)
    assert json.loads(out.read_text(encoding="utf-8"))["run_id"] == "t1"
