import pytest

torch = pytest.importorskip("torch")

from signlingo_ml.models.cnn import count_parameters
from signlingo_ml.models.landmark_mlp import LandmarkMLP


def test_forward_shape_is_batch_by_24():
    out = LandmarkMLP()(torch.zeros(7, 42))
    assert out.shape == (7, 24) and out.dtype == torch.float32


def test_default_layers_are_42_128_64_24():
    linears = [m for m in LandmarkMLP().modules() if isinstance(m, torch.nn.Linear)]
    assert [(m.in_features, m.out_features) for m in linears] == [(42, 128), (128, 64), (64, 24)]
    assert count_parameters(LandmarkMLP()) == 42 * 128 + 128 + 128 * 64 + 64 + 64 * 24 + 24


def test_eval_deterministic_train_dropout_active_and_seeded_init():
    x = torch.rand(8, 42)
    m = LandmarkMLP(dropout=0.5)
    m.eval()
    assert torch.equal(m(x), m(x))
    m.train()
    assert not torch.equal(m(x), m(x))
    torch.manual_seed(42)
    a = LandmarkMLP()
    torch.manual_seed(42)
    b = LandmarkMLP()
    assert all(torch.equal(p, q) for p, q in zip(a.parameters(), b.parameters(), strict=True))


def test_hidden_sizes_are_configurable_and_gradients_flow():
    m = LandmarkMLP(hidden=(32, 16))
    assert m(torch.zeros(2, 42)).shape == (2, 24)
    torch.nn.functional.cross_entropy(m(torch.rand(4, 42)), torch.tensor([0, 1, 2, 3])).backward()
    assert all(p.grad is not None and p.grad.abs().sum() > 0 for p in m.parameters())
