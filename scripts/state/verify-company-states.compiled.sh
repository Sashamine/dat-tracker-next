#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/scripts/state/verify-company-states.ts"
OUT="$ROOT/dist-scripts/state/verify-company-states.js"
STAMP="$ROOT/dist-scripts/.verify-company-states.src-mtime"

# Cross-platform mtime (macOS uses stat -f, Linux uses stat -c)
mtime() {
  local file="$1"
  if stat -f "%m" "$file" >/dev/null 2>&1; then
    stat -f "%m" "$file"
  else
    stat -c "%Y" "$file"
  fi
}

src_mtime=$(mtime "$SRC")
out_mtime=0
if [[ -f "$OUT" ]]; then
  out_mtime=$(mtime "$OUT")
fi

# Rebuild if src is newer than output OR stamp missing
if [[ ! -f "$OUT" || $src_mtime -gt $out_mtime || ! -f "$STAMP" ]]; then
  echo "rebuild: verifier TS newer than dist; compiling..." >&2
  (cd "$ROOT" && npm run -s state:verify:build)
  echo "$src_mtime" > "$STAMP"
fi

exec node "$OUT" "$@"
