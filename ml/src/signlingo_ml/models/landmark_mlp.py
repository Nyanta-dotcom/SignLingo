"""MLP on 42 normalised landmark numbers (lm-v1) -> 24 letters (P1-19).

Layer sizes (42 -> 128 -> 64 -> 24) are a starting hypothesis, carried over from the old report's
description (untrusted); they are constructor arguments and the parameter count is logged.
"""

import torch
from torch import nn

from signlingo_ml.config import LABELS


class LandmarkMLP(nn.Module):
    def __init__(
        self,
        in_features: int = 42,
        hidden: tuple[int, int] = (128, 64),
        num_classes: int = len(LABELS),
        dropout: float = 0.2,
    ):
        super().__init__()
        h1, h2 = hidden
        self.net = nn.Sequential(
            nn.Linear(in_features, h1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(h1, h2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(h2, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)  # logits; softmax is applied outside
