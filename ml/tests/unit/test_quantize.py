import numpy as np
import pytest
import torch
from torch import nn

from signlingo_ml.config import LABELS
from signlingo_ml.evaluate.metrics import compute_metrics
from signlingo_ml.export.onnx_export import export_onnx
from signlingo_ml.export.quantize import MAX_F1_DROP, compare, quantize_int8

pytest.importorskip("onnxruntime")


class Tiny(nn.Module):
    """42 -> 64 -> 24 softmax, like the head of the real graph (input x, output probs)."""

    def __init__(self):
        super().__init__()
        torch.manual_seed(0)
        self.net = nn.Sequential(nn.Linear(42, 64), nn.ReLU(), nn.Linear(64, 24))

    def forward(self, x):
        return torch.softmax(self.net(x), dim=1)


@pytest.fixture()
def files(tmp_path):
    fp32 = export_onnx(Tiny(), tmp_path / "m.onnx")
    int8 = quantize_int8(fp32, tmp_path / "m.int8.onnx")
    return fp32, int8


def test_quantized_file_is_smaller_and_keeps_the_input_output_contract(files):
    import onnxruntime as ort

    fp32, int8 = files
    assert int8.stat().st_size < fp32.stat().st_size
    session = ort.InferenceSession(str(int8), providers=["CPUExecutionProvider"])
    assert [i.name for i in session.get_inputs()] == ["x"]
    assert [o.name for o in session.get_outputs()] == ["probs"]
    out = session.run(["probs"], {"x": np.zeros((3, 42), dtype=np.float32)})[0]
    assert out.shape == (3, 24)
    assert np.allclose(out.sum(1), 1, atol=1e-4)


def test_compare_reports_a_drop_agreement_and_the_accept_decision(files):
    fp32, int8 = files
    rng = np.random.default_rng(42)
    X = rng.normal(size=(400, 42)).astype(np.float32)
    # labels = the float model's own predictions, so any F1 drop is purely due to quantization
    import onnxruntime as ort

    y = ort.InferenceSession(str(fp32), providers=["CPUExecutionProvider"]).run(["probs"], {"x": X})[0].argmax(1)
    r = compare(fp32, int8, X, y)
    perfect = compute_metrics(y, y, LABELS)["macro_f1"]  # classes the tiny model never predicts count as 0
    assert r["fp32_val_macro_f1"] == pytest.approx(perfect)
    assert 0 <= r["argmax_agreement"] <= 1
    assert r["max_abs_prob_diff"] < 0.1
    assert r["accepted"] == (r["f1_drop"] <= MAX_F1_DROP)
    assert r["int8_bytes"] < r["fp32_bytes"]
    assert r["n_val_rows"] == 400
