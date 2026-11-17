"""CNN sweep (P1-13): one-factor-at-a-time around a base configuration.

Protocol (so the test set never influences a choice):
  1. every configuration x every seed is trained and scored on VALIDATION only;
  2. the winner is the configuration with the highest MEAN validation macro-F1 over seeds;
  3. only then is the winner re-trained (identical seeds -> identical models) and scored once
     on the official test split.
All values in the grid are starting hypotheses to be compared here, not verified facts.
"""

import argparse
from collections import defaultdict

import numpy as np

from signlingo_ml.config import DATA_PROCESSED, REPORTS, SEED, raw_path
from signlingo_ml.data.load import load_kaggle_csv
from signlingo_ml.data.quality import clean
from signlingo_ml.data.split import load_or_make_split, split_indices
from signlingo_ml.data.transform import transform
from signlingo_ml.evaluate.logger import write_record
from signlingo_ml.train.trainer import TrainConfig, run_cnn

BASE = {
    "train": {"lr": 1e-3, "augment": True},
    "model": {"dropout": 0.3, "channels": (16, 32), "hidden": 128},
}
# name -> (TrainConfig overrides, SmallCNN overrides)
CONFIGS = {
    "base": ({}, {}),
    "no_aug": ({"augment": False}, {}),
    "lr_3e-3": ({"lr": 3e-3}, {}),
    "dropout_0.5": ({}, {"dropout": 0.5}),
    "wide": ({}, {"channels": (32, 64), "hidden": 256}),
}


def resolve(name: str, seed: int, epochs: int) -> tuple[TrainConfig, dict]:
    train_over, model_over = CONFIGS[name]
    cfg = TrainConfig(**{**BASE["train"], **train_over}, epochs=epochs, seed=seed)
    return cfg, {**BASE["model"], **model_over}


def select_best(records: list[dict]) -> str:
    """Config with the highest mean validation macro-F1 over seeds (ties: alphabetical)."""
    by = defaultdict(list)
    for r in records:
        by[r["hyperparams"]["config"]].append(r["metrics"]["val_macro_f1"])
    return min(by, key=lambda name: (-float(np.mean(by[name])), name))


DEFAULT_EPOCHS = 15


def config_tag(name: str, epochs: int) -> str:
    """Tag for a config at a given epoch budget; the original 15-epoch runs keep their old tag."""
    return name if epochs == DEFAULT_EPOCHS else f"{name}_e{epochs}"


def parse_tag(tag: str) -> tuple[str, int]:
    base, sep, tail = tag.rpartition("_e")
    if sep and tail.isdigit() and base in CONFIGS:
        return base, int(tail)
    return tag, DEFAULT_EPOCHS


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="CNN sweep on the real Kaggle data.")
    ap.add_argument("--seeds", nargs="+", type=int, default=[SEED, SEED + 1, SEED + 2])
    ap.add_argument("--epochs", type=int, default=DEFAULT_EPOCHS)
    ap.add_argument("--configs", nargs="+", default=list(CONFIGS), choices=list(CONFIGS))
    ap.add_argument("--skip-final", action="store_true", help="sweep only; never read the test set")
    ap.add_argument(
        "--final-only",
        metavar="TAG",
        help="skip the sweep: train config TAG (e.g. wide_e30) and score the test split once",
    )
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)

    X, y = transform(clean(load_kaggle_csv(raw_path("sign_mnist_train.csv"))))
    Xt, yt = transform(clean(load_kaggle_csv(raw_path("sign_mnist_test.csv"))))
    table = load_or_make_split(X, y, DATA_PROCESSED / "split_v1.parquet")
    tr, va = split_indices(table, "train"), split_indices(table, "val")

    def final(best_tag: str) -> None:
        name, epochs = parse_tag(best_tag)
        for seed in args.seeds:
            cfg, kw = resolve(name, seed, epochs)
            rec = run_cnn(
                f"cnn_main_{best_tag}_s{seed}", cfg, X[tr], y[tr], X[va], y[va], Xt, yt,
                eval_test=True, model_kwargs=kw, kind="main", tag=best_tag,
            )
            write_record(rec, args.out)
            m = rec["metrics"]
            print(
                f"{rec['run_id']:28s} val_f1 {m['val_macro_f1']:.3f} "
                f"test_f1 {m['test_macro_f1']:.3f} test_acc {m['test_acc']:.3f}",
                flush=True,
            )

    if args.final_only:
        final(args.final_only)
        return

    print(
        f"train {len(tr)} val {len(va)} | {len(args.configs)} configs x {len(args.seeds)} seeds"
        f" x {args.epochs} epochs",
        flush=True,
    )
    sweep = []
    for name in args.configs:
        tag = config_tag(name, args.epochs)
        for seed in args.seeds:
            cfg, kw = resolve(name, seed, args.epochs)
            rec = run_cnn(
                f"cnn_sweep_{tag}_s{seed}", cfg, X[tr], y[tr], X[va], y[va],
                model_kwargs=kw, kind="ablation", tag=tag,
            )
            write_record(rec, args.out)
            sweep.append(rec)
            m, h = rec["metrics"], rec["hyperparams"]
            print(
                f"{rec['run_id']:28s} val_f1 {m['val_macro_f1']:.3f} best_epoch {h['best_epoch']:2d}"
                f" params {m['params']} {m['train_s']:.0f}s",
                flush=True,
            )

    best = select_best(sweep)
    print(f"\nWinner by mean validation macro-F1 (this sweep only): {best}", flush=True)
    if not args.skip_final:
        final(best)


if __name__ == "__main__":
    main()
