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


def _cnn(run_id, kind, tag, seed, **metrics):
    r = _rec(run_id, kind, "CNN + augmentation", "pixels_28x28", "group_ward70", seed, **metrics)
    r["hyperparams"] = {"config": tag, "best_epoch": 5}
    return r


def _write(tmp_path, recs):
    for r in recs:
        (tmp_path / f"{r['run_id']}.json").write_text(json.dumps(r), encoding="utf-8")
    return tmp_path


def test_cnn_sweep_and_main_are_aggregated_separately(tmp_path):
    recs = [
        _cnn("s1", "ablation", "base", 42, val_macro_f1=0.90, val_acc=0.90, params=10),
        _cnn("s2", "ablation", "base", 43, val_macro_f1=0.92, val_acc=0.92, params=10),
        _cnn("s3", "ablation", "wide", 42, val_macro_f1=0.95, val_acc=0.95, params=40),
        _cnn("m1", "main", "wide", 42, val_macro_f1=0.95, test_macro_f1=0.94, test_acc=0.94),
        _cnn("m2", "main", "wide", 43, val_macro_f1=0.96, test_macro_f1=0.96, test_acc=0.96),
    ]
    agg = aggregate(load_records(_write(tmp_path, recs)))
    sweep = {r["config"]: r for r in agg["cnn_sweep"]}
    assert set(sweep) == {"base", "wide"} and sweep["base"]["n_seeds"] == 2
    assert sweep["base"]["val_macro_f1"]["mean"] == pytest.approx(0.91)
    assert agg["cnn_sweep"][0]["config"] == "wide"  # sorted by validation F1, best first
    assert [r["config"] for r in agg["cnn_main"]] == ["wide"]
    assert agg["cnn_main"][0]["test_macro_f1"]["mean"] == pytest.approx(0.95)


def test_cnn_vs_baseline_flags_whether_the_gap_exceeds_seed_noise(tmp_path):
    base = [
        _rec(f"b{i}", "baseline", "MLP", "hog", "group_ward70", 42 + i, val_macro_f1=0.9,
             test_macro_f1=t, test_acc=t)
        for i, t in enumerate((0.90, 0.91, 0.92))
    ]
    far = [_cnn(f"m{i}", "main", "c", 42 + i, val_macro_f1=0.9, test_macro_f1=t, test_acc=t)
           for i, t in enumerate((0.96, 0.97, 0.98))]
    cmp_far = aggregate(load_records(_write(tmp_path, base + far)))["cnn_vs_baseline"]
    assert cmp_far["difference"] == pytest.approx(0.06)
    assert cmp_far["exceeds_seed_noise"] is True

    near_dir = tmp_path / "near"
    near_dir.mkdir()
    near = [_cnn(f"n{i}", "main", "c", 42 + i, val_macro_f1=0.9, test_macro_f1=t, test_acc=t)
            for i, t in enumerate((0.905, 0.915, 0.925))]
    cmp_near = aggregate(load_records(_write(near_dir, base + near)))["cnn_vs_baseline"]
    assert cmp_near["exceeds_seed_noise"] is False


def test_markdown_lists_cnn_sections(tmp_path):
    recs = [
        _cnn("s1", "ablation", "base", 42, val_macro_f1=0.9, val_acc=0.9, params=10),
        _cnn("m1", "main", "base", 42, val_macro_f1=0.9, test_macro_f1=0.9, test_acc=0.9),
    ]
    md = render_markdown(aggregate(load_records(_write(tmp_path, recs))))
    assert "CNN sweep" in md and "CNN main" in md


def _lm(run_id, kind, tag, seed, **metrics):
    r = _cnn(run_id, kind, tag, seed, **metrics)
    r["dataset"], r["model_name"], r["feature_set"] = "landmarks", "Landmark MLP", "landmarks_xy"
    return r


def test_landmark_runs_are_kept_apart_from_the_image_cnn_runs(tmp_path):
    recs = [
        _cnn("c1", "ablation", "base", 42, val_macro_f1=0.90, val_acc=0.90, params=10),
        _lm("l1", "ablation", "base", 42, val_macro_f1=0.60, val_acc=0.60, params=5),
        _lm("l2", "ablation", "canonical", 42, val_macro_f1=0.70, val_acc=0.70, params=5),
        _lm("lm1", "main", "canonical", 42, val_macro_f1=0.70, test_macro_f1=0.65, test_acc=0.66),
        _cnn("cm1", "main", "base", 42, val_macro_f1=0.90, test_macro_f1=0.88, test_acc=0.88),
    ]
    agg = aggregate(load_records(_write(tmp_path, recs)))
    assert [r["config"] for r in agg["cnn_sweep"]] == ["base"]  # only the image CNN
    assert agg["cnn_sweep"][0]["val_macro_f1"]["mean"] == pytest.approx(0.90)
    assert [r["config"] for r in agg["lm_sweep"]] == ["canonical", "base"]  # best val first
    assert [r["config"] for r in agg["lm_main"]] == ["canonical"]
    md = render_markdown(agg)
    assert "Landmark sweeps" in md and "not a signer holdout" in md
