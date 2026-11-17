import pytest

torch = pytest.importorskip("torch")

from signlingo_ml.models.cnn import SmallCNN, count_parameters


def test_forward_shape_is_batch_by_24_logits():
    m = SmallCNN()
    out = m(torch.zeros(5, 1, 28, 28))
    assert out.shape == (5, 24) and out.dtype == torch.float32


def test_accepts_flat_hw_input_without_channel_dim():
    assert SmallCNN()(torch.zeros(3, 28, 28)).shape == (3, 24)


def test_architecture_layers():
    m = SmallCNN(dropout=0.3)
    convs = [x for x in m.modules() if isinstance(x, torch.nn.Conv2d)]
    assert [c.out_channels for c in convs] == [16, 32]
    assert any(isinstance(x, torch.nn.Dropout) and x.p == 0.3 for x in m.modules())
    # parameter count is a property we report, not a fixed target
    assert count_parameters(m) == sum(p.numel() for p in m.parameters() if p.requires_grad)


def test_eval_mode_is_deterministic_and_train_mode_applies_dropout():
    torch.manual_seed(0)
    m = SmallCNN(dropout=0.5)
    x = torch.rand(8, 1, 28, 28)
    m.eval()
    assert torch.equal(m(x), m(x))
    m.train()
    assert not torch.equal(m(x), m(x))


def test_same_seed_gives_same_initial_weights():
    torch.manual_seed(42)
    a = SmallCNN()
    torch.manual_seed(42)
    b = SmallCNN()
    assert all(torch.equal(p, q) for p, q in zip(a.parameters(), b.parameters(), strict=True))


def test_gradients_flow_to_every_parameter():
    m = SmallCNN()
    loss = torch.nn.functional.cross_entropy(
        m(torch.rand(4, 1, 28, 28)), torch.tensor([0, 1, 2, 3])
    )
    loss.backward()
    assert all(p.grad is not None and p.grad.abs().sum() > 0 for p in m.parameters())


def test_widths_are_configurable_for_the_sweep():
    small, big = SmallCNN(channels=(8, 16), hidden=64), SmallCNN(channels=(32, 64), hidden=256)
    assert count_parameters(small) < count_parameters(SmallCNN()) < count_parameters(big)
    assert big(torch.zeros(2, 1, 28, 28)).shape == (2, 24)
