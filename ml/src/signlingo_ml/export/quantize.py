"""Dynamic int8 quantization of the landmark ONNX model (P4-05).

The quantized file is only a candidate: it is accepted when its VALIDATION macro-F1 is at most
`MAX_F1_DROP` below the float model's. The test part is never read here. Timings are measurements
on the machine that ran this script, recorded as such.
"""

import argparse
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic

from signlingo_ml.config import ARTIFACTS, LABELS, REPORTS
from signlingo_ml.evaluate.logger import build_record, write_record
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.export.onnx_export import onnx_predict

MAX_F1_DROP = 0.005
RECORD_ID = "quant_int8_landmark_ens5"


def quantize_int8(src: str | Path, dst: str | Path) -> Path:
    """Weights to int8 (per tensor), activations stay float: no calibration data needed."""
    dst = Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    quantize_dynamic(str(src), str(dst), weight_type=QuantType.QInt8)
    return dst


def _latency_ms(path: str | Path, X: np.ndarray, runs: int = 300) -> float:
    """Median time of one single-row inference on the CPU provider (this machine)."""
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    row = np.ascontiguousarray(X[:1], dtype=np.float32)
    for _ in range(20):
        session.run(["probs"], {"x": row})
    times = []
    for _ in range(runs):
        t = time.perf_counter()
        session.run(["probs"], {"x": row})
        times.append((time.perf_counter() - t) * 1000)
    return float(np.median(times))


def compare(fp32: str | Path, int8: str | Path, X_val: np.ndarray, y_val: np.ndarray) -> dict:
    """Validation-only comparison of the two ONNX files."""
    p32, p8 = onnx_predict(fp32, X_val), onnx_predict(int8, X_val)
    m32 = compute_metrics(y_val, p32.argmax(1), LABELS)
    m8 = compute_metrics(y_val, p8.argmax(1), LABELS)
    drop = m32["macro_f1"] - m8["macro_f1"]
    return {
        "fp32_val_macro_f1": m32["macro_f1"], "int8_val_macro_f1": m8["macro_f1"],
        "f1_drop": drop, "max_allowed_drop": MAX_F1_DROP, "accepted": bool(drop <= MAX_F1_DROP),
        "argmax_agreement": float((p32.argmax(1) == p8.argmax(1)).mean()),
        "max_abs_prob_diff": float(np.abs(p32 - p8).max()),
        "fp32_bytes": Path(fp32).stat().st_size, "int8_bytes": Path(int8).stat().st_size,
        "fp32_latency_ms_median": _latency_ms(fp32, X_val),
        "int8_latency_ms_median": _latency_ms(int8, X_val),
        "n_val_rows": len(y_val),
    }  # fmt: skip


def main(argv=None) -> None:
    from signlingo_ml.train.landmark_improve import _load  # lazy: needs keypoint.csv

    ap = argparse.ArgumentParser(description="Quantize the landmark ONNX model to int8 and check it.")
    ap.add_argument("--src", default=str(ARTIFACTS.parent.parent / "frontend/public/models/landmark-mlp-ens5-1.0.0.onnx"))
    ap.add_argument("--out", default=str(ARTIFACTS / "landmark-mlp-ens5-1.0.0.int8.onnx"))
    ap.add_argument("--experiments", default=str(REPORTS / "experiments"))
    args = ap.parse_args(argv)
    data, _ = _load()
    X_val, y_val = data["val"]
    out = quantize_int8(args.src, args.out)
    r = compare(args.src, out, X_val, y_val)
    rec = build_record(
        run_id=RECORD_ID, kind="ablation", dataset="landmarks", model_name="Landmark ensemble int8 (dynamic)",
        feature_set="xy_dist_ang", split_strategy="session_holdout",
        metrics={"val_macro_f1": r["int8_val_macro_f1"], "params": 0},
        hyperparams={"source": Path(args.src).name, "weight_type": "QInt8", "mode": "dynamic", **r},
    )  # fmt: skip
    write_record(rec, args.experiments)
    verdict = "ACCEPTED" if r["accepted"] else "REJECTED"
    print(
        f"{verdict}: val macro-F1 {r['fp32_val_macro_f1']:.4f} -> {r['int8_val_macro_f1']:.4f} "
        f"(drop {r['f1_drop']:+.4f}, allowed {MAX_F1_DROP}) | size {r['fp32_bytes'] / 1e6:.2f} -> "
        f"{r['int8_bytes'] / 1e6:.2f} MB | latency {r['fp32_latency_ms_median']:.3f} -> "
        f"{r['int8_latency_ms_median']:.3f} ms | argmax agreement {r['argmax_agreement']:.4f}"
    )


if __name__ == "__main__":
    main()
