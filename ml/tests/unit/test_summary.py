import json

import pytest

from signlingo_ml.evaluate.summary import aggregate, load_records, render_markdown


def _rec(run_id, kind, name, fset, strategy, seed, **metrics):
    return {
        "run_id": run_id,
        "kind": kind,
        "dataset": "sign_mnist",
        "model_name": name,
        "feature_set": fset,
        "split_strategy": strategy,
        "metrics": metrics,
        "seed": seed,
        "run_at": "2026-01-01T00:00:00+00:00",
    }


@pytest.fixture
def exp_dir(tmp_path):
    recs = [
        _rec(
            "a1",
            "baseline",
            "RF",
            "pixel",
            "group_ward70",
            42,
            val_macro_f1=0.80,
            test_macro_f1=0.70,
            test_acc=0.72,
            latency_ms=1.0,
            train_s=10,
        ),
        _rec(
            "a2",
            "baseline",
            "RF",
            "pixel",
            "group_ward70",
            43,
            val_macro_f1=0.84,
            test_macro_f1=0.74,
            test_acc=0.76,
            latency_ms=1.0,
            train_s=12,
        ),
        _rec(
            "b1",
            "baseline",
            "LR",
            "pixel",
            "group_ward70",
            42,
            val_macro_f1=0.60,
            test_macro_f1=0.50,
            test_acc=0.52,
            latency_ms=0.1,
            train_s=3,
        ),
    ]
    for r in recs:
        (tmp_path / f"{r['run_id']}.json").write_text(json.dumps(r), encoding="utf-8")
    return tmp_path


def test_load_records_reads_every_json(exp_dir):
    assert len(load_records(exp_dir)) == 3


def test_aggregate_baselines_mean_std_and_seed_count(exp_dir):
    rows = {
        (r["model_name"], r["feature_set"]): r
        for r in aggregate(load_records(exp_dir))["baselines"]
    }
    rf = rows[("RF", "pixel")]
    assert rf["n_seeds"] == 2
    assert rf["val_macro_f1"]["mean"] == pytest.approx(0.82)
    assert rf["val_macro_f1"]["std"] == pytest.approx(0.0282842712, rel=1e-6)  # sample std, n-1
    lr = rows[("LR", "pixel")]
    assert lr["n_seeds"] == 1 and lr["test_macro_f1"]["std"] is None  # no spread from one run


def test_best_baseline_is_chosen_by_validation_not_test(tmp_path):
    # model A is better on val, model B is better on test: A must be reported as "best"
    for r in (
        _rec(
            "x",
            "baseline",
            "A",
            "pixel",
            "group_ward70",
            42,
            val_macro_f1=0.9,
            test_macro_f1=0.5,
            test_acc=0.5,
        ),
        _rec(
            "y",
            "baseline",
            "B",
            "pixel",
            "group_ward70",
            42,
            val_macro_f1=0.7,
            test_macro_f1=0.8,
            test_acc=0.8,
        ),
    ):
        (tmp_path / f"{r['run_id']}.json").write_text(json.dumps(r), encoding="utf-8")
    assert aggregate(load_records(tmp_path))["best_by_val"]["model_name"] == "A"


def test_markdown_contains_every_model_and_no_nan_text(exp_dir):
    md = render_markdown(aggregate(load_records(exp_dir)))
    assert "RF" in md and "LR" in md and "nan" not in md.lower()
