#!/usr/bin/env python3
"""Generate a PR comment summarizing newly added SEC companyfacts suppressions.

This script expects to be run inside a git checkout where:
- origin/master exists (or at least master ref)
- HEAD is the PR branch

It diffs origin/master...HEAD for infra/sec-companyfacts-suppress.json and prints a markdown body.
"""

from __future__ import annotations

import re
import subprocess


def sh(cmd: str) -> str:
    return subprocess.check_output(["bash", "-lc", cmd], text=True)


def main() -> None:
    diff = sh("git diff origin/master...HEAD -- infra/sec-companyfacts-suppress.json || true")

    section: str | None = None
    added: dict[str, list[str]] = {"cash": [], "debt": [], "preferred": []}

    for line in diff.splitlines():
        if line.startswith(("+++", "---", "@@")):
            continue

        m = re.match(r'^[ +\-]*"(cash|debt|preferred)"\s*:\s*\[', line)
        if m:
            section = m.group(1)
            continue

        if section and line.startswith("+"):
            m = re.match(r'^\+\s*"([A-Z0-9\.\-]+)"', line)
            if m:
                added[section].append(m.group(1))

    lines: list[str] = []
    for k in ("cash", "debt", "preferred"):
        vals = sorted(set(added[k]))
        if vals:
            lines.append(f"- **{k}**: " + ", ".join(vals))

    body = "**SEC companyfacts suppressions added in this PR:**\n" + ("\n".join(lines) if lines else "(none)")
    print(body)


if __name__ == "__main__":
    main()
