"""Torch graph for the web: lm-v1 rows -> orientation + features -> standardise -> ensemble.

Everything after the lm-v1 normalisation (which has its own Python/TypeScript fixture) is baked
into the exported ONNX graph, so the browser never re-implements the engineered features:
input = 42 lm-v1 numbers, output = class probabilities averaged over the ensemble members.

FeatureLayer must reproduce `landmarks.features.build_features(X, "xy_dist_ang")` (tested).
"""

import numpy as np
import torch
from torch import nn

from signlingo_ml.landmarks.features import _FLEX, _PAIRS, _SPREAD
from signlingo_ml.landmarks.orientation import INDEX_MCP, PINKY_MCP

_EPS = 1e-9


class FeatureLayer(nn.Module):
    """(B, 42) lm-v1 rows -> (B, 283) features: xy (canonical orientation), distances, angles."""

    def __init__(self):
        super().__init__()
        idx = lambda v: torch.tensor(v, dtype=torch.long)
        self.register_buffer("pi", idx(_PAIRS[0]))
        self.register_buffer("pj", idx(_PAIRS[1]))
        for name, k in (("fa", 0), ("fb", 1), ("fc", 2)):
            self.register_buffer(name, idx([t[k] for t in _FLEX]))
        self.register_buffer("sa", idx([a for a, _ in _SPREAD]))
        self.register_buffer("sb", idx([b for _, b in _SPREAD]))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        p = x.reshape(-1, 21, 2)
        cross = p[:, INDEX_MCP, 0] * p[:, PINKY_MCP, 1] - p[:, INDEX_MCP, 1] * p[:, PINKY_MCP, 0]
        flip = torch.where(cross < 0, -torch.ones_like(cross), torch.ones_like(cross))
        P = torch.stack([p[:, :, 0] * flip[:, None], p[:, :, 1]], dim=-1)  # mirrored if needed

        diff = P[:, self.pi] - P[:, self.pj]
        d = torch.sqrt((diff * diff).sum(-1))
        d = d / (d.amax(dim=1, keepdim=True) + _EPS)

        def norm(v):
            return torch.sqrt((v * v).sum(-1))

        u, v = P[:, self.fa] - P[:, self.fb], P[:, self.fc] - P[:, self.fb]
        flex = (u * v).sum(-1) / (norm(u) * norm(v) + _EPS)
        a, b = P[:, self.sa], P[:, self.sb]
        n = norm(a) * norm(b) + _EPS
        cos = (a * b).sum(-1) / n
        sin = (a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]) / n
        spread = torch.stack([cos, sin], dim=-1).reshape(P.shape[0], -1)  # cos0, sin0, cos1, ...
        return torch.cat([P.reshape(-1, 42), d, flex, spread], dim=1)


class LandmarkEnsembleGraph(nn.Module):
    """Standardise features with the TRAIN statistics, average softmax over the members."""

    def __init__(self, members: list[nn.Module], mean: np.ndarray, std: np.ndarray):
        super().__init__()
        self.features = FeatureLayer()
        self.members = nn.ModuleList(members)
        self.register_buffer("mean", torch.as_tensor(mean, dtype=torch.float32))
        self.register_buffer("std", torch.as_tensor(std, dtype=torch.float32))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        f = (self.features(x) - self.mean) / self.std
        probs = [torch.softmax(m(f), dim=-1) for m in self.members]
        return torch.stack(probs, dim=0).mean(dim=0)
