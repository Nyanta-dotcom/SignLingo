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


def raw_path(filename: str) -> Path:
    """Find a raw data file: $SIGNLINGO_DATA_RAW, then ml/data/raw, then <repo>/data."""
    import os

    roots = [os.environ.get("SIGNLINGO_DATA_RAW"), DATA_RAW, ROOT.parent / "data"]
    for r in roots:
        if r and (Path(r) / filename).exists():
            return Path(r) / filename
    raise FileNotFoundError(f"{filename} not found in any of: {[str(r) for r in roots if r]}")
