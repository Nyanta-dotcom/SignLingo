"""C7: warn when source changes exceed ~100 added lines (docs/06 §5). Warning only."""
import subprocess
import sys

LIMIT = 100
SKIP = ("tests/", ".test.", ".spec.", "lock", ".json", ".md", ".docx", "docs/")

base = sys.argv[1] if len(sys.argv) > 1 else "HEAD~1"
out = subprocess.run(
    ["git", "diff", "--numstat", base], capture_output=True, text=True, check=False
).stdout
added = 0
for line in out.splitlines():
    a, _, name = line.split("\t", 2)
    if a.isdigit() and not any(s in name for s in SKIP):
        added += int(a)
if added > LIMIT:
    print(f"::warning::{added} source lines added (> {LIMIT}); consider splitting the task.")
else:
    print(f"OK: {added} source lines added (limit {LIMIT}).")
