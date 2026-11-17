"""ONNX export and parity checks (P1-22, AC-ML-08)."""

from pathlib import Path

import numpy as np
import onnxruntime as ort
import torch

OPSET = 17


def export_onnx(graph: torch.nn.Module, path: str | Path) -> Path:
    """Export with a dynamic batch axis: input `x` (B, 42) -> output `probs` (B, 24)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    graph.eval()
    torch.onnx.export(
        graph,
        torch.zeros(1, 42),
        str(path),
        input_names=["x"],
        output_names=["probs"],
        dynamic_axes={"x": {0: "batch"}, "probs": {0: "batch"}},
        opset_version=OPSET,
        dynamo=False,  # the legacy exporter needs no extra dependency and is verified below
    )
    return path


def onnx_predict(path: str | Path, X: np.ndarray) -> np.ndarray:
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    return session.run(["probs"], {"x": np.ascontiguousarray(X, dtype=np.float32)})[0]


def max_abs_diff(graph: torch.nn.Module, path: str | Path, X: np.ndarray) -> float:
    """Largest absolute difference between the torch graph and the ONNX file on rows X."""
    with torch.no_grad():
        ref = graph.eval()(torch.from_numpy(np.ascontiguousarray(X, dtype=np.float32))).numpy()
    return float(np.abs(onnx_predict(path, X) - ref).max())
