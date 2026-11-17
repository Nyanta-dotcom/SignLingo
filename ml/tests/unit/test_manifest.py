import hashlib
import json
from pathlib import Path

import jsonschema
import pytest

from signlingo_ml.config import LABELS
from signlingo_ml.export.manifest import build_index, build_manifest, sha256_file

SCHEMAS = Path(__file__).resolve().parents[3] / "shared/contracts/schemas"
MANIFEST_SCHEMA = json.loads((SCHEMAS / "model_manifest.schema.json").read_text(encoding="utf-8"))
INDEX_SCHEMA = json.loads((SCHEMAS / "model_index.schema.json").read_text(encoding="utf-8"))


@pytest.fixture
def onnx_file(tmp_path):
    p = tmp_path / "landmark-mlp-ens5-1.0.0.onnx"
    p.write_bytes(b"not a real model, just bytes to hash")
    return p


def _manifest(onnx_file, **kw):
    args = {
        "model_id": "landmark-mlp-ens5", "version": "1.0.0", "onnx_path": onnx_file,
        "labels": LABELS, "class_templates": {"A": {"finger_angles": [1.0] * 15}},
        "confusable": {"U": ["R"]}, "metrics": {"val_macro_f1": 0.8}, "seed": 42,
        "git_commit": "abc1234",
    }  # fmt: skip
    return build_manifest(**{**args, **kw})


def test_sha256_matches_hashlib(onnx_file):
    assert sha256_file(onnx_file) == hashlib.sha256(onnx_file.read_bytes()).hexdigest()


def test_manifest_is_schema_valid_and_describes_the_graph(onnx_file):
    m = _manifest(onnx_file)
    jsonschema.validate(m, MANIFEST_SCHEMA)
    assert m["file"] == onnx_file.name and m["sha256"] == sha256_file(onnx_file)
    assert m["task"] == "static_letters" and m["preprocess_version"] == "lm-v1"
    assert m["input"] == {"name": "x", "shape": [1, 42], "dtype": "float32", "features": "xy"}
    assert m["output"]["name"] == "probs" and m["output"]["shape"] == [1, 24]
    assert m["labels"] == LABELS and m["confusable"] == {"U": ["R"]}
    assert m["recommended"] == {"threshold": 0.6, "hold_ms": 1000, "smoothing_window": 5}


def test_manifest_keeps_only_measured_metrics_given_to_it(onnx_file):
    m = _manifest(onnx_file, metrics={"val_macro_f1": 0.857, "test_macro_f1": 0.778})
    assert m["metrics"] == {"val_macro_f1": 0.857, "test_macro_f1": 0.778}
    assert "signer_holdout_macro_f1" not in m["metrics"]  # not measured yet -> not invented


def test_bad_version_is_rejected_by_the_schema(onnx_file):
    with pytest.raises(jsonschema.ValidationError):
        jsonschema.validate(_manifest(onnx_file, version="1.0"), MANIFEST_SCHEMA)


def test_index_lists_models_and_marks_the_active_one(onnx_file):
    m = _manifest(onnx_file)
    idx = build_index([m], active={"static_letters": "landmark-mlp-ens5-1.0.0"})
    jsonschema.validate(idx, INDEX_SCHEMA)
    assert idx["available"] == ["landmark-mlp-ens5-1.0.0"]
    assert idx["active"] == {"static_letters": "landmark-mlp-ens5-1.0.0"}


def test_index_rejects_an_active_model_that_is_not_available(onnx_file):
    with pytest.raises(ValueError):
        build_index([_manifest(onnx_file)], active={"static_letters": "nope-9.9.9"})
