#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TSX="$ROOT_DIR/node_modules/.bin/tsx"

DLQ_THROTTLE_KEY="sec-dlq-preferred"
DLQ_THROTTLE_DIR="$ROOT_DIR/infra/dlq-throttle"
DLQ_THROTTLE_FILE="$DLQ_THROTTLE_DIR/$DLQ_THROTTLE_KEY-$(date -u +%Y-%m-%d).flag"

TICKERS=$($TSX "$ROOT_DIR/scripts/sec/list-missing-fields.ts" preferred || true)

if [[ -z "$(echo "$TICKERS" | tr -d '[:space:]')" ]]; then
  TICKERS=$($TSX -e "import { allCompanies } from '$ROOT_DIR/src/lib/data/companies'; const out=[]; for(const c of allCompanies){ if(!c.secCik) continue; if(c.preferredEquity==null) out.push(c.ticker); } process.stdout.write(out.join('\\n'));" || true)
fi

if [[ -z "$(echo "$TICKERS" | tr -d '[:space:]')" ]]; then
  echo "noop: no preferred candidates"
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
  out=$(node "$ROOT_DIR/scripts/sec/apply-preferred-from-companyfacts.js" "$t" 2>/tmp/sec_pref_err.txt || true)
  echo "$out"
  if grep -q "fetch_failed:404" /tmp/sec_pref_err.txt; then
    node "$ROOT_DIR/scripts/sec/dlq-push.js" "{\"kind\":\"sec_companyfacts_404\",\"at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ticker\":\"$t\",\"mode\":\"preferred\"}" || true
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
  (cd "$ROOT_DIR" && npm run -s state:verify:compiled:auto -- --runId preferred-extract-batch)
  (cd "$ROOT_DIR" && git add src/lib/data/companies.ts states infra/latest-verified.json infra/verification-gaps.json infra/STATUS.json infra/dlq-extract.json 2>/dev/null || true)
  if [[ -z "${CI:-}" ]]; then
    (cd "$ROOT_DIR" && git commit -m "chore(sec): apply preferred companyfacts batch" || true)
  fi
elif [[ $dlqChanged -eq 1 ]]; then
  (cd "$ROOT_DIR" && mkdir -p "$DLQ_THROTTLE_DIR")
  if [[ ! -f "$DLQ_THROTTLE_FILE" ]]; then
    (cd "$ROOT_DIR" && git add infra/dlq-extract.json 2>/dev/null || true)
    if [[ -z "${CI:-}" ]]; then
      (cd "$ROOT_DIR" && git commit -m "chore(sec): update preferred DLQ" || true)
    fi
    touch "$DLQ_THROTTLE_FILE"
  else
    echo "noop: DLQ commit throttled for today"
  fi
fi
