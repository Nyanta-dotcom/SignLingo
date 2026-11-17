"""Baseline models (P1-09): fixed, untuned hyper-parameters; every number is measured by us.

Pipelines fit their scaler on the training part only (AC-ML-03). Hyper-parameters are NOT tuned,
so reporting the test split once per run is not model selection. MLPs use a fixed epoch count:
sklearn's built-in early stopping would split the *training* set at random and leak
near-duplicate images (same reason as the main split).
"""

import argparse
import time
import warnings

import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import LinearSVC

from signlingo_ml.config import DATA_PROCESSED, LABELS, REPORTS, SEED, raw_path
from signlingo_ml.data.access import require_split_access
from signlingo_ml.data.load import load_kaggle_csv
from signlingo_ml.data.quality import clean
from signlingo_ml.data.split import load_or_make_split, split_indices
from signlingo_ml.data.transform import transform
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.features.hog import hog_features
from signlingo_ml.features.pixel import pixel_features

# name -> (feature set, display name, stochastic?)
SPEC = {
    "majority": ("pixel", "Majority class (floor)", False),
    "lr_pixel": ("pixel", "Logistic Regression", False),
    "rf_pixel": ("pixel", "Random Forest (200 trees)", True),
    "mlp_pixel": ("pixel", "MLP 256-128", True),
    "svm_hog": ("hog", "Linear SVM", False),
    "mlp_hog": ("hog", "MLP 256-128", True),
}
MODELS = list(SPEC)
MLP_EPOCHS = 30


def build_model(name: str, seed: int = SEED) -> Pipeline:
    scaler = ("scaler", StandardScaler())
    if name == "majority":
        return Pipeline([("clf", DummyClassifier(strategy="most_frequent"))])
    if name == "lr_pixel":
        return Pipeline([scaler, ("clf", LogisticRegression(max_iter=200))])
    if name == "rf_pixel":
        return Pipeline([("clf", RandomForestClassifier(200, n_jobs=-1, random_state=seed))])
    if name == "svm_hog":
        return Pipeline([scaler, ("clf", LinearSVC(dual=False, max_iter=2000))])
    if name in ("mlp_pixel", "mlp_hog"):
        mlp = MLPClassifier((256, 128), max_iter=MLP_EPOCHS, random_state=seed)
        return Pipeline([scaler, ("clf", mlp)])
    raise ValueError(f"unknown baseline: {name!r}")


def _hyperparams(name: str, seed: int) -> dict:
    hp = {"seed": seed}
    if name in ("mlp_pixel", "mlp_hog"):
        hp.update(hidden=[256, 128], epochs=MLP_EPOCHS, early_stopping=False)
    if name == "rf_pixel":
        hp.update(n_estimators=200)
    if name == "svm_hog":
        hp.update(C=1.0, dual=False)
    if name == "lr_pixel":
        hp.update(C=1.0, max_iter=200)
    return hp


def _latency_ms(model: Pipeline, X: np.ndarray) -> float:
    """Mean predict time per image in a one-by-one loop over up to 200 images (ms)."""
    sub = X[:200]
    t0 = time.perf_counter()
    for row in sub:
        model.predict(row[None, :])
    return (time.perf_counter() - t0) / len(sub) * 1000.0


def run_baseline(name, seed, feats, y, eval_test=False) -> dict:
    """Fit one baseline on train, score on val (and on test only if eval_test)."""
    fset, display, _ = SPEC[name]
    F, model = feats[fset], build_model(name, seed)
    t0 = time.perf_counter()
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # ConvergenceWarning from the fixed-epoch MLPs
        model.fit(F["train"], y["train"])
    train_s = time.perf_counter() - t0
    val = compute_metrics(y["val"], model.predict(F["val"]), LABELS)
    metrics = {
        "val_acc": val["acc"],
        "val_macro_f1": val["macro_f1"],
        "latency_ms": _latency_ms(model, F["val"]),
        "train_s": train_s,
    }
    details = None
    if eval_test:
        require_split_access("test", final=True)
        test = compute_metrics(y["test"], model.predict(F["test"]), LABELS)
        metrics.update(
            test_acc=test["acc"], test_macro_f1=test["macro_f1"], error_rate=1.0 - test["acc"]
        )
        details = test
    return build_record(
        run_id=f"baseline_{name}_s{seed}",
        kind="baseline",
        dataset="sign_mnist",
        model_name=display,
        feature_set=fset,
        split_strategy="group_ward70",
        metrics=metrics,
        hyperparams=_hyperparams(name, seed),
        details=details,
        seed=seed,
    )


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Run baselines on the real Kaggle data.")
    ap.add_argument("--models", nargs="+", default=MODELS, choices=MODELS)
    ap.add_argument("--seeds", nargs="+", type=int, default=[SEED, SEED + 1, SEED + 2])
    ap.add_argument("--no-test", action="store_true", help="skip the official test split")
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)

    X, y = transform(clean(load_kaggle_csv(raw_path("sign_mnist_train.csv"))))
    Xt, yt = transform(clean(load_kaggle_csv(raw_path("sign_mnist_test.csv"))))
    table = load_or_make_split(X, y, DATA_PROCESSED / "split_v1.parquet")
    tr, va = split_indices(table, "train"), split_indices(table, "val")
    print(f"train {len(tr)} val {len(va)} test {len(yt)}", flush=True)

    parts = {"train": X[tr], "val": X[va], "test": Xt}
    feats = {
        "pixel": {k: pixel_features(v) for k, v in parts.items()},
        "hog": {k: hog_features(v) for k, v in parts.items()},
    }
    labels = {"train": y[tr], "val": y[va], "test": yt}
    for name in args.models:
        seeds = args.seeds if SPEC[name][2] else [SEED]
        for seed in seeds:
            rec = run_baseline(name, seed, feats, labels, eval_test=not args.no_test)
            write_record(rec, args.out)
            m = rec["metrics"]
            print(
                f"{rec['run_id']:24s} val_f1 {m['val_macro_f1']:.3f} "
                f"test_f1 {m.get('test_macro_f1', float('nan')):.3f} train {m['train_s']:.0f}s",
                flush=True,
            )


if __name__ == "__main__":
    main()
