from signlingo_ml import config


def test_seed_is_42():
    assert config.SEED == 42


def test_labels_are_24_letters_without_j_z():
    assert len(config.LABELS) == 24
    assert "J" not in config.LABELS and "Z" not in config.LABELS
    assert config.LABELS[0] == "A" and config.LABELS[-1] == "Y"


def test_kaggle_label_remap_skips_9_and_25():
    m = config.KAGGLE_TO_INDEX
    assert set(m) == set(range(26)) - {9, 25}
    assert sorted(m.values()) == list(range(24))
    assert m[10] == 9 and m[24] == 23  # K -> 9, Y -> 23
