#!/usr/bin/env bash
set -euo pipefail

# Generate a weekly adoption snapshot from the admin adoption-signals API.
#
# Required env:
#   ADMIN_SECRET   — admin auth token (x-admin-secret header)
#
# Optional env:
#   BASE_URL       — app origin (default: https://dat-tracker-next.vercel.app)
#   WINDOW         — time window (default: 7d)

BASE_URL="${BASE_URL:-https://dat-tracker-next.vercel.app}"
WINDOW="${WINDOW:-7d}"
DATE_UTC="$(date -u +%F)"
OUT_DIR="ops/adoption"
OUT_FILE="${OUT_DIR}/${DATE_UTC}.md"

if [ -z "${ADMIN_SECRET:-}" ]; then
  echo "ERROR: ADMIN_SECRET is required" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "Fetching adoption signals (window=${WINDOW}) from ${BASE_URL} ..."
TMP="/tmp/adoption-signals-${DATE_UTC}.json"

HTTP_CODE=$(curl -sS -o "${TMP}" -w '%{http_code}' \
  -H "x-admin-secret: ${ADMIN_SECRET}" \
  "${BASE_URL}/api/admin/adoption-signals?window=${WINDOW}")

if [ "${HTTP_CODE}" != "200" ]; then
  echo "ERROR: API returned HTTP ${HTTP_CODE}" >&2
  cat "${TMP}" >&2
  exit 1
fi

# Verify jq can parse
if ! jq -e '.success' "${TMP}" > /dev/null 2>&1; then
  echo "ERROR: Response is not valid JSON or success=false" >&2
  cat "${TMP}" >&2
  exit 1
fi

GENERATED_AT=$(jq -r '.generated_at // empty' "${TMP}")

cat > "${OUT_FILE}" <<SNAPSHOT
# Adoption Signals — Week of ${DATE_UTC}

| Field | Value |
|-------|-------|
| Window | ${WINDOW} |
| Generated (UTC) | ${GENERATED_AT} |

## Users

| Metric | Count |
|--------|-------|
| Unique users | $(jq -r '.metrics.unique_users // 0' "${TMP}") |
| Returning users | $(jq -r '.metrics.returning_users // 0' "${TMP}") |

## Citation Funnel

| Metric | Count |
|--------|-------|
| Citation opens | $(jq -r '.metrics.citations.opens // 0' "${TMP}") |
| Source clicks | $(jq -r '.metrics.citations.source_clicks // 0' "${TMP}") |
| CTR | $(jq -r '.metrics.citations.ctr // 0' "${TMP}") |

## Top API Routes

| Route | Calls |
|-------|-------|
$(jq -r '.metrics.api_calls_by_route[]? | "| \(.route) | \(.count) |"' "${TMP}")

## Most Viewed Companies

| Ticker | Views |
|--------|-------|
$(jq -r '.metrics.most_viewed_companies[]? | "| \(.ticker) | \(.count) |"' "${TMP}")

## Most Queried Metrics

| Metric | Queries |
|--------|---------|
$(jq -r '.metrics.most_queried_metrics[]? | "| \(.metric) | \(.count) |"' "${TMP}")

## History Heatmap (Top 20)

| Metric | Ticker | Count |
|--------|--------|-------|
$(jq -r '.metrics.history_usage_heatmap[]? | "| \(.metric) | \(.ticker) | \(.count) |"' "${TMP}")
SNAPSHOT

echo "Wrote ${OUT_FILE}"
