"""Guard against using the official test split for model selection (AC-ML-02)."""

ALLOWED = {"train", "val", "test"}


class TestSetAccessError(RuntimeError):
    __test__ = False  # not a pytest class


def require_split_access(name: str, *, final: bool = False) -> None:
    """Raise unless `name` may be read. `test` needs final=True (evaluate --final only)."""
    if name not in ALLOWED:
        raise ValueError(f"unknown split: {name!r}")
    if name == "test" and not final:
        raise TestSetAccessError(
            "The test split may only be read for the final report (final=True)."
        )
