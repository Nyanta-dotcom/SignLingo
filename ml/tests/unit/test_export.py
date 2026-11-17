import numpy as np
import pytest

torch = pytest.importorskip("torch")
pytest.importorskip("onnxruntime")

from signlingo_ml.export.landmark_graph import FeatureLayer, LandmarkEnsembleGraph
from signlingo_ml.export.onnx_export import export_onnx, onnx_predict
from signlingo_ml.landmarks.features import build_features
from signlingo_ml.landmarks.normalize import normalize_batch
from signlingo_ml.models.landmark_mlp import LandmarkMLP


@pytest.fixture(scope="module")
def hands():
    rng = np.random.default_rng(0)
    X, ok = normalize_batch(rng.uniform(-1, 1, (300, 21, 2)))
    return X[ok]


@pytest.fixture(scope="module")
def graph(hands):
    F = build_features(hands, "xy_dist_ang")
    torch.manual_seed(0)
    members = [LandmarkMLP(283, hidden=(32, 16)) for _ in range(3)]
    g = LandmarkEnsembleGraph(members, F.mean(axis=0), F.std(axis=0) + 1e-6)
    return g.eval()


def test_torch_features_equal_the_numpy_features(hands):
    with torch.no_grad():
        got = FeatureLayer()(torch.from_numpy(hands)).numpy()
    np.testing.assert_allclose(got, build_features(hands, "xy_dist_ang"), atol=2e-4)


def test_mirrored_input_gives_identical_features(hands):
    M = hands.copy()
    M[:, 0::2] *= -1
    with torch.no_grad():
        a = FeatureLayer()(torch.from_numpy(hands))
        b = FeatureLayer()(torch.from_numpy(M))
    np.testing.assert_allclose(a.numpy(), b.numpy(), atol=1e-5)


def test_graph_output_is_a_probability_per_class(graph, hands):
    with torch.no_grad():
        p = graph(torch.from_numpy(hands[:10])).numpy()
    assert p.shape == (10, 24) and (p >= 0).all()
    np.testing.assert_allclose(p.sum(axis=1), 1.0, atol=1e-5)


def test_graph_matches_a_numpy_reference_of_the_same_pipeline(graph, hands):
    F = (build_features(hands, "xy_dist_ang") - graph.mean.numpy()) / graph.std.numpy()
    with torch.no_grad():
        ref = np.mean(
            [
                torch.softmax(m(torch.from_numpy(F.astype(np.float32))), -1).numpy()
                for m in graph.members
            ],
            axis=0,
        )
        out = graph(torch.from_numpy(hands)).numpy()
    np.testing.assert_allclose(out, ref, atol=1e-3)


def test_onnx_matches_torch_within_1e_4_for_any_batch_size(graph, hands, tmp_path):
    """AC-ML-08: max abs difference <= 1e-4 on 256 rows, and the batch axis is dynamic."""
    path = export_onnx(graph, tmp_path / "m.onnx")
    X = hands[:256]
    with torch.no_grad():
        ref = graph(torch.from_numpy(X)).numpy()
    np.testing.assert_allclose(onnx_predict(path, X), ref, atol=1e-4)
    for n in (1, 17):  # other batch sizes work (the web app sends one frame at a time)
        with torch.no_grad():
            ref_n = graph(torch.from_numpy(X[:n])).numpy()
        np.testing.assert_allclose(onnx_predict(path, X[:n]), ref_n, atol=1e-4)
    assert path.stat().st_size > 0
