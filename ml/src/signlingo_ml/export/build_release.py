"""Build the landmark release artifact: train the ensemble, export ONNX, verify, write manifest.

Trains the SAME configuration and seeds as the experiment record it is checked against
(`lmi_ens_xy_dist_ang__mlp_512_256`), on the TRAIN part only, so the deployed model is the model
whose numbers were reported. Safety checks that abort the build:
  * ONNX output must match the torch graph within 1e-4 on 256 validation rows (AC-ML-08);
  * the ONNX validation macro-F1 must equal the recorded one (the exported model IS the
    evaluated model), otherwise the build stops instead of publishing a different model.
The test part is not read here: manifest metrics are copied from the experiment records.
"""

import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
import torch

from signlingo_ml.config import ARTIFACTS, LABELS, REPORTS, SEED
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.export.landmark_graph import LandmarkEnsembleGraph
from signlingo_ml.export.manifest import build_manifest, write_json
from signlingo_ml.export.onnx_export import export_onnx, max_abs_diff, onnx_predict
from signlingo_ml.landmarks.features import build_features
from signlingo_ml.landmarks.templates import class_templates, confusable_from_matrix
from signlingo_ml.train.landmark_improve import MODELS, Standardizer, _fit, _load

MODEL_ID, VERSION = "landmark-mlp-ens5", "1.0.0"
FEATURE_KIND, MODEL_NAME, N_MEMBERS, EPOCHS = "xy_dist_ang", "mlp_512_256", 5, 60
RECORD_ID = f"lmi_ens_{FEATURE_KIND}__{MODEL_NAME}"  # validation record of this exact ensemble
FINAL_ID = f"lmi_main_{FEATURE_KIND}__{MODEL_NAME}__ens"  # the test numbers reported for it
VAL_TOLERANCE = 1e-3  # recorded vs rebuilt validation macro-F1


def _git_commit() -> str:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def build_release(out_dir: Path, experiments: Path) -> dict:
    data, _ = _load()
    raw = {k: v[0] for k, v in data.items()}
    y = {k: v[1] for k, v in data.items()}
    feats = {k: build_features(v, FEATURE_KIND) for k, v in raw.items()}
    scaler = Standardizer.fit(feats["train"])  # train statistics only
    F = {k: scaler.transform(v) for k, v in feats.items()}

    assert MODELS[MODEL_NAME][0] == "mlp"
    members = []
    for i in range(N_MEMBERS):
        out = _fit(MODEL_NAME, F, y, SEED + i, EPOCHS, 200, len(LABELS))
        members.append(out[5].eval())
        print(f"  member {i + 1}/{N_MEMBERS} trained (best epoch {out[3]})", flush=True)

    graph = LandmarkEnsembleGraph(members, scaler.mean, scaler.std)
    onnx_path = export_onnx(graph, out_dir / f"{MODEL_ID}-{VERSION}.onnx")

    parity = max_abs_diff(graph, onnx_path, raw["val"][:256])
    assert parity <= 1e-4, f"ONNX differs from torch by {parity:.2e} (> 1e-4)"
    val_probs = onnx_predict(onnx_path, raw["val"])
    val = compute_metrics(y["val"], val_probs.argmax(1), LABELS)

    recorded = json.loads((experiments / f"{RECORD_ID}.json").read_text(encoding="utf-8"))
    diff = abs(val["macro_f1"] - recorded["metrics"]["val_macro_f1"])
    assert diff <= VAL_TOLERANCE, (
        f"rebuilt ensemble val macro-F1 {val['macro_f1']:.4f} != recorded "
        f"{recorded['metrics']['val_macro_f1']:.4f}: not the evaluated model"
    )
    final = json.loads((experiments / f"{FINAL_ID}.json").read_text(encoding="utf-8"))
    metrics = {
        "val_macro_f1": recorded["metrics"]["val_macro_f1"],
        "test_macro_f1": final["metrics"]["test_macro_f1"],
        "test_acc": final["metrics"]["test_acc"],
    }
    templates = class_templates(raw["train"], y["train"], LABELS)
    confusable = confusable_from_matrix(np.array(val["confusion_matrix"]["matrix"]), LABELS)
    manifest = build_manifest(
        model_id=MODEL_ID, version=VERSION, onnx_path=onnx_path, labels=LABELS,
        class_templates=templates, confusable=confusable, metrics=metrics,
        git_commit=_git_commit(),
    )  # fmt: skip
    manifest["evaluation_note"] = (
        "Metrics are on keypoint.csv split by file order (train|gap|val|gap|test); this is NOT a "
        "signer holdout and is optimistic for real webcam use."
    )
    write_json(manifest, out_dir / f"{MODEL_ID}-{VERSION}.manifest.json")
    return {"parity": parity, "val_diff": diff, "bytes": onnx_path.stat().st_size,
            "manifest": manifest}  # fmt: skip


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Build the landmark ONNX release.")
    ap.add_argument("--out", default=str(ARTIFACTS))
    ap.add_argument("--experiments", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)
    torch.set_num_threads(torch.get_num_threads())
    r = build_release(Path(args.out), Path(args.experiments))
    m = r["manifest"]
    print(
        f"ONNX {r['bytes'] / 1e6:.2f} MB | torch-vs-onnx max diff {r['parity']:.2e} | "
        f"val F1 vs record diff {r['val_diff']:.2e} | sha256 {m['sha256'][:12]}...",
        flush=True,
    )


if __name__ == "__main__":
    main()
