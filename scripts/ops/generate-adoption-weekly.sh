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
TMP_PRIOR="/tmp/adoption-signals-${DATE_UTC}-prior.json"

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

HTTP_CODE_PRIOR=$(curl -sS -o "${TMP_PRIOR}" -w '%{http_code}' \
  -H "x-admin-secret: ${ADMIN_SECRET}" \
  "${BASE_URL}/api/admin/adoption-signals?window=${WINDOW}&offsetDays=7")

if [ "${HTTP_CODE_PRIOR}" != "200" ]; then
  echo "ERROR: Prior-window API returned HTTP ${HTTP_CODE_PRIOR}" >&2
  cat "${TMP_PRIOR}" >&2
  exit 1
fi

if ! jq -e '.success' "${TMP_PRIOR}" > /dev/null 2>&1; then
  echo "ERROR: Prior-window response is not valid JSON or success=false" >&2
  cat "${TMP_PRIOR}" >&2
  exit 1
fi

GENERATED_AT=$(jq -r '.generated_at // empty' "${TMP}")

delta_value() {
  local current="$1"
  local prior="$2"
  jq -nr --argjson c "${current}" --argjson p "${prior}" '($c - $p)'
}

delta_signed() {
  local current="$1"
  local prior="$2"
  jq -nr --argjson c "${current}" --argjson p "${prior}" '
    ($c - $p) as $d
    | if $d > 0 then "+" + ($d|tostring) else ($d|tostring) end
  '
}

CURRENT_UNIQUE_USERS=$(jq -r '.metrics.unique_users // 0' "${TMP}")
PRIOR_UNIQUE_USERS=$(jq -r '.metrics.unique_users // 0' "${TMP_PRIOR}")
CURRENT_RETURNING_USERS=$(jq -r '.metrics.returning_users // 0' "${TMP}")
PRIOR_RETURNING_USERS=$(jq -r '.metrics.returning_users // 0' "${TMP_PRIOR}")
CURRENT_API_CALLS_TOTAL=$(jq -r '.metrics.adoption_summary.api_calls_total // 0' "${TMP}")
PRIOR_API_CALLS_TOTAL=$(jq -r '.metrics.adoption_summary.api_calls_total // 0' "${TMP_PRIOR}")
CURRENT_CITATION_OPEN_RATE=$(jq -r '.metrics.adoption_summary.citation_open_rate // 0' "${TMP}")
PRIOR_CITATION_OPEN_RATE=$(jq -r '.metrics.adoption_summary.citation_open_rate // 0' "${TMP_PRIOR}")
CURRENT_SOURCE_CLICK_RATE=$(jq -r '.metrics.adoption_summary.source_click_rate // 0' "${TMP}")
PRIOR_SOURCE_CLICK_RATE=$(jq -r '.metrics.adoption_summary.source_click_rate // 0' "${TMP_PRIOR}")
CURRENT_HISTORY_USAGE_RATE=$(jq -r '.metrics.adoption_summary.history_usage_rate // 0' "${TMP}")
PRIOR_HISTORY_USAGE_RATE=$(jq -r '.metrics.adoption_summary.history_usage_rate // 0' "${TMP_PRIOR}")

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

## Adoption Summary (<60s Read)

| Metric | Value |
|--------|-------|
| API calls (7d) | ${CURRENT_API_CALLS_TOTAL} |
| Citation open rate (opens / unique users) | ${CURRENT_CITATION_OPEN_RATE} |
| Source click rate (clicks / unique users) | ${CURRENT_SOURCE_CLICK_RATE} |
| History usage rate (history events / unique users) | ${CURRENT_HISTORY_USAGE_RATE} |

## Week-over-Week Delta (current 7d vs prior 7d)

| Metric | Current | Prior | Delta |
|--------|---------|-------|-------|
| Unique users | ${CURRENT_UNIQUE_USERS} | ${PRIOR_UNIQUE_USERS} | $(delta_signed "${CURRENT_UNIQUE_USERS}" "${PRIOR_UNIQUE_USERS}") |
| Returning users | ${CURRENT_RETURNING_USERS} | ${PRIOR_RETURNING_USERS} | $(delta_signed "${CURRENT_RETURNING_USERS}" "${PRIOR_RETURNING_USERS}") |
| API calls | ${CURRENT_API_CALLS_TOTAL} | ${PRIOR_API_CALLS_TOTAL} | $(delta_signed "${CURRENT_API_CALLS_TOTAL}" "${PRIOR_API_CALLS_TOTAL}") |
| Citation open rate | ${CURRENT_CITATION_OPEN_RATE} | ${PRIOR_CITATION_OPEN_RATE} | $(delta_value "${CURRENT_CITATION_OPEN_RATE}" "${PRIOR_CITATION_OPEN_RATE}") |
| Source click rate | ${CURRENT_SOURCE_CLICK_RATE} | ${PRIOR_SOURCE_CLICK_RATE} | $(delta_value "${CURRENT_SOURCE_CLICK_RATE}" "${PRIOR_SOURCE_CLICK_RATE}") |
| History usage rate | ${CURRENT_HISTORY_USAGE_RATE} | ${PRIOR_HISTORY_USAGE_RATE} | $(delta_value "${CURRENT_HISTORY_USAGE_RATE}" "${PRIOR_HISTORY_USAGE_RATE}") |

## Top API Routes

| Route | Calls |
|-------|-------|
$(jq -r '.metrics.api_calls_by_route[]? | "| \(.route) | \(.count) |"' "${TMP}")

## API Calls by Caller Type

| Caller | Calls |
|--------|-------|
$(jq -r '.metrics.api_calls_by_client[]? | "| \(.client) | \(.count) |"' "${TMP}")

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
