#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/scripts/state/verify-company-states.ts"
OUT="$ROOT/dist-scripts/state/verify-company-states.js"
STAMP="$ROOT/dist-scripts/.verify-company-states.src-mtime"

src_mtime=$(stat -f "%m" "$SRC")
out_mtime=0
if [[ -f "$OUT" ]]; then
  out_mtime=$(stat -f "%m" "$OUT")
fi

# Rebuild if src is newer than output OR stamp missing
if [[ ! -f "$OUT" || $src_mtime -gt $out_mtime || ! -f "$STAMP" ]]; then
  echo "rebuild: verifier TS newer than dist; compiling..." >&2
  (cd "$ROOT" && npm run -s state:verify:build)
  echo "$src_mtime" > "$STAMP"
fi

exec node "$OUT" "$@"
