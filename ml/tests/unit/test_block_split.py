import numpy as np

from signlingo_ml.landmarks.dataset import block_split


def _y():
    # class 0: long, 63 | class 1: long, long | class 2 split by a 2-row block of class 3
    return np.array([0] * 100 + [1] * 80 + [0] * 3 + [0] * 60 + [1] * 70 + [2] * 90 + [3] * 2 + [2] * 70)


def test_test_part_is_the_last_substantial_block_of_each_class():
    y = _y()
    s = block_split(y, min_block=50)
    assert (s[np.arange(len(y)) >= 0][y == 0][-60:] == "test").all()  # block of 60 rows
    for c in (0, 1, 2):
        test_idx = np.flatnonzero((s == "test") & (y == c))
        assert (np.diff(test_idx) == 1).all()  # one contiguous block
    assert (s[(y == 1)][-70:] == "test").all()


def test_test_block_never_overlaps_train_or_val_in_file_order():
    y = _y()
    s = block_split(y, min_block=50)
    for c in (0, 1, 2):
        test_idx = np.flatnonzero((s == "test") & (y == c))
        other = np.flatnonzero((s != "test") & (s != "gap") & (y == c))
        # no train/val row sits inside the span of the test block
        assert not ((other > test_idx.min()) & (other < test_idx.max())).any()


def test_every_class_has_train_val_and_test_rows():
    s = block_split(_y(), min_block=50)
    for c in (0, 1, 2):
        assert {"train", "val", "test"} <= set(s[_y() == c])


def test_class_without_a_substantial_block_gets_no_test_rows():
    y = np.array([0] * 40 + [1] * 200 + [1] * 5)
    s = block_split(y, min_block=50)
    assert "test" not in set(s[y == 0]) and "test" in set(s[y == 1])


def test_deterministic():
    assert (block_split(_y()) == block_split(_y())).all()
