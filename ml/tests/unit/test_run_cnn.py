import numpy as np
import pytest

pytest.importorskip("torch")

from signlingo_ml.train.run_cnn import BASE, CONFIGS, select_best
from signlingo_ml.train.trainer import TrainConfig, run_cnn


def _resolved(name):
    train_over, model_kw = CONFIGS[name]
    cfg = {**BASE["train"], **train_over}
    kw = {**BASE["model"], **model_kw}
    return cfg, kw


def test_sweep_varies_exactly_one_factor_from_the_base_config():
    base_cfg, base_kw = _resolved("base")
    assert set(CONFIGS) == {"base", "no_aug", "lr_3e-3", "dropout_0.5", "wide"}
    for name in CONFIGS:
        if name == "base":
            continue
        cfg, kw = _resolved(name)
        diffs = [k for k in cfg if cfg[k] != base_cfg[k]] + [k for k in kw if kw[k] != base_kw[k]]
        assert len(diffs) >= 1
        # "wide" changes two coupled width fields (channels + hidden), everything else one
        assert len(diffs) <= (2 if name == "wide" else 1), (name, diffs)


def _rec(tag, seed, val_f1):
    return {
        "hyperparams": {"config": tag},
        "metrics": {"val_macro_f1": val_f1},
        "seed": seed,
    }


def test_select_best_uses_mean_validation_f1_across_seeds():
    recs = [
        _rec("a", 42, 0.90),
        _rec("a", 43, 0.90),
        _rec("a", 44, 0.90),
        _rec("b", 42, 0.99),
        _rec("b", 43, 0.70),
        _rec("b", 44, 0.70),  # one lucky seed only
    ]
    assert select_best(recs) == "a"  # mean 0.90 beats mean 0.797


def test_select_best_is_deterministic_on_ties():
    recs = [_rec("b", 42, 0.9), _rec("a", 42, 0.9)]
    assert select_best(recs) == "a"  # alphabetical tie-break


def test_select_best_ignores_test_metrics_even_if_present():
    r_a, r_b = _rec("a", 42, 0.80), _rec("b", 42, 0.70)
    r_a["metrics"]["test_macro_f1"], r_b["metrics"]["test_macro_f1"] = 0.1, 0.99
    assert select_best([r_a, r_b]) == "a"


def test_run_cnn_records_the_config_tag():
    rng = np.random.default_rng(0)
    X = rng.random((16, 28, 28)).astype(np.float32)
    y = np.arange(16) % 4
    rec = run_cnn(
        "x",
        TrainConfig(epochs=1, batch_size=8, augment=False),
        X,
        y,
        X,
        y,
        num_classes=4,
        tag="my_tag",
        kind="ablation",
    )
    assert rec["hyperparams"]["config"] == "my_tag" and rec["kind"] == "ablation"
