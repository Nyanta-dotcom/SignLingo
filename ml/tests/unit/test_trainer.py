import json
from pathlib import Path

import jsonschema
import numpy as np
import pytest

torch = pytest.importorskip("torch")

from signlingo_ml.models.cnn import SmallCNN
from signlingo_ml.train import trainer
from signlingo_ml.train.trainer import TrainConfig, run_cnn, train_model

SCHEMA = json.loads(
    (
        Path(__file__).resolve().parents[3] / "shared/contracts/schemas/experiment.schema.json"
    ).read_text(encoding="utf-8")
)
N_CLS = 4


def _data(n_per_class=30, seed=0):
    """Easily separable toy images: a bright 6x6 block whose position depends on the class."""
    rng = np.random.default_rng(seed)
    X, y = [], []
    for c in range(N_CLS):
        for _ in range(n_per_class):
            img = rng.random((28, 28)).astype(np.float32) * 0.1
            r, col = divmod(c, 2)
            img[4 + r * 14 : 10 + r * 14, 4 + col * 14 : 10 + col * 14] += 0.9
            X.append(np.clip(img, 0, 1))
            y.append(c)
    return np.array(X, dtype=np.float32), np.array(y)


@pytest.fixture(scope="module")
def data():
    Xtr, ytr = _data(30, 0)
    Xva, yva = _data(10, 1)
    Xte, yte = _data(10, 2)
    return Xtr, ytr, Xva, yva, Xte, yte


def _model(seed=42):
    torch.manual_seed(seed)
    return SmallCNN(num_classes=N_CLS, dropout=0.0)


def _cfg(**kw):
    base = {"epochs": 4, "batch_size": 32, "lr": 3e-3, "augment": False, "patience": 10, "seed": 42}
    return TrainConfig(**{**base, **kw})


def test_training_loss_decreases(data):
    Xtr, ytr, Xva, yva, *_ = data
    res = train_model(_model(), Xtr, ytr, Xva, yva, _cfg(epochs=5), num_classes=N_CLS)
    assert res.history["train_loss"][-1] < res.history["train_loss"][0]
    assert max(res.history["val_macro_f1"]) > 0.9  # the toy task is learnable


def test_same_seed_is_reproducible_and_different_seed_differs(data):
    Xtr, ytr, Xva, yva, *_ = data

    def fit(seed):
        m = _model(seed)
        r = train_model(m, Xtr, ytr, Xva, yva, _cfg(seed=seed, augment=True), num_classes=N_CLS)
        return m, r

    (m1, r1), (m2, r2), (m3, _) = fit(42), fit(42), fit(7)
    assert r1.history == r2.history
    assert all(torch.equal(a, b) for a, b in zip(m1.parameters(), m2.parameters(), strict=True))
    assert not all(torch.equal(a, b) for a, b in zip(m1.parameters(), m3.parameters(), strict=True))


def test_early_stopping_triggers_when_validation_does_not_improve(data):
    Xtr, ytr, Xva, yva, *_ = data
    # lr=0 -> weights never change -> val F1 is constant -> best is epoch 1, stop after patience
    res = train_model(
        _model(), Xtr, ytr, Xva, yva, _cfg(epochs=10, lr=0.0, patience=2), num_classes=N_CLS
    )
    assert res.best_epoch == 1 and res.stopped_early
    assert len(res.history["epoch"]) == 3  # epoch 1 (best) + 2 without improvement


def test_best_epoch_weights_are_restored(data):
    Xtr, ytr, Xva, yva, *_ = data
    m = _model()
    res = train_model(m, Xtr, ytr, Xva, yva, _cfg(epochs=6), num_classes=N_CLS)
    pred = trainer.predict_logits(m, Xva).argmax(1)
    from sklearn.metrics import f1_score

    f1 = f1_score(yva, pred, average="macro", labels=range(N_CLS), zero_division=0)
    assert f1 == pytest.approx(res.history["val_macro_f1"][res.best_epoch - 1])
    assert f1 == pytest.approx(max(res.history["val_macro_f1"]))


def test_augmentation_is_applied_once_per_epoch_with_a_new_seed(data, monkeypatch):
    Xtr, ytr, Xva, yva, *_ = data
    seeds = []
    real = trainer.augment_batch

    def spy(X, seed, **kw):
        seeds.append(seed)
        return real(X, seed=seed, **kw)

    monkeypatch.setattr(trainer, "augment_batch", spy)
    train_model(_model(), Xtr, ytr, Xva, yva, _cfg(epochs=3, augment=True), num_classes=N_CLS)
    assert len(seeds) == 3 and len(set(seeds)) == 3


def test_record_is_schema_valid_and_test_is_untouched_unless_requested(data):
    Xtr, ytr, Xva, yva, Xte, yte = data
    kw = {"num_classes": N_CLS, "model_kwargs": {"dropout": 0.0}}
    rec = run_cnn("cnn_toy", _cfg(epochs=2), Xtr, ytr, Xva, yva, **kw)
    jsonschema.validate(rec, SCHEMA)
    assert "test_acc" not in rec["metrics"] and "confusion_matrix" not in rec
    assert rec["metrics"]["params"] > 0 and rec["curves"]["epoch"] == [1, 2]
    assert rec["seed"] == 42 and rec["kind"] == "main"

    rec2 = run_cnn("cnn_toy", _cfg(epochs=2), Xtr, ytr, Xva, yva, Xte, yte, eval_test=True, **kw)
    jsonschema.validate(rec2, SCHEMA)
    assert 0.0 <= rec2["metrics"]["test_acc"] <= 1.0
    assert "confusion_matrix" in rec2
    # selection used validation only: the recorded best epoch is the val-F1 argmax
    f1s = rec2["curves"]["val_macro_f1"]
    assert rec2["hyperparams"]["best_epoch"] == int(np.argmax(f1s)) + 1
