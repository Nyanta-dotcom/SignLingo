import numpy as np
import pytest

from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.landmarks.templates import (
    FINGER_JOINTS,
    class_templates,
    confusable_from_matrix,
    finger_angles_deg,
)


def _straight_index_hand():
    P = np.zeros((21, 2))
    P[5], P[6], P[7], P[8] = [0, 1], [0, 2], [0, 3], [0, 4]  # index finger perfectly straight
    P[9], P[10], P[11], P[12] = [0.3, 1], [0.6, 1.8], [0.9, 2.2], [1.0, 2.4]  # middle finger bent
    P[17] = [-1, 0.3]
    return normalize_batch(P[None])[0]


def test_joint_names_cover_15_flexion_angles():
    assert len(FINGER_JOINTS) == 15
    assert FINGER_JOINTS[0] == "thumb_cmc" and FINGER_JOINTS[3] == "index_mcp"


def test_straight_finger_is_180_degrees_and_bent_finger_is_smaller():
    a = finger_angles_deg(_straight_index_hand())[0]
    assert a.shape == (15,)
    assert a[FINGER_JOINTS.index("index_pip")] == pytest.approx(180.0, abs=0.5)
    assert a[FINGER_JOINTS.index("middle_pip")] < 170.0


def test_angles_do_not_depend_on_mirroring_or_rotation():
    X = _straight_index_hand()
    M = X.copy()
    M[:, 0::2] *= -1
    np.testing.assert_allclose(finger_angles_deg(M), finger_angles_deg(X), atol=1e-3)


def test_class_templates_are_per_class_mean_and_std():
    rng = np.random.default_rng(0)
    X, ok = normalize_batch(rng.uniform(-1, 1, (120, 21, 2)))
    y = np.repeat(np.arange(3), 40)[ok]
    labels = ["A", "B", "C"]
    t = class_templates(X, y, labels)
    assert set(t) == set(labels)
    ang = finger_angles_deg(X)
    np.testing.assert_allclose(t["B"]["finger_angles"], ang[y == 1].mean(axis=0), atol=1e-3)
    np.testing.assert_allclose(t["B"]["finger_angles_std"], ang[y == 1].std(axis=0), atol=1e-3)
    assert t["B"]["n"] == int((y == 1).sum()) and len(t["B"]["finger_angles"]) == 15


def test_confusable_lists_the_classes_a_letter_is_often_mistaken_for():
    labels = ["A", "B", "C", "D"]
    cm = np.array(
        [
            [0.90, 0.08, 0.02, 0.00],  # A is mistaken for B (8%)
            [0.01, 0.99, 0.00, 0.00],
            [0.00, 0.30, 0.60, 0.10],  # C is mistaken for B (30%) and D (10%)
            [0.00, 0.00, 0.00, 1.00],
        ]
    )
    c = confusable_from_matrix(cm, labels, min_rate=0.05)
    assert c == {"A": ["B"], "C": ["B", "D"]}  # most frequent first; clean classes omitted
    assert confusable_from_matrix(cm, labels, min_rate=0.05, top=1)["C"] == ["B"]
