"""Leave-one-signer-out evaluation of the shipped landmark ensemble (P1-21, AC-ML-06).

The config (features, MLP, ensemble) is the one already chosen on validation in
`landmark_improve`; nothing is tuned here. For each webcam signer S the test set is ALL of S's
frames, never seen in training or early stopping:
  - `kaggle_only`  : train on keypoint.csv (train part); the deployment case for a new person.
  - `with_others`  : also train on the other webcam signers (shows what extra people give).
Early stopping uses the keypoint.csv validation part only. Few signers means a noisy estimate:
report the per-signer scores and their spread, not just the mean.
"""

import argparse

import numpy as np

from signlingo_ml.config import REPORTS, SEED, raw_path
from signlingo_ml.evaluate.logger import write_record
from signlingo_ml.landmarks.dataset import load_keypoint_csv, order_split3
from signlingo_ml.landmarks.ingest import load_webcam_dir
from signlingo_ml.train.landmark_improve import run_ensemble

FEATURES, MODEL = "xy_dist_ang", "mlp_512_256"


def run_signer_holdout(kp, X_w, y_w, signer_w, members=5, epochs=60, add_other_signers=False):
    """`kp` = {'train': (X, y), 'val': (X, y)} from keypoint.csv. One record per webcam signer."""
    tag = "with_others" if add_other_signers else "kaggle_only"
    recs = []
    for s in sorted(set(signer_w.tolist())):
        mine = signer_w == s
        Xtr, ytr = kp["train"]
        if add_other_signers:
            Xtr, ytr = np.concatenate([Xtr, X_w[~mine]]), np.concatenate([ytr, y_w[~mine]])
        data = {"train": (Xtr, ytr), "val": kp["val"], "test": (X_w[mine], y_w[mine])}
        rec = run_ensemble(
            f"lmo_{tag}_{s}", FEATURES, MODEL, [SEED + i for i in range(members)], data,
            kind="main", eval_test=True, epochs=epochs,
        )  # fmt: skip
        rec["split_strategy"] = "signer_holdout"
        rec["hyperparams"].update(
            split=f"leave_one_signer_out_{tag}",
            test_signer=s,
            n_train=len(ytr),
            n_test=int(mine.sum()),
        )
        recs.append(rec)
    return recs


def summarize(recs: list[dict]) -> dict:
    f1 = np.array([r["metrics"]["test_macro_f1"] for r in recs])
    return {
        "n_signers": len(recs),
        "test_macro_f1_mean": float(f1.mean()),
        "test_macro_f1_std": float(f1.std(ddof=1)) if len(f1) > 1 else 0.0,
        "per_signer": {
            r["hyperparams"]["test_signer"]: float(v) for r, v in zip(recs, f1, strict=True)
        },
    }


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Leave-one-signer-out evaluation.")
    ap.add_argument("--members", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)
    X, y, _ = load_keypoint_csv(raw_path("keypoint.csv"))
    split = order_split3(y)
    kp = {k: (X[split == k], y[split == k]) for k in ("train", "val")}
    Xw, yw, signer, rep = load_webcam_dir()
    if rep["n_rows"] == 0:
        raise SystemExit("no webcam captures in ml/data/raw/webcam/ yet (see ml/tools/capture.py)")
    if len(rep["signers"]) < 3:
        print(f"WARNING: only {len(rep['signers'])} signer(s); the estimate is very noisy.")
    for with_others in (False, True):
        if with_others and len(rep["signers"]) < 2:
            continue
        recs = run_signer_holdout(kp, Xw, yw, signer, args.members, args.epochs, with_others)
        for r in recs:
            write_record(r, args.out)
        print(summarize(recs))


if __name__ == "__main__":
    main()
