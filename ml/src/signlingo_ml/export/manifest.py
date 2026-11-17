"""Model manifest and index builders (P1-23); contract: docs/04 §3, shared/contracts/schemas."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from signlingo_ml.config import SEED

PREPROCESS_VERSION = "lm-v1"
DEFAULT_RECOMMENDED = {"threshold": 0.6, "hold_ms": 1000, "smoothing_window": 5}


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def build_manifest(
    *,
    model_id: str,
    version: str,
    onnx_path: str | Path,
    labels: list[str],
    class_templates: dict,
    confusable: dict,
    metrics: dict,
    seed: int = SEED,
    git_commit: str = "unknown",
    recommended: dict | None = None,
    trained_at: str | None = None,
) -> dict:
    """Manifest for a landmark graph: input = 42 lm-v1 numbers, output = class probabilities.

    `metrics` must contain only numbers that were measured (copied from experiment records); a
    metric that was not measured (e.g. signer-holdout) is simply absent, never a placeholder.
    """
    path = Path(onnx_path)
    return {
        "model_id": model_id,
        "version": version,
        "task": "static_letters",
        "file": path.name,
        "sha256": sha256_file(path),
        "input": {"name": "x", "shape": [1, 42], "dtype": "float32", "features": "xy"},
        "output": {"name": "probs", "shape": [1, len(labels)]},
        "labels": list(labels),
        "preprocess_version": PREPROCESS_VERSION,
        "recommended": recommended or dict(DEFAULT_RECOMMENDED),
        "class_templates": class_templates,
        "confusable": confusable,
        "metrics": metrics,
        "trained_at": trained_at or datetime.now(UTC).isoformat(),
        "git_commit": git_commit,
        "seed": seed,
    }


def build_index(manifests: list[dict], active: dict[str, str]) -> dict:
    """`models/index.json`: which models exist and which one each task loads."""
    keys = [f"{m['model_id']}-{m['version']}" for m in manifests]
    for task, key in active.items():
        if key not in keys:
            raise ValueError(f"active model {key!r} for task {task!r} is not in {keys}")
    return {"schema_version": 1, "active": dict(active), "available": keys}


def write_json(obj: dict, path: str | Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")
    return path
