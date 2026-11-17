import numpy as np
import pytest

from signlingo_ml.landmarks.dataset import order_split3
from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.landmarks.orientation import canonicalize, chirality


@pytest.fixture(scope="module")
def hands():
    rng = np.random.default_rng(0)
    P = rng.uniform(-1, 1, (200, 21, 2))
    X, ok = normalize_batch(P)
    return X[ok]


def _mirror(X):
    M = X.copy()
    M[:, 0::2] *= -1  # x := -x
    return M


def test_mirroring_flips_the_sign_of_the_chirality(hands):
    assert (chirality(_mirror(hands)) == -chirality(hands)).all()


def test_canonical_form_has_non_negative_chirality(hands):
    assert (chirality(canonicalize(hands)) >= 0).all()


def test_canonicalising_a_mirrored_hand_gives_the_same_result(hands):
    np.testing.assert_allclose(canonicalize(_mirror(hands)), canonicalize(hands), atol=1e-7)


def test_canonicalize_is_idempotent_and_leaves_positive_hands_unchanged(hands):
    once = canonicalize(hands)
    np.testing.assert_array_equal(canonicalize(once), once)
    pos = chirality(hands) > 0
    np.testing.assert_array_equal(once[pos], hands[pos])
    assert once.dtype == np.float32 and once.shape == hands.shape


def test_order_split3_layout_per_class_in_file_order():
    y = np.repeat([0, 1], 500)  # two contiguous classes of 500
    s = order_split3(y, val_frac=0.2, test_frac=0.2, gap_frac=0.02)
    for c in (0, 1):
        seg = s[y == c]
        # train, gap, val, gap, test in this order, nothing interleaved
        runs = [seg[0]] + [seg[i] for i in range(1, len(seg)) if seg[i] != seg[i - 1]]
        assert runs == ["train", "gap", "val", "gap", "test"]
        assert (seg == "val").sum() == 100 and (seg == "test").sum() == 100
        assert (seg == "gap").sum() == 20  # 2 gaps x 10 rows
        assert (seg == "train").sum() == 500 - 100 - 100 - 20


def test_order_split3_has_a_gap_between_every_pair_of_adjacent_segments():
    y = np.repeat(np.arange(4), 300)
    s = order_split3(y)
    for c in range(4):  # per class: segments are never directly adjacent in the file
        sc = np.flatnonzero(y == c)
        pos = {k: np.flatnonzero(s[sc] == k) for k in ("train", "val", "test")}
        assert pos["val"].min() - pos["train"].max() > 1
        assert pos["test"].min() - pos["val"].max() > 1


def test_order_split3_handles_interleaved_blocks_of_one_class():
    y = np.array([0] * 100 + [1] * 100 + [0] * 100)  # class 0 has two blocks, 200 rows
    s = order_split3(y, 0.2, 0.2, 0.0)
    idx0 = np.flatnonzero(y == 0)
    assert (s[idx0[:120]] == "train").all()  # first 60% of the class, across both blocks
    assert (s[idx0[120:160]] == "val").all()  # next 20%
    assert (s[idx0[160:]] == "test").all()  # last 20%
