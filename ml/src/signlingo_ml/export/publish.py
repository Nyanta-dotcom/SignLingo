"""Publish model artifacts and experiment results to frontend/public (P1-24; docs/03 §5).

Copies `*.onnx` + `*.manifest.json` into `public/models/` and writes `models/index.json`; copies
experiment JSON into `public/data/experiments/` and writes its `index.json`. A model version that
is already published is immutable: publishing different bytes under the same name is an error
(the app caches model files forever by name).
"""

import argparse
import json
import shutil
from datetime import UTC, datetime
from pathlib import Path

from signlingo_ml.config import ARTIFACTS, REPORTS, ROOT
from signlingo_ml.export.manifest import build_index, sha256_file, write_json

DEFAULT_PUBLIC = ROOT.parent / "frontend" / "public"


def build_experiment_index(records: list[dict]) -> dict:
    runs, leak = [], []
    for r in records:
        if r["kind"] == "leakage_study":
            d = r.get("diagnostics", {})
            item = {
                "run_id": r["run_id"],
                "model_name": r["model_name"],
                "split_strategy": r["split_strategy"],
                "val_acc": r["metrics"]["val_acc"],
            }
            if "test_acc" in r["metrics"]:
                item["test_acc"] = r["metrics"]["test_acc"]
            if "val_test_gap" in d:
                item["val_test_gap"] = d["val_test_gap"]
            if "nn_dist_val_to_train" in d:
                item["nn_dist_val_to_train"] = d["nn_dist_val_to_train"]["median"]
            leak.append(item)
            continue
        row = {
            k: r[k]
            for k in ("run_id", "kind", "dataset", "model_name", "feature_set", "split_strategy")
        }
        row["metrics"] = r["metrics"]
        if r.get("hyperparams", {}).get("config"):
            row["config"] = r["hyperparams"]["config"]
        runs.append(row)
    return {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "datasets": sorted({r["dataset"] for r in records}),
        "runs": sorted(runs, key=lambda r: r["run_id"]),
        "leakage_study": sorted(leak, key=lambda r: r["run_id"]),
    }


def _copy_immutable(src: Path, dst: Path) -> None:
    if dst.exists():
        if sha256_file(dst) != sha256_file(src):
            raise ValueError(f"{dst.name} is already published with different content")
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def publish(artifacts: Path, experiments: Path, public: Path) -> dict:
    models_dir = public / "models"
    manifests = []
    for mf in sorted(artifacts.glob("*.manifest.json")):
        manifest = json.loads(mf.read_text(encoding="utf-8"))
        onnx = artifacts / manifest["file"]
        if sha256_file(onnx) != manifest["sha256"]:
            raise ValueError(f"{onnx.name}: sha256 does not match its manifest")
        _copy_immutable(onnx, models_dir / onnx.name)
        _copy_immutable(mf, models_dir / mf.name)
        manifests.append(manifest)
    active = {m["task"]: f"{m['model_id']}-{m['version']}" for m in manifests}
    write_json(build_index(manifests, active), models_dir / "index.json")

    out = public / "data" / "experiments"
    out.mkdir(parents=True, exist_ok=True)
    records = []
    for f in sorted(experiments.glob("*.json")):
        shutil.copy2(f, out / f.name)
        records.append(json.loads(f.read_text(encoding="utf-8")))
    write_json(build_experiment_index(records), out / "index.json")
    return {"models": [f"{m['model_id']}-{m['version']}" for m in manifests], "runs": len(records)}


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Publish artifacts to frontend/public.")
    ap.add_argument("--artifacts", default=str(ARTIFACTS))
    ap.add_argument("--experiments", default=str(REPORTS / "experiments"))
    ap.add_argument("--public", default=str(DEFAULT_PUBLIC))
    args = ap.parse_args(argv)
    r = publish(Path(args.artifacts), Path(args.experiments), Path(args.public))
    print(f"published models {r['models']} and {r['runs']} experiment files to {args.public}")


if __name__ == "__main__":
    main()
