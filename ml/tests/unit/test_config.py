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


def test_raw_path_uses_env_override_and_reports_missing(tmp_path, monkeypatch):
    (tmp_path / "a.csv").write_text("x", encoding="utf-8")
    monkeypatch.setenv("SIGNLINGO_DATA_RAW", str(tmp_path))
    assert config.raw_path("a.csv") == tmp_path / "a.csv"
    import pytest

    with pytest.raises(FileNotFoundError):
        config.raw_path("does_not_exist.csv")
