"""Experiment records: dict conforming to shared/contracts/schemas/experiment.schema.json."""
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from signlingo_ml.config import REPORTS, SEED


def _git_commit() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True
        )
        return out.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def build_record(*, run_id, kind, dataset, model_name, feature_set, split_strategy,
                 metrics, hyperparams=None, details=None, curves=None, seed=SEED) -> dict:
    rec = {
        "run_id": run_id, "kind": kind, "dataset": dataset, "model_name": model_name,
        "feature_set": feature_set, "split_strategy": split_strategy,
        "hyperparams": hyperparams or {}, "metrics": metrics,
        "git_commit": _git_commit(), "seed": seed,
        "run_at": datetime.now(UTC).isoformat(),
    }
    if details:
        rec["confusion_matrix"] = details["confusion_matrix"]
        rec["per_class_f1"] = details["per_class_f1"]
        rec["top_confusions"] = details["top_confusions"]
    if curves:
        rec["curves"] = curves
    return rec


def write_record(rec: dict, out_dir: Path | None = None) -> Path:
    out = Path(out_dir) if out_dir else REPORTS / "experiments"
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"{rec['run_id']}.json"
    path.write_text(json.dumps(rec, indent=2, ensure_ascii=False), encoding="utf-8")
    return path
