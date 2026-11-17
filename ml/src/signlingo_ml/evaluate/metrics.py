"""Evaluation metrics: accuracy, macro-F1, per-class F1, row-normalised CM, top confusions."""
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score


def compute_metrics(y_true, y_pred, labels: list[str], top_k: int = 10) -> dict:
    n = len(labels)
    idx = list(range(n))
    cm = confusion_matrix(y_true, y_pred, labels=idx).astype(float)
    row = cm.sum(axis=1, keepdims=True)
    cm_norm = np.divide(cm, row, out=np.zeros_like(cm), where=row > 0)
    f1 = f1_score(y_true, y_pred, labels=idx, average=None, zero_division=0)
    off = cm_norm.copy()
    np.fill_diagonal(off, 0)
    order = np.argsort(off, axis=None)[::-1][:top_k]
    top = [
        {"true": labels[i // n], "pred": labels[i % n], "rate": float(off.flat[i])}
        for i in order
    ]
    return {
        "acc": float(accuracy_score(y_true, y_pred)),
        "macro_f1": float(f1_score(y_true, y_pred, labels=idx, average="macro", zero_division=0)),
        "per_class_f1": {labels[i]: float(f1[i]) for i in idx},
        "confusion_matrix": {"labels": labels, "matrix": cm_norm.tolist(), "normalized": "row"},
        "top_confusions": top,
    }
