"""Leakage study (P1-10): the same model under a random split vs the group split.

Two pieces of evidence, both measured by us:
1. val-vs-test accuracy gap of one model trained under each split strategy;
2. a diagnostic that does NOT use the test set for any decision: the distance from every
   validation image to its nearest same-class training image. A leaky split leaves
   near-identical copies on both sides, so this distance is tiny.

The test split is only used as a *reference* that is reported, never to tune anything.
"""

import argparse

import numpy as np
from scipy.spatial.distance import cdist
from sklearn.model_selection import train_test_split

from signlingo_ml.config import LABELS, REPORTS, SEED, raw_path
from signlingo_ml.data.access import require_split_access
from signlingo_ml.data.load import load_kaggle_csv
from signlingo_ml.data.quality import clean
from signlingo_ml.data.split import assign_groups, group_split
from signlingo_ml.data.transform import transform
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.features.pixel import pixel_features
from signlingo_ml.train.baselines import build_model


def nn_distance_stats(X_train, y_train, X_query, y_query) -> dict:
    """Euclidean distance (raw pixels in [0, 1]) from each query image to its nearest
    same-class training image; returns median / mean / 10th / 90th percentile."""
    A, Q = pixel_features(X_train), pixel_features(X_query)
    d = np.empty(len(Q))
    for c in np.unique(y_query):
        qi, ti = np.flatnonzero(y_query == c), np.flatnonzero(y_train == c)
        d[qi] = cdist(Q[qi], A[ti]).min(axis=1)
    return {
        "median": float(np.median(d)),
        "mean": float(d.mean()),
        "p10": float(np.percentile(d, 10)),
        "p90": float(np.percentile(d, 90)),
    }


def random_split(y: np.ndarray, val_frac: float = 0.15, seed: int = SEED) -> np.ndarray:
    """Stratified random train/val split (the leaky strategy we compare against)."""
    idx = np.arange(len(y))
    _, va = train_test_split(idx, test_size=val_frac, stratify=y, random_state=seed)
    split = np.full(len(y), "train", dtype=object)
    split[va] = "val"
    return split.astype(str)


def run_leakage_study(X, y, Xt, yt, groups, seeds, val_frac=0.15, eval_test=False) -> list[dict]:
    """Train Logistic Regression (pixels) under both strategies for every seed."""
    records = []
    for seed in seeds:
        strategies = {
            "random": random_split(y, val_frac, seed),
            "group_ward70": group_split(groups, y, val_frac, seed),
        }
        for strategy, split in strategies.items():
            tr, va = np.flatnonzero(split == "train"), np.flatnonzero(split == "val")
            model = build_model("lr_pixel", seed).fit(pixel_features(X[tr]), y[tr])
            val = compute_metrics(y[va], model.predict(pixel_features(X[va])), LABELS)
            metrics = {"val_acc": val["acc"], "val_macro_f1": val["macro_f1"]}
            diag = {
                "val_fraction": float(len(va) / len(y)),
                "n_train": len(tr),
                "n_val": len(va),
                "nn_dist_val_to_train": nn_distance_stats(X[tr], y[tr], X[va], y[va]),
            }
            if eval_test:
                require_split_access("test", final=True)
                test = compute_metrics(yt, model.predict(pixel_features(Xt)), LABELS)
                metrics.update(test_acc=test["acc"], test_macro_f1=test["macro_f1"])
                diag["val_test_gap"] = val["acc"] - test["acc"]
                diag["nn_dist_test_to_train"] = nn_distance_stats(X[tr], y[tr], Xt, yt)
            records.append(
                build_record(
                    run_id=f"leakage_lr_pixel_{strategy}_s{seed}",
                    kind="leakage_study",
                    dataset="sign_mnist",
                    model_name="Logistic Regression",
                    feature_set="pixel",
                    split_strategy=strategy,
                    metrics=metrics,
                    hyperparams={"seed": seed, "val_frac": val_frac},
                    seed=seed,
                )
                | {"diagnostics": diag}
            )
    return records


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Random vs group split on the real Kaggle data.")
    ap.add_argument("--seeds", nargs="+", type=int, default=[SEED, SEED + 1, SEED + 2])
    ap.add_argument("--no-test", action="store_true")
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)

    X, y = transform(clean(load_kaggle_csv(raw_path("sign_mnist_train.csv"))))
    Xt, yt = transform(clean(load_kaggle_csv(raw_path("sign_mnist_test.csv"))))
    groups = assign_groups(X, y, n_groups=70)
    for rec in run_leakage_study(X, y, Xt, yt, groups, args.seeds, eval_test=not args.no_test):
        write_record(rec, args.out)
        m, d = rec["metrics"], rec["diagnostics"]
        print(
            f"{rec['run_id']:34s} val {m['val_acc']:.3f} test {m.get('test_acc', float('nan')):.3f}"
            f" gap {d.get('val_test_gap', float('nan')):+.3f}"
            f" nn_val {d['nn_dist_val_to_train']['median']:.2f}"
            f" nn_test {d.get('nn_dist_test_to_train', {}).get('median', float('nan')):.2f}",
            flush=True,
        )


if __name__ == "__main__":
    main()
