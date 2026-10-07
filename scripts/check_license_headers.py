# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
"""Check tracked first-party source headers without importing application code."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {".py", ".js", ".jsx", ".css", ".html", ".yml", ".yaml", ".mjs", ".cjs"}


def main():
    tracked = subprocess.check_output(
        ["git", "-c", f"safe.directory={ROOT}", "ls-files", "-z"], cwd=ROOT
    ).decode().split("\0")
    missing = []
    checked = 0
    for name in tracked:
        path = ROOT / name
        if not name or not path.is_file() or path.suffix.lower() not in EXTENSIONS:
            continue
        if any(part in {"node_modules", ".venv", "dist", ".git"} for part in path.parts):
            continue
        checked += 1
        data = path.read_bytes()
        text = data.decode("utf-16") if data.startswith((b"\xff\xfe", b"\xfe\xff")) else data.decode("utf-8-sig", errors="replace")
        if "SPDX-License-Identifier: GPL-3.0-or-later" not in text[:1800]:
            missing.append(name)
    if missing:
        print("Missing SPDX headers:\n" + "\n".join(missing))
        return 1
    print(f"License headers OK: {checked} tracked source files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
