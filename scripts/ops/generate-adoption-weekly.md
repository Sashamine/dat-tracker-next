# Generate Weekly Adoption Snapshot

This playbook calls the admin adoption-signals endpoint and writes a markdown snapshot file to `ops/adoption/YYYY-MM-DD.md`.

## Prereqs

- Set one of: `CRON_SECRET` or `DAT_MONITOR_AUTH` (must match server config).
- App reachable at `BASE_URL` (defaults to `http://localhost:3000`).
- `jq` installed.

## Run

```bash
BASE_URL="${BASE_URL:-http://localhost:3000}"
TOKEN="${TOKEN:-${DAT_MONITOR_AUTH:-$CRON_SECRET}}"
DATE_UTC="$(date -u +%F)"
OUT_DIR="ops/adoption"
OUT_FILE="${OUT_DIR}/${DATE_UTC}.md"

mkdir -p "${OUT_DIR}"

curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE_URL}/api/admin/adoption-signals?window=7d" \
  > /tmp/adoption-signals-weekly.json

curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  "${BASE_URL}/api/admin/adoption-signals?window=7d&offsetDays=7" \
  > /tmp/adoption-signals-weekly-prior.json

cat > "${OUT_FILE}" <<EOF
# Adoption Signals Weekly Snapshot (${DATE_UTC})

Window: 7d
Generated (UTC): $(jq -r '.generated_at // now | tostring' /tmp/adoption-signals-weekly.json)

## Users

- Unique users: $(jq -r '.metrics.unique_users // 0' /tmp/adoption-signals-weekly.json)
- Returning users: $(jq -r '.metrics.returning_users // 0' /tmp/adoption-signals-weekly.json)

## Citation Funnel

- Citation opens: $(jq -r '.metrics.citations.opens // 0' /tmp/adoption-signals-weekly.json)
- Source clicks: $(jq -r '.metrics.citations.source_clicks // 0' /tmp/adoption-signals-weekly.json)
- CTR: $(jq -r '.metrics.citations.ctr // 0' /tmp/adoption-signals-weekly.json)

## Adoption Summary (<60s Read)

- API calls (7d): $(jq -r '.metrics.adoption_summary.api_calls_total // 0' /tmp/adoption-signals-weekly.json)
- Citation open rate (opens / unique users): $(jq -r '.metrics.adoption_summary.citation_open_rate // 0' /tmp/adoption-signals-weekly.json)
- Source click rate (clicks / unique users): $(jq -r '.metrics.adoption_summary.source_click_rate // 0' /tmp/adoption-signals-weekly.json)
- History usage rate (history events / unique users): $(jq -r '.metrics.adoption_summary.history_usage_rate // 0' /tmp/adoption-signals-weekly.json)

## Week-over-Week Delta (current 7d vs prior 7d)

- Unique users delta: $(jq -n --argjson c "$(jq -r '.metrics.unique_users // 0' /tmp/adoption-signals-weekly.json)" --argjson p "$(jq -r '.metrics.unique_users // 0' /tmp/adoption-signals-weekly-prior.json)" '($c - $p)')
- API calls delta: $(jq -n --argjson c "$(jq -r '.metrics.adoption_summary.api_calls_total // 0' /tmp/adoption-signals-weekly.json)" --argjson p "$(jq -r '.metrics.adoption_summary.api_calls_total // 0' /tmp/adoption-signals-weekly-prior.json)" '($c - $p)')

## Top API Routes

$(jq -r '.metrics.api_calls_by_route[]? | "- \(.route): \(.count)"' /tmp/adoption-signals-weekly.json)

## API Calls by Caller Type

$(jq -r '.metrics.api_calls_by_client[]? | "- \(.client): \(.count)"' /tmp/adoption-signals-weekly.json)

## Most Viewed Companies

$(jq -r '.metrics.most_viewed_companies[]? | "- \(.ticker): \(.count)"' /tmp/adoption-signals-weekly.json)

## Most Queried Metrics

$(jq -r '.metrics.most_queried_metrics[]? | "- \(.metric): \(.count)"' /tmp/adoption-signals-weekly.json)

## History Heatmap (Top 20 metric x ticker)

$(jq -r '.metrics.history_usage_heatmap[]? | "- \(.metric) x \(.ticker): \(.count)"' /tmp/adoption-signals-weekly.json)
EOF

echo "Wrote ${OUT_FILE}"
```
