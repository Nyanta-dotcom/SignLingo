"""CNN trainer (P1-12).

Adam + cosine learning-rate decay + cross-entropy with label smoothing. The epoch (early
stopping, best weights) is chosen on VALIDATION macro-F1 only; the official test split is read
solely when `eval_test=True`, after training, and never influences any choice.

All default values below are starting hypotheses, not verified facts; P1-13 compares
configurations on the validation split.
"""

import copy
import time
from dataclasses import asdict, dataclass, field

import numpy as np
import torch
from sklearn.metrics import f1_score
from torch import nn

from signlingo_ml.config import LABELS, SEED
from signlingo_ml.data.access import require_split_access
from signlingo_ml.evaluate.logger import build_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.features.augment import augment_batch
from signlingo_ml.models.cnn import SmallCNN, count_parameters

N_CLASSES = len(LABELS)


@dataclass
class TrainConfig:
    lr: float = 1e-3
    epochs: int = 15
    batch_size: int = 128
    weight_decay: float = 1e-4
    label_smoothing: float = 0.05
    augment: bool = True
    patience: int = 3
    seed: int = SEED


@dataclass
class TrainResult:
    history: dict = field(default_factory=dict)
    best_epoch: int = 0
    stopped_early: bool = False
    train_s: float = 0.0


def set_determinism(seed: int) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.use_deterministic_algorithms(True)


@torch.no_grad()
def predict_logits(model: nn.Module, X: np.ndarray, batch: int = 1024) -> np.ndarray:
    model.eval()
    out = [
        model(torch.from_numpy(np.ascontiguousarray(X[i : i + batch], dtype=np.float32))).numpy()
        for i in range(0, len(X), batch)
    ]
    return np.concatenate(out) if out else np.empty((0, 0), dtype=np.float32)


def _macro_f1(y, pred, n: int) -> float:
    return float(f1_score(y, pred, labels=range(n), average="macro", zero_division=0))


def train_model(model, X_tr, y_tr, X_val, y_val, cfg: TrainConfig, num_classes=N_CLASSES):
    """Train `model` in place; on return it holds the best-validation-F1 weights."""
    set_determinism(cfg.seed)
    opt = torch.optim.Adam(model.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(cfg.epochs, 1))
    loss_fn = nn.CrossEntropyLoss(label_smoothing=cfg.label_smoothing)
    y_t = torch.from_numpy(np.asarray(y_tr, dtype=np.int64))

    hist = {"epoch": [], "train_loss": [], "val_macro_f1": [], "val_acc": []}
    best_f1, best_state, best_epoch, bad = -1.0, None, 0, 0
    stopped = False
    t0 = time.perf_counter()
    for epoch in range(1, cfg.epochs + 1):
        X_ep = (
            augment_batch(X_tr, seed=cfg.seed * 1000 + epoch) if cfg.augment else X_tr
        )  # a new augmentation draw every epoch
        gen = torch.Generator().manual_seed(cfg.seed * 1000 + epoch)
        perm = torch.randperm(len(X_ep), generator=gen)
        model.train()
        total, seen = 0.0, 0
        for i in range(0, len(perm), cfg.batch_size):
            idx = perm[i : i + cfg.batch_size]
            xb = torch.from_numpy(np.ascontiguousarray(X_ep[idx.numpy()], dtype=np.float32))
            loss = loss_fn(model(xb), y_t[idx])
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
            seen += len(idx)
        sched.step()

        pred = predict_logits(model, X_val).argmax(1)
        f1 = _macro_f1(y_val, pred, num_classes)
        hist["epoch"].append(epoch)
        hist["train_loss"].append(total / seen)
        hist["val_macro_f1"].append(f1)
        hist["val_acc"].append(float((pred == np.asarray(y_val)).mean()))
        if f1 > best_f1 + 1e-9:
            best_f1, best_epoch, bad = f1, epoch, 0
            best_state = copy.deepcopy(model.state_dict())
        else:
            bad += 1
            if bad >= cfg.patience:
                stopped = True
                break
    model.load_state_dict(best_state)
    return TrainResult(hist, best_epoch, stopped, time.perf_counter() - t0)


def _latency_ms(model: nn.Module, X: np.ndarray, n: int = 200) -> float:
    """Mean single-image CPU forward time in ms (PyTorch eager, not the browser)."""
    t0 = time.perf_counter()
    for i in range(min(n, len(X))):
        predict_logits(model, X[i : i + 1])
    return (time.perf_counter() - t0) / min(n, len(X)) * 1000.0


def run_cnn(
    run_id,
    cfg: TrainConfig,
    X_tr,
    y_tr,
    X_val,
    y_val,
    X_test=None,
    y_test=None,
    eval_test=False,
    num_classes=N_CLASSES,
    model_kwargs=None,
    kind="main",
    tag=None,
) -> dict:
    """Train one configuration and return an experiment record (see experiment.schema.json)."""
    kw = model_kwargs or {}
    set_determinism(cfg.seed)  # same seed -> same initial weights
    model = SmallCNN(num_classes=num_classes, **kw)
    res = train_model(model, X_tr, y_tr, X_val, y_val, cfg, num_classes)
    labels = LABELS if num_classes == len(LABELS) else [str(i) for i in range(num_classes)]
    val = compute_metrics(y_val, predict_logits(model, X_val).argmax(1), labels)
    metrics = {
        "val_acc": val["acc"],
        "val_macro_f1": val["macro_f1"],
        "params": count_parameters(model),
        "latency_ms": _latency_ms(model, X_val),
        "train_s": res.train_s,
    }
    details = None
    if eval_test:
        require_split_access("test", final=True)
        test = compute_metrics(y_test, predict_logits(model, X_test).argmax(1), labels)
        metrics.update(
            test_acc=test["acc"], test_macro_f1=test["macro_f1"], error_rate=1.0 - test["acc"]
        )
        details = test
    name = "CNN + augmentation" if cfg.augment else "CNN"
    return build_record(
        run_id=run_id,
        kind=kind,
        dataset="sign_mnist",
        model_name=name,
        feature_set="pixels_28x28",
        split_strategy="group_ward70",
        metrics=metrics,
        hyperparams={
            **asdict(cfg),
            **kw,
            "best_epoch": res.best_epoch,
            "stopped_early": res.stopped_early,
            **({"config": tag} if tag else {}),
        },
        details=details,
        curves=res.history,
        seed=cfg.seed,
    )
