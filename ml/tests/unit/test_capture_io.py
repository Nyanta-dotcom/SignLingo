import json

import numpy as np
import pytest

from signlingo_ml.landmarks.capture_io import build_document, sample_from_frames, write_document
from signlingo_ml.landmarks.ingest import load_webcam_dir

HAND = np.random.default_rng(1).uniform(0.2, 0.8, (21, 3))


def test_document_passes_the_schema_and_loads_back(tmp_path):
    samples = [
        sample_from_frames("R", [HAND, HAND], "Right"),
        sample_from_frames("A", [HAND], "Left"),
    ]
    doc = build_document("S01", "sess-1", samples, {"camera": {"width": 640, "height": 480}})
    write_document(doc, tmp_path)
    X, y, signer, _rep = load_webcam_dir(tmp_path)
    assert X.shape == (3, 42) and sorted(set(y.tolist())) == [0, 16] and set(signer) == {"S01"}


def test_file_name_has_signer_and_is_written_inside_the_given_directory(tmp_path):
    doc = build_document("S07", "x", [sample_from_frames("B", [HAND], "Right")], {})
    path = write_document(doc, tmp_path)
    assert path.parent == tmp_path and path.name.startswith("landmarks_S07_")
    assert json.loads(path.read_text(encoding="utf-8"))["signer_id"] == "S07"


def test_real_looking_signer_codes_and_j_z_are_rejected():
    with pytest.raises(ValueError):
        build_document("alice", "x", [sample_from_frames("A", [HAND], "Right")], {})
    with pytest.raises(ValueError):
        sample_from_frames("J", [HAND], "Right")


def test_no_frames_is_an_error():
    with pytest.raises(ValueError):
        sample_from_frames("A", [], "Right")
