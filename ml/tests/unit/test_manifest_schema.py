import json
from pathlib import Path

import jsonschema
import pytest

SCHEMA = json.loads(
    (Path(__file__).resolve().parents[3] / "shared/contracts/schemas/model_manifest.schema.json")
    .read_text(encoding="utf-8")
)

VALID = {
    "model_id": "landmark-mlp", "version": "1.0.0", "task": "static_letters",
    "file": "landmark-mlp-1.0.0.onnx", "sha256": "0" * 64,
    "input": {"name": "x", "shape": [1, 42], "dtype": "float32", "features": "xy"},
    "output": {"name": "logits", "shape": [1, 24]},
    "labels": ["A"], "preprocess_version": "lm-v1",
    "recommended": {"threshold": 0.6, "hold_ms": 1000, "smoothing_window": 5},
    "metrics": {}, "seed": 42,
}


def test_valid_manifest_passes():
    jsonschema.validate(VALID, SCHEMA)


@pytest.mark.parametrize("key", ["sha256", "labels", "preprocess_version", "recommended"])
def test_missing_required_field_fails(key):
    bad = {k: v for k, v in VALID.items() if k != key}
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(bad, SCHEMA)


def test_bad_sha256_fails():
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate({**VALID, "sha256": "xyz"}, SCHEMA)
