import numpy as np
import pytest

pytest.importorskip("matplotlib")

from signlingo_ml.evaluate.figures import (
    fig_confusion,
    fig_curves,
    fig_leakage,
    fig_model_comparison,
    fig_per_class_f1,
    make_all,
)
from signlingo_ml.evaluate.summary import aggregate

LABELS = ["A", "B", "C"]


def _is_png(path):
    return (
        path.exists()
        and path.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"
        and path.stat().st_size > 1000
    )


def _rec(run_id, kind="main", dataset="sign_mnist", name="Model", fset="pixel", **extra):
    r = {
        "run_id": run_id, "kind": kind, "dataset": dataset, "model_name": name,
        "feature_set": fset, "split_strategy": "group_ward70", "seed": 42, "run_at": "t",
        "metrics": {"val_macro_f1": 0.9, "test_macro_f1": 0.8, "test_acc": 0.85},
        "hyperparams": {"config": "cfg", "best_epoch": 3},
    }  # fmt: skip
    r.update(extra)
    return r


def _with_detail(run_id, **kw):
    cm = np.array([[0.9, 0.1, 0.0], [0.2, 0.7, 0.1], [0.0, 0.0, 1.0]])
    return _rec(
        run_id,
        confusion_matrix={"labels": LABELS, "matrix": cm.tolist(), "normalized": "row"},
        per_class_f1={"A": 0.9, "B": 0.7, "C": 1.0},
        curves={"epoch": [1, 2, 3], "train_loss": [2.0, 1.0, 0.5], "val_macro_f1": [0.5, 0.7, 0.8]},
        **kw,
    )


@pytest.fixture
def records():
    base = [_rec(f"b{i}", "baseline", name="MLP", fset="hog", seed=42 + i) for i in range(3)] + [
        _rec("c1", "main", name="CNN wide", fset="pixels_28x28")
    ]
    leak = [
        _rec(f"l{s}_{i}", "leakage_study", name="LR", split_strategy=s,
             metrics={"val_acc": v, "test_acc": 0.7},
             diagnostics={"val_test_gap": v - 0.7, "nn_dist_val_to_train": {"median": d},
                          "nn_dist_test_to_train": {"median": 2.5}})
        for i in range(2) for s, v, d in (("random", 1.0, 0.4), ("group_ward70", 0.75, 2.4))
    ]  # fmt: skip
    return base + leak + [_with_detail("cm1", name="CNN ens", fset="pixels_28x28")]


def test_model_comparison_png_is_written(records, tmp_path):
    assert _is_png(fig_model_comparison(aggregate(records), tmp_path / "cmp.png"))


def test_confusion_matrix_png_and_missing_matrix_is_an_error(records, tmp_path):
    rec = next(r for r in records if r["run_id"] == "cm1")
    assert _is_png(fig_confusion(rec, tmp_path / "cm.png"))
    with pytest.raises(ValueError, match="confusion_matrix"):
        fig_confusion(_rec("none"), tmp_path / "x.png")


def test_per_class_f1_and_curves_png(records, tmp_path):
    rec = next(r for r in records if r["run_id"] == "cm1")
    assert _is_png(fig_per_class_f1([rec, rec], ["one", "two"], tmp_path / "f1.png"))
    assert _is_png(fig_curves(rec, tmp_path / "curves.png"))
    with pytest.raises(ValueError, match="curves"):
        fig_curves(_rec("none"), tmp_path / "y.png")


def test_leakage_png(records, tmp_path):
    assert _is_png(fig_leakage(aggregate(records), tmp_path / "leak.png"))
    with pytest.raises(ValueError, match="leakage"):
        fig_leakage(aggregate([_rec("x", "baseline")]), tmp_path / "z.png")


def test_make_all_reports_what_it_wrote_and_what_it_skipped(records, tmp_path):
    res = make_all(records, tmp_path)
    assert all(_is_png(tmp_path / n) for n in res["written"])
    assert {"model_comparison.png", "leakage_study.png"} <= set(res["written"])
    # the real run ids are absent in this tiny set: they must be reported, not silently ignored
    assert any("cnn_ens_wide_e30_n5" in k for k in res["skipped"])
