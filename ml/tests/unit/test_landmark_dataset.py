import numpy as np

from signlingo_ml.landmarks.dataset import load_keypoint_csv, order_split


def _row(label: int, v: float = 0.1) -> str:
    # real file style: space-padded fields, wrist (0, 0) first, 42 numbers
    nums = [0.0, 0.0] + [v] * 40
    return f"{label} ," + " ,".join(f"{n:<22}" for n in nums)


def test_loads_label_and_42_features(tmp_path):
    p = tmp_path / "k.csv"
    p.write_text("\n".join(_row(0) for _ in range(3)) + "\n", encoding="utf-8")
    X, y, rep = load_keypoint_csv(p)
    assert X.shape == (3, 42) and X.dtype == np.float32
    assert y.tolist() == [0, 0, 0]
    assert rep.n_bad_lines == 0


def test_skips_malformed_line_and_reports_it(tmp_path):
    p = tmp_path / "k.csv"
    glued = _row(5) + _row(6)  # two rows glued (missing newline) -> wrong field count
    p.write_text(_row(0) + "\n" + glued + "\n" + _row(1) + "\n", encoding="utf-8")
    X, y, rep = load_keypoint_csv(p)
    assert len(X) == 2 and y.tolist() == [0, 1]
    assert rep.n_bad_lines == 1 and rep.bad_line_numbers == [2]


def test_drops_j_and_z_and_remaps_to_0_23(tmp_path):
    p = tmp_path / "k.csv"
    # Kaggle-style ids: 9 = J, 25 = Z are dynamic (dropped); 10 = K -> 9; 24 = Y -> 23
    p.write_text("\n".join(_row(c) for c in (8, 9, 10, 24, 25)) + "\n", encoding="utf-8")
    _, y, rep = load_keypoint_csv(p)
    assert y.tolist() == [8, 9, 23]
    assert rep.n_dropped_dynamic == 2


def test_order_split_takes_last_fraction_of_each_class():
    y = np.array([0] * 10 + [1] * 10 + [0] * 10)  # class 0 appears in two blocks
    s = order_split(y, val_frac=0.2)
    assert (s == "val").sum() == 6  # 20% of 20 (class 0) + 20% of 10 (class 1)
    assert (s[:10] == "train").all()  # earlier collection stays in train
    assert (s[26:30] == "val").all()  # last 4 of class 0 (end of its second block)
    assert (s[18:20] == "val").all()  # last 2 of class 1
