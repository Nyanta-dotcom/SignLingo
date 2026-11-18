import json

import numpy as np
import pytest

from signlingo_ml.landmarks.ingest import load_webcam_dir
from signlingo_ml.landmarks.normalize import normalize_lm_v1

RNG = np.random.default_rng(0)


def _hand():
    return RNG.uniform(0.2, 0.8, (21, 3)).round(4).tolist()


def _write(d, name, signer, sign="LETTER_A", session="s1", n=3, **extra):
    doc = {
        "schema_version": 1, "preprocess_version": "raw", "signer_id": signer,
        "capture_session_id": session,
        "samples": [{"sign_code": sign, "handedness": "Right", "frames": [_hand() for _ in range(n)]}],
    }  # fmt: skip
    doc.update(extra)
    (d / name).write_text(json.dumps(doc), encoding="utf-8")
    return doc


def test_rows_are_normalised_with_lm_v1_and_carry_signer_labels(tmp_path):
    doc = _write(tmp_path, "a.json", "S01", "LETTER_B")
    X, y, signer, rep = load_webcam_dir(tmp_path)
    assert X.shape == (3, 42) and y.tolist() == [1, 1, 1] and set(signer) == {"S01"}
    assert np.allclose(X[0], normalize_lm_v1(np.array(doc["samples"][0]["frames"][0])), atol=1e-6)
    assert rep["n_rows"] == 3 and rep["signers"] == ["S01"]


def test_several_files_and_signers_are_merged_in_sorted_file_order(tmp_path):
    _write(tmp_path, "b.json", "S02", "LETTER_C")
    _write(tmp_path, "a.json", "S01", "LETTER_A")
    _, y, signer, _ = load_webcam_dir(tmp_path)
    assert signer.tolist() == ["S01"] * 3 + ["S02"] * 3 and y.tolist() == [0] * 3 + [2] * 3


def test_degenerate_frames_are_dropped_and_counted(tmp_path):
    doc = _write(tmp_path, "a.json", "S01", n=2)
    doc["samples"][0]["frames"].append([[0.5, 0.5, 0.0]] * 21)  # all points on the wrist
    (tmp_path / "a.json").write_text(json.dumps(doc), encoding="utf-8")
    X, _, _, rep = load_webcam_dir(tmp_path)
    assert len(X) == 2 and rep["n_degenerate"] == 1


def test_file_that_breaks_the_schema_is_an_error_naming_the_file(tmp_path):
    _write(tmp_path, "bad.json", "alice")  # real-looking name instead of an anonymous code
    with pytest.raises(ValueError, match="bad.json"):
        load_webcam_dir(tmp_path)


def test_empty_directory_gives_zero_rows(tmp_path):
    X, y, _signer, rep = load_webcam_dir(tmp_path)
    assert X.shape == (0, 42) and len(y) == 0 and rep["n_rows"] == 0
