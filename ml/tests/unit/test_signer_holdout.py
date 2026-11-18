import numpy as np

from signlingo_ml.evaluate.signer_holdout import run_signer_holdout, summarize
from signlingo_ml.landmarks.dataset import order_split3
from signlingo_ml.landmarks.normalize import normalize_batch


def _hands(n, seed):
    X, ok = normalize_batch(np.random.default_rng(seed).uniform(0, 1, (n, 21, 2)))
    assert ok.all()
    return X


def _data():
    n = 24 * 20
    y_kp = np.repeat(np.arange(24), 20)
    X_kp = _hands(n, 0)
    split = order_split3(y_kp)
    kp = {k: (X_kp[split == k], y_kp[split == k]) for k in ("train", "val")}
    y_w = np.tile(np.arange(24), 4)
    return kp, _hands(len(y_w), 1), y_w, np.array(["S01"] * 48 + ["S02"] * 48)


def test_one_record_per_signer_marked_signer_holdout():
    kp, Xw, yw, sg = _data()
    recs = run_signer_holdout(kp, Xw, yw, sg, members=1, epochs=2)
    assert [r["run_id"] for r in recs] == ["lmo_kaggle_only_S01", "lmo_kaggle_only_S02"]
    assert {r["split_strategy"] for r in recs} == {"signer_holdout"}
    assert all(r["hyperparams"]["test_signer"] in ("S01", "S02") for r in recs)
    assert all("test_macro_f1" in r["metrics"] for r in recs)


def test_other_signers_are_added_to_training_only_when_asked():
    kp, Xw, yw, sg = _data()
    a = run_signer_holdout(kp, Xw, yw, sg, members=1, epochs=2, add_other_signers=True)
    assert a[0]["run_id"] == "lmo_with_others_S01"
    assert a[0]["hyperparams"]["n_train"] == len(kp["train"][1]) + 48
    b = run_signer_holdout(kp, Xw, yw, sg, members=1, epochs=2)
    assert b[0]["hyperparams"]["n_train"] == len(kp["train"][1])


def test_summary_reports_mean_std_and_count_of_signers():
    kp, Xw, yw, sg = _data()
    s = summarize(run_signer_holdout(kp, Xw, yw, sg, members=1, epochs=2))
    assert s["n_signers"] == 2 and 0 <= s["test_macro_f1_mean"] <= 1 and s["test_macro_f1_std"] >= 0
