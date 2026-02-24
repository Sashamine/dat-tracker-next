#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TSX="$ROOT_DIR/node_modules/.bin/tsx"

DLQ_THROTTLE_KEY="sec-dlq-cash"
DLQ_THROTTLE_DIR="$ROOT_DIR/infra/dlq-throttle"
DLQ_THROTTLE_FILE="$DLQ_THROTTLE_DIR/$DLQ_THROTTLE_KEY-$(date -u +%Y-%m-%d).flag"

TICKERS=$($TSX "$ROOT_DIR/scripts/sec/list-missing-fields.ts" cash || true)

# Fast path: nothing to do
if [[ -z "$(echo "$TICKERS" | tr -d '[:space:]')" ]]; then
  echo "noop: no cash candidates"
  # still chain debt batch
  bash "$ROOT_DIR/scripts/sec/apply-debt-batch.sh"
  exit 0
fi

changed=0
dataChanged=0
dlqChanged=0
count_ok=0
count_dlq=0
count_noop=0

while IFS= read -r t; do
  [[ -z "$t" ]] && continue
  out=$(node "$ROOT_DIR/scripts/sec/apply-cash-from-companyfacts.js" "$t" 2>/tmp/sec_cash_err.txt || true)
  echo "$out"

  if grep -q "fetch_failed:404" /tmp/sec_cash_err.txt; then
    node "$ROOT_DIR/scripts/sec/dlq-push.js" "{\"kind\":\"sec_companyfacts_404\",\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ticker\":\"$t\",\"mode\":\"cash\"}" || true
    echo "dlq: companyfacts 404"
    changed=1
    dlqChanged=1
  fi

  if [[ "$out" == ok:* ]]; then
    count_ok=$((count_ok+1))
    changed=1
    dataChanged=1
  elif [[ "$out" == dlq:* ]]; then
    count_dlq=$((count_dlq+1))
    changed=1
    dlqChanged=1
  elif [[ "$out" == noop:* ]]; then
    count_noop=$((count_noop+1))
  fi

done <<< "$TICKERS"

echo "summary: ok=$count_ok dlq=$count_dlq noop=$count_noop"

if [[ $dataChanged -eq 1 ]]; then
  (cd "$ROOT_DIR" && npm run -s state:gen:all)
  (cd "$ROOT_DIR" && npm run -s state:verify:compiled:auto -- --runId cash-extract-batch)
  (cd "$ROOT_DIR" && git add src/lib/data/companies.ts states infra/latest-verified.json infra/verification-gaps.json infra/STATUS.json infra/dlq-extract.json 2>/dev/null || true)
  (cd "$ROOT_DIR" && git commit -m "chore(sec): apply cash companyfacts batch" || true)
elif [[ $dlqChanged -eq 1 ]]; then
  (cd "$ROOT_DIR" && mkdir -p "$DLQ_THROTTLE_DIR")
  if [[ ! -f "$DLQ_THROTTLE_FILE" ]]; then
    (cd "$ROOT_DIR" && git add infra/dlq-extract.json 2>/dev/null || true)
    (cd "$ROOT_DIR" && git commit -m "chore(sec): update cash DLQ" || true)
    touch "$DLQ_THROTTLE_FILE"
  else
    echo "noop: DLQ commit throttled for today"
  fi
fi

# Chain debt batch (runs its own regen/verify/commit if needed)
bash "$ROOT_DIR/scripts/sec/apply-debt-batch.sh"

# Chain preferred batch (runs its own regen/verify/commit if needed)
bash "$ROOT_DIR/scripts/sec/apply-preferred-batch.sh"

