import json
from pathlib import Path

import jsonschema
import pytest

from signlingo_ml.export.manifest import sha256_file
from signlingo_ml.export.publish import build_experiment_index, publish

SCHEMAS = Path(__file__).resolve().parents[3] / "shared/contracts/schemas"
EXP_INDEX = json.loads((SCHEMAS / "experiment_index.schema.json").read_text(encoding="utf-8"))
MODEL_INDEX = json.loads((SCHEMAS / "model_index.schema.json").read_text(encoding="utf-8"))


def _run(run_id, kind="baseline", **extra):
    base = {
        "run_id": run_id, "kind": kind, "dataset": "sign_mnist", "model_name": "M",
        "feature_set": "pixel", "split_strategy": "group_ward70",
        "metrics": {"val_acc": 0.7, "test_acc": 0.65}, "seed": 42, "run_at": "t",
    }  # fmt: skip
    return {**base, **extra}


def _setup(tmp_path, onnx_bytes=b"onnx-bytes"):
    art, exp, pub = tmp_path / "art", tmp_path / "exp", tmp_path / "public"
    art.mkdir()
    exp.mkdir()
    onnx = art / "landmark-mlp-ens5-1.0.0.onnx"
    onnx.write_bytes(onnx_bytes)
    manifest = {
        "model_id": "landmark-mlp-ens5", "version": "1.0.0", "task": "static_letters",
        "file": onnx.name, "sha256": sha256_file(onnx),
    }  # fmt: skip
    (art / "landmark-mlp-ens5-1.0.0.manifest.json").write_text(json.dumps(manifest))
    for r in (
        _run("b1"),
        _run("l_rand", "leakage_study", split_strategy="random",
             diagnostics={"val_test_gap": 0.3, "nn_dist_val_to_train": {"median": 0.4}}),
        _run("l_grp", "leakage_study", diagnostics={"val_test_gap": 0.05}),
    ):  # fmt: skip
        (exp / f"{r['run_id']}.json").write_text(json.dumps(r))
    return art, exp, pub


def test_experiment_index_is_schema_valid_and_separates_the_leakage_study():
    recs = [_run("b1"), _run("l1", "leakage_study", diagnostics={"val_test_gap": 0.3})]
    idx = build_experiment_index(recs)
    jsonschema.validate(idx, EXP_INDEX)
    assert [r["run_id"] for r in idx["runs"]] == ["b1"]
    assert idx["leakage_study"][0]["run_id"] == "l1" and idx["datasets"] == ["sign_mnist"]


def test_publish_copies_models_and_experiments_and_writes_valid_indexes(tmp_path):
    art, exp, pub = _setup(tmp_path)
    publish(art, exp, pub)
    assert (pub / "models" / "landmark-mlp-ens5-1.0.0.onnx").exists()
    assert (pub / "models" / "landmark-mlp-ens5-1.0.0.manifest.json").exists()
    assert (pub / "data" / "experiments" / "b1.json").exists()
    mi = json.loads((pub / "models" / "index.json").read_text(encoding="utf-8"))
    jsonschema.validate(mi, MODEL_INDEX)
    assert mi["active"] == {"static_letters": "landmark-mlp-ens5-1.0.0"}
    ei = json.loads((pub / "data" / "experiments" / "index.json").read_text(encoding="utf-8"))
    jsonschema.validate(ei, EXP_INDEX)
    assert len(ei["leakage_study"]) == 2


def test_publish_is_idempotent_but_never_overwrites_a_released_version(tmp_path):
    art, exp, pub = _setup(tmp_path)
    publish(art, exp, pub)
    publish(art, exp, pub)  # same bytes: fine
    # a different model rebuilt under the SAME version, with a consistent manifest
    onnx = art / "landmark-mlp-ens5-1.0.0.onnx"
    onnx.write_bytes(b"a different model, same version")
    mf = art / "landmark-mlp-ens5-1.0.0.manifest.json"
    manifest = json.loads(mf.read_text())
    manifest["sha256"] = sha256_file(onnx)
    mf.write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="already published"):
        publish(art, exp, pub)


def test_publish_rejects_a_file_that_does_not_match_its_manifest(tmp_path):
    art, exp, pub = _setup(tmp_path)
    (art / "landmark-mlp-ens5-1.0.0.onnx").write_bytes(b"tampered")
    with pytest.raises(ValueError, match="sha256 does not match"):
        publish(art, exp, pub)
