"""Landmark MLP experiments (P1-19): does mirroring help? Chosen on validation only.

Data: keypoint.csv, split by file order per class into train | gap | val | gap | test
(order_split3). There is no signer/session column, so this is NOT a signer holdout.

Configs change one factor from `base`:
  no_aug      - no augmentation
  mirror_aug  - augment with random mirroring (p=0.5): the model must learn both orientations
  canonical   - mirror every hand to a canonical orientation at input (train, val and test)
Protocol as in run_cnn: sweep on validation, pick by mean validation macro-F1, then re-train the
winner and score the test part once.
"""

import argparse

import torch

from signlingo_ml.config import LABELS, REPORTS, SEED, raw_path
from signlingo_ml.data.access import require_split_access
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.landmarks.augment import augment_landmarks
from signlingo_ml.landmarks.dataset import load_keypoint_csv, order_split3
from signlingo_ml.landmarks.orientation import canonicalize
from signlingo_ml.models.cnn import count_parameters
from signlingo_ml.models.landmark_mlp import LandmarkMLP
from signlingo_ml.train.run_cnn import select_best
from signlingo_ml.train.trainer import (
    N_CLASSES,
    TrainConfig,
    predict_logits,
    set_determinism,
    train_model,
)

BASE = {"augment": True, "p_mirror": 0.0, "canonical": False}
CONFIGS = {
    "base": {},
    "no_aug": {"augment": False},
    "mirror_aug": {"p_mirror": 0.5},
    "canonical": {"canonical": True},
}
SPLIT_NOTE = "file_order_60_20_20_gap2pct"


def run_one(
    run_id, tag, seed, data, epochs=40, num_classes=N_CLASSES, kind="ablation", eval_test=False
) -> dict:
    """Train one configuration for one seed; `data` = {split: (X (N,42), y)} with lm-v1 rows."""
    spec = {**BASE, **CONFIGS[tag]}
    prep = canonicalize if spec["canonical"] else (lambda X: X)
    (Xtr, ytr), (Xva, yva) = data["train"], data["val"]
    Xtr, Xva = prep(Xtr), prep(Xva)

    def augment_fn(X, seed):
        return prep(augment_landmarks(X, seed=seed, p_mirror=spec["p_mirror"]))

    cfg = TrainConfig(
        lr=1e-3, epochs=epochs, batch_size=256, augment=spec["augment"], patience=5, seed=seed
    )
    set_determinism(seed)
    model = LandmarkMLP(num_classes=num_classes)
    res = train_model(model, Xtr, ytr, Xva, yva, cfg, num_classes, augment_fn=augment_fn)

    labels = LABELS if num_classes == len(LABELS) else [str(i) for i in range(num_classes)]
    val = compute_metrics(yva, predict_logits(model, Xva).argmax(1), labels)
    metrics = {
        "val_acc": val["acc"],
        "val_macro_f1": val["macro_f1"],
        "params": count_parameters(model),
        "train_s": res.train_s,
    }
    details = None
    if eval_test:
        require_split_access("test", final=True)
        Xte, yte = data["test"]
        test = compute_metrics(yte, predict_logits(model, prep(Xte)).argmax(1), labels)
        metrics.update(
            test_acc=test["acc"], test_macro_f1=test["macro_f1"], error_rate=1.0 - test["acc"]
        )
        details = test
    return build_record(
        run_id=run_id,
        kind=kind,
        dataset="landmarks",
        model_name="Landmark MLP",
        feature_set="landmarks_xy_canonical" if spec["canonical"] else "landmarks_xy",
        split_strategy="session_holdout",
        metrics=metrics,
        hyperparams={
            "config": tag,
            "seed": seed,
            "epochs": epochs,
            "best_epoch": res.best_epoch,
            "stopped_early": res.stopped_early,
            "split": SPLIT_NOTE,
            **spec,
        },
        details=details,
        curves=res.history,
        seed=seed,
    )


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Landmark MLP sweep on keypoint.csv.")
    ap.add_argument("--seeds", nargs="+", type=int, default=[SEED, SEED + 1, SEED + 2])
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--skip-final", action="store_true")
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)

    X, y, rep = load_keypoint_csv(raw_path("keypoint.csv"))
    split = order_split3(y)
    data = {k: (X[split == k], y[split == k]) for k in ("train", "val", "test")}
    print(
        f"{rep.n_rows} rows | " + " ".join(f"{k} {len(v[1])}" for k, v in data.items()),
        f"| torch threads {torch.get_num_threads()}",
        flush=True,
    )

    sweep = []
    for tag in CONFIGS:
        for seed in args.seeds:
            rec = run_one(f"lm_sweep_{tag}_s{seed}", tag, seed, data, args.epochs)
            write_record(rec, args.out)
            sweep.append(rec)
            m, h = rec["metrics"], rec["hyperparams"]
            print(
                f"{rec['run_id']:26s} val_f1 {m['val_macro_f1']:.3f} "
                f"best_epoch {h['best_epoch']:2d} {m['train_s']:.0f}s",
                flush=True,
            )
    best = select_best(sweep)
    print(f"\nWinner by mean validation macro-F1: {best}", flush=True)
    if args.skip_final:
        return
    for seed in args.seeds:
        rec = run_one(
            f"lm_main_{best}_s{seed}", best, seed, data, args.epochs, kind="main", eval_test=True
        )
        write_record(rec, args.out)
        m = rec["metrics"]
        print(
            f"{rec['run_id']:26s} val_f1 {m['val_macro_f1']:.3f} "
            f"test_f1 {m['test_macro_f1']:.3f} test_acc {m['test_acc']:.3f}",
            flush=True,
        )


if __name__ == "__main__":
    main()
