"""PreToolUse hook: block edits to protected paths (docs/06 §4)."""
import json
import sys

PROTECTED = ("ml/data/raw/", "docs/course/", "docs/reports/")

data = json.load(sys.stdin)
path = (data.get("tool_input") or {}).get("file_path", "").replace("\\", "/")
if any(p in path for p in PROTECTED):
    print(f"Blocked: {path} is a protected path (read-only inputs).", file=sys.stderr)
    sys.exit(2)
