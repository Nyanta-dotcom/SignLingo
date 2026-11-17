"""Small CNN for 28x28 grayscale ASL letters (P1-11).

Provenance, stated honestly: the default layer sizes (16/32 filters, 128 hidden units) were
carried over from the description in the old week 3-4 report, which is NOT trusted evidence.
They are only a starting hypothesis. Widths are constructor arguments so the sweep (P1-13)
can compare variants on the validation split. The parameter count is measured and logged
with every run; no accuracy is assumed from the old report.
"""

import torch
from torch import nn

from signlingo_ml.config import LABELS


class SmallCNN(nn.Module):
    def __init__(
        self,
        num_classes: int = len(LABELS),
        dropout: float = 0.3,
        channels: tuple[int, int] = (16, 32),
        hidden: int = 128,
    ):
        super().__init__()
        c1, c2 = channels
        self.features = nn.Sequential(
            nn.Conv2d(1, c1, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 28 -> 14
            nn.Conv2d(c1, c2, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),  # 14 -> 7
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(c2 * 7 * 7, hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.ndim == 3:  # (N, 28, 28) -> (N, 1, 28, 28)
            x = x.unsqueeze(1)
        return self.classifier(self.features(x))  # logits; softmax is applied outside


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
