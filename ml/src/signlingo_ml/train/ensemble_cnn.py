"""Seed ensemble of the image CNN: average the class probabilities of several seeds.

Pre-declared rule: the ensemble is preferred over a single model when its validation macro-F1 is
at least the mean validation macro-F1 of its members. The test split is scored only when
`eval_test=True` and never influences that choice.
"""

import argparse
import time

import numpy as np

from signlingo_ml.config import DATA_PROCESSED, LABELS, REPORTS, SEED, raw_path
from signlingo_ml.data.access import require_split_access
from signlingo_ml.data.load import load_kaggle_csv
from signlingo_ml.data.quality import clean
from signlingo_ml.data.split import load_or_make_split, split_indices
from signlingo_ml.data.transform import transform
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.models.cnn import SmallCNN, count_parameters
from signlingo_ml.train.run_cnn import config_tag, parse_tag, resolve
from signlingo_ml.train.trainer import N_CLASSES, predict_logits, set_determinism, train_model


def _softmax(z: np.ndarray) -> np.ndarray:
    e = np.exp(z - z.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def run_cnn_ensemble(
    run_id, name, epochs, seeds, X_tr, y_tr, X_val, y_val, X_test=None, y_test=None,
    eval_test=False, num_classes=N_CLASSES, kind="main",
) -> dict:  # fmt: skip
    labels = LABELS if num_classes == len(LABELS) else [str(i) for i in range(num_classes)]
    members, member_f1, params, t0 = [], [], 0, time.perf_counter()
    for seed in seeds:
        cfg, kw = resolve(name, seed, epochs)
        set_determinism(seed)
        model = SmallCNN(num_classes=num_classes, **kw)
        train_model(model, X_tr, y_tr, X_val, y_val, cfg, num_classes)
        members.append(model)
        params += count_parameters(model)
        member_f1.append(
            compute_metrics(y_val, predict_logits(model, X_val).argmax(1), labels)["macro_f1"]
        )
    train_s = time.perf_counter() - t0

    def proba(X):
        return np.mean([_softmax(predict_logits(m, X)) for m in members], axis=0)

    val = compute_metrics(y_val, proba(X_val).argmax(1), labels)
    metrics = {
        "val_acc": val["acc"],
        "val_macro_f1": val["macro_f1"],
        "params": params,
        "train_s": train_s,
    }
    details = None
    if eval_test:
        require_split_access("test", final=True)
        test = compute_metrics(y_test, proba(X_test).argmax(1), labels)
        metrics.update(
            test_acc=test["acc"], test_macro_f1=test["macro_f1"], error_rate=1.0 - test["acc"]
        )
        details = test
    tag = config_tag(name, epochs)
    return build_record(
        run_id=run_id,
        kind=kind,
        dataset="sign_mnist",
        model_name=f"CNN {tag} ensemble",
        feature_set="pixels_28x28",
        split_strategy="group_ward70",
        metrics=metrics,
        hyperparams={
            "config": f"{tag}__ens{len(seeds)}",
            "n_members": len(seeds),
            "member_seeds": list(seeds),
            "member_val_macro_f1": member_f1,
            "mean_member_val_macro_f1": float(np.mean(member_f1)),
            "epochs": epochs,
        },
        details=details,
        seed=seeds[0],
    )


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="CNN seed ensemble on the real Kaggle data.")
    ap.add_argument("--tag", required=True, help="config tag chosen on validation, e.g. wide_e30")
    ap.add_argument("--members", type=int, default=5)
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)
    name, epochs = parse_tag(args.tag)

    X, y = transform(clean(load_kaggle_csv(raw_path("sign_mnist_train.csv"))))
    Xt, yt = transform(clean(load_kaggle_csv(raw_path("sign_mnist_test.csv"))))
    table = load_or_make_split(X, y, DATA_PROCESSED / "split_v1.parquet")
    tr, va = split_indices(table, "train"), split_indices(table, "val")
    seeds = [SEED + i for i in range(args.members)]
    rec = run_cnn_ensemble(
        f"cnn_ens_{args.tag}_n{len(seeds)}", name, epochs, seeds, X[tr], y[tr], X[va], y[va],
        Xt, yt, eval_test=True, kind="main",
    )  # fmt: skip
    write_record(rec, args.out)
    m, h = rec["metrics"], rec["hyperparams"]
    print(
        f"ensemble {args.tag} x{len(seeds)}: val_f1 {m['val_macro_f1']:.3f} "
        f"(members' mean {h['mean_member_val_macro_f1']:.3f}) | "
        f"test_f1 {m['test_macro_f1']:.3f} test_acc {m['test_acc']:.3f}",
        flush=True,
    )


if __name__ == "__main__":
    main()
