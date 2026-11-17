"""PostToolUse hook: run `ruff format` on edited Python files under ml/."""
import json
import subprocess
import sys
from pathlib import Path

data = json.load(sys.stdin)
path = (data.get("tool_input") or {}).get("file_path", "").replace("\\", "/")
if path.endswith(".py") and "/ml/" in path:
    ruff = Path(__file__).resolve().parents[2] / "ml" / ".venv" / "Scripts" / "ruff.exe"
    exe = str(ruff) if ruff.exists() else "ruff"
    try:
        subprocess.run([exe, "format", path], check=False, capture_output=True)
    except FileNotFoundError:
        pass  # ruff not installed: skip silently
