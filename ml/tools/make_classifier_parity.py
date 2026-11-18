"""Write shared/contracts/fixtures/classifier_parity.json: lm-v1 inputs and the probabilities the
published ONNX model gives for them (onnxruntime, Python). The frontend test must reproduce them.

    python ml/tools/make_classifier_parity.py
"""

import json
from pathlib import Path

import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "frontend/public/models/landmark-mlp-ens5-1.0.0.onnx"
FIXTURE = ROOT / "shared/contracts/fixtures/landmarks_lm-v1.json"
OUT = ROOT / "shared/contracts/fixtures/classifier_parity.json"
N = 10


def main() -> None:
    cases = [c for c in json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"] if c["expected"]]
    X = np.array([c["expected"] for c in cases[:N]], dtype=np.float32)
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    probs = sess.run(["probs"], {"x": X})[0]
    doc = {
        "model": MODEL.name,
        "tolerance": 1e-4,
        "inputs": X.tolist(),
        "probs": probs.tolist(),
        "argmax": probs.argmax(1).tolist(),
    }
    OUT.write_text(json.dumps(doc), encoding="utf-8")
    print("wrote", OUT, "argmax", doc["argmax"])


if __name__ == "__main__":
    main()
