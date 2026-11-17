"""Global constants: seed, labels, paths."""
from pathlib import Path

SEED = 42

ROOT = Path(__file__).resolve().parents[2]
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
ARTIFACTS = ROOT / "artifacts"
REPORTS = ROOT / "reports"

# 24 static ASL letters (J and Z need motion and are excluded).
LABELS = [c for c in "ABCDEFGHIKLMNOPQRSTUVWXY"]

# Kaggle Sign Language MNIST uses 0..25 with 9 (J) and 25 (Z) absent -> remap to 0..23.
KAGGLE_TO_INDEX = {k: i for i, k in enumerate(k for k in range(26) if k not in (9, 25))}
