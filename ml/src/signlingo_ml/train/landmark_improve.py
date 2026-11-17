"""Landmark model improvement (P1-19b): engineered features, bigger models, seed ensembles.

Protocol (same as the CNN work; the test part never influences a choice):
  1. feature sweep   - 4 feature kinds x 3 seeds with the default MLP, validation only;
  2. model sweep     - on the best feature kind (by mean validation macro-F1): MLP sizes and
                       gradient boosting, validation only;
  3. ensemble        - average the probabilities of several seeds of the best MLP, validation only;
  4. final           - score the chosen single-model config (3 seeds) and the ensemble on the test
                       part ONCE.
The test part was already scored once for the earlier xy MLP, so this run is not the first look at
it; no decision below uses it. The split is by file order, NOT a signer holdout.
"""

import argparse
import time
from dataclasses import dataclass

import numpy as np
import torch
from sklearn.ensemble import HistGradientBoostingClassifier

from signlingo_ml.config import LABELS, REPORTS, SEED, raw_path
from signlingo_ml.data.access import require_split_access
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.landmarks.dataset import load_keypoint_csv, order_split3
from signlingo_ml.landmarks.features import FEATURE_KINDS, build_features
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

SPLIT_NOTE = "file_order_60_20_20_gap2pct"
# name -> (family, hidden sizes, dropout)
MODELS = {
    "mlp_128_64": ("mlp", (128, 64), 0.2),
    "mlp_256_128": ("mlp", (256, 128), 0.3),
    "mlp_512_256": ("mlp", (512, 256), 0.3),
    "hgb": ("hgb", None, None),
}


@dataclass
class Standardizer:
    """Per-feature standardisation; fit on the TRAINING features only."""

    mean: np.ndarray
    std: np.ndarray

    @classmethod
    def fit(cls, F: np.ndarray) -> "Standardizer":
        return cls(F.mean(axis=0), F.std(axis=0) + 1e-6)

    def transform(self, F: np.ndarray) -> np.ndarray:
        return ((F - self.mean) / self.std).astype(np.float32)


def _softmax(z: np.ndarray) -> np.ndarray:
    e = np.exp(z - z.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def _prepare(data: dict, feature_kind: str):
    """Features for every split, standardised with train statistics."""
    F = {k: build_features(X, feature_kind) for k, (X, _) in data.items()}
    sc = Standardizer.fit(F["train"])
    return {k: sc.transform(v) for k, v in F.items()}, {k: y for k, (_, y) in data.items()}


def _fit(model_name, F, y, seed, epochs, hgb_iters, num_classes):
    """Train one member; returns (predict_proba, params, curves, best_epoch, train_s, model)."""
    family, hidden, dropout = MODELS[model_name]
    t0 = time.perf_counter()
    if family == "mlp":
        set_determinism(seed)
        model = LandmarkMLP(F["train"].shape[1], hidden, num_classes, dropout)
        cfg = TrainConfig(
            lr=1e-3, epochs=epochs, batch_size=256, augment=False, patience=6, seed=seed
        )
        res = train_model(model, F["train"], y["train"], F["val"], y["val"], cfg, num_classes)
        proba = lambda X: _softmax(predict_logits(model, X))
        elapsed = time.perf_counter() - t0
        return proba, count_parameters(model), res.history, res.best_epoch, elapsed, model
    clf = HistGradientBoostingClassifier(
        max_iter=hgb_iters, learning_rate=0.1, early_stopping=False, random_state=seed
    ).fit(F["train"], y["train"])
    return clf.predict_proba, 0, None, hgb_iters, time.perf_counter() - t0, clf


def _record(run_id, kind, tag, name, feature_kind, seed, metrics, hp, details, curves):
    return build_record(
        run_id=run_id, kind=kind, dataset="landmarks", model_name=name,
        feature_set=feature_kind, split_strategy="session_holdout", metrics=metrics,
        hyperparams={"config": tag, "seed": seed, "split": SPLIT_NOTE, **hp},
        details=details, curves=curves, seed=seed,
    )  # fmt: skip


def _score(proba_fn, F, y, labels, eval_test):
    val = compute_metrics(y["val"], proba_fn(F["val"]).argmax(1), labels)
    metrics = {"val_acc": val["acc"], "val_macro_f1": val["macro_f1"]}
    details = None
    if eval_test:
        require_split_access("test", final=True)
        test = compute_metrics(y["test"], proba_fn(F["test"]).argmax(1), labels)
        metrics.update(test_acc=test["acc"], test_macro_f1=test["macro_f1"],
                       error_rate=1.0 - test["acc"])  # fmt: skip
        details = test
    return metrics, details


def run_model(run_id, feature_kind, model_name, seed, data, kind="ablation", eval_test=False,
              epochs=60, hgb_iters=200, num_classes=N_CLASSES) -> dict:  # fmt: skip
    F, y = _prepare(data, feature_kind)
    labels = LABELS if num_classes == len(LABELS) else [str(i) for i in range(num_classes)]
    proba, params, curves, best_epoch, train_s, _model = _fit(
        model_name, F, y, seed, epochs, hgb_iters, num_classes
    )
    metrics, details = _score(proba, F, y, labels, eval_test)
    metrics.update(params=params, train_s=train_s)
    name = "Landmark " + ("gradient boosting" if model_name == "hgb" else "MLP")
    return _record(run_id, kind, f"{feature_kind}__{model_name}", name, feature_kind, seed,
                   metrics, {"model": model_name, "best_epoch": best_epoch}, details, curves)  # fmt: skip


def run_ensemble(run_id, feature_kind, model_name, seeds, data, kind="ablation", eval_test=False,
                 epochs=60, num_classes=N_CLASSES) -> dict:  # fmt: skip
    """Average the class probabilities of one model type trained with several seeds."""
    F, y = _prepare(data, feature_kind)
    labels = LABELS if num_classes == len(LABELS) else [str(i) for i in range(num_classes)]
    members = [_fit(model_name, F, y, s, epochs, 200, num_classes) for s in seeds]
    proba = lambda X: np.mean([m[0](X) for m in members], axis=0)
    metrics, details = _score(proba, F, y, labels, eval_test)
    metrics.update(params=sum(m[1] for m in members), train_s=sum(m[4] for m in members))
    return _record(run_id, kind, f"{feature_kind}__{model_name}__ens{len(seeds)}",
                   f"Landmark {model_name} ensemble", feature_kind, seeds[0], metrics,
                   {"model": model_name, "n_members": len(seeds), "member_seeds": list(seeds)},
                   details, None)  # fmt: skip


def _load():
    X, y, rep = load_keypoint_csv(raw_path("keypoint.csv"))
    split = order_split3(y)
    return {k: (X[split == k], y[split == k]) for k in ("train", "val", "test")}, rep


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Landmark improvement sweeps on keypoint.csv.")
    ap.add_argument("--seeds", nargs="+", type=int, default=[SEED, SEED + 1, SEED + 2])
    ap.add_argument("--ensemble-members", type=int, default=5)
    ap.add_argument("--epochs", type=int, default=60)
    ap.add_argument("--skip-final", action="store_true")
    ap.add_argument("--out", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)
    data, rep = _load()
    print(f"{rep.n_rows} rows | torch threads {torch.get_num_threads()}", flush=True)

    def sweep(kind_feat, models, label):
        recs = []
        for model in models:
            for seed in args.seeds if MODELS[model][0] == "mlp" else args.seeds[:1]:
                rec = run_model(f"lmi_{label}_{kind_feat}__{model}_s{seed}", kind_feat, model,
                                seed, data, epochs=args.epochs)  # fmt: skip
                write_record(rec, args.out)
                recs.append(rec)
                m = rec["metrics"]
                print(f"  {rec['run_id']:46s} val_f1 {m['val_macro_f1']:.3f} {m['train_s']:.0f}s",
                      flush=True)  # fmt: skip
        return recs

    print("== 1. feature sweep (MLP 128-64, validation only)", flush=True)
    feat_recs = []
    for fk in FEATURE_KINDS:
        feat_recs += sweep(fk, ["mlp_128_64"], "feat")
    best_feat = select_best(feat_recs).split("__")[0]
    print(f"best feature kind: {best_feat}\n== 2. model sweep on {best_feat}", flush=True)
    model_recs = sweep(best_feat, list(MODELS), "model")
    best_cfg = select_best(model_recs + [r for r in feat_recs if r["hyperparams"]["config"] ==
                                         f"{best_feat}__mlp_128_64"])  # fmt: skip
    best_model = best_cfg.split("__")[1]
    print(f"best model: {best_model}", flush=True)

    ens = None
    if MODELS[best_model][0] == "mlp":
        seeds = [SEED + i for i in range(args.ensemble_members)]
        ens = run_ensemble(f"lmi_ens_{best_feat}__{best_model}", best_feat, best_model, seeds, data,
                           epochs=args.epochs)  # fmt: skip
        write_record(ens, args.out)
        print(f"== 3. ensemble of {len(seeds)}: val_f1 {ens['metrics']['val_macro_f1']:.3f}",
              flush=True)  # fmt: skip
    if args.skip_final:
        return
    print("== 4. final (test part scored once)", flush=True)
    for seed in args.seeds if MODELS[best_model][0] == "mlp" else args.seeds[:1]:
        rec = run_model(f"lmi_main_{best_feat}__{best_model}_s{seed}", best_feat, best_model,
                        seed, data, kind="main", eval_test=True, epochs=args.epochs)  # fmt: skip
        write_record(rec, args.out)
        m = rec["metrics"]
        print(f"  {rec['run_id']:46s} val_f1 {m['val_macro_f1']:.3f} test_f1 {m['test_macro_f1']:.3f}"
              f" test_acc {m['test_acc']:.3f}", flush=True)  # fmt: skip
    if ens is not None:
        rec = run_ensemble(f"lmi_main_{best_feat}__{best_model}__ens", best_feat, best_model,
                           [SEED + i for i in range(args.ensemble_members)], data, kind="main",
                           eval_test=True, epochs=args.epochs)  # fmt: skip
        write_record(rec, args.out)
        m = rec["metrics"]
        print(f"  ensemble: val_f1 {m['val_macro_f1']:.3f} test_f1 {m['test_macro_f1']:.3f}"
              f" test_acc {m['test_acc']:.3f}", flush=True)  # fmt: skip


if __name__ == "__main__":
    main()
