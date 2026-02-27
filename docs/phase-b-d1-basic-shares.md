# Phase B / D1: historical datapoints backfill (quarter-end shares)

## Goal
Backfill **basic_shares** at quarter ends (Q1/Q2/Q3/Q4) into D1 so downstream analytics can compute mNAV, holdings/share, dilution, etc. at consistent quarter-end anchors.

Non-goals (Phase B/D1):
- UI
- perfect filing selection for every non-US issuer
- full holdings backfill (BTC amounts) beyond the shares datapoint

## Normalization + basis conventions (must match existing code)
Existing normalization logic:
- `corporate_actions.ratio` is the forward-in-time multiplicative change to **shares** on the effective date.
- For `basis='current'`, `normalizeShares(shares, actions, asOf)` multiplies by all ratios whose `effective_date > asOf`.

Important edge: **effective_date inclusive**.
- We want actions effective on `YYYY-MM-DD` to apply to datapoints reported **before** that date, but *not* to datapoints reported on/after it.
- That corresponds to `effective_date > asOf` (strict). If we ever change to inclusive (`>=`), we must update both shares + price normalization and re-derive stored values.

**Recommendation:** Keep D1 stored datapoints in **historical/as-reported basis**; normalize at query time to current basis.

## D1 schema (suggested)
This repo already queries D1 tables: `artifacts`, `datapoints`, `latest_datapoints`, and `corporate_actions`.
If your D1 DB doesn’t have the needed columns for quarter-end anchoring, add `period_end` and `form_type` to `artifacts`.

### 1) artifacts (minimum fields used by backfill job)
```sql
-- If not present, add these columns
ALTER TABLE artifacts ADD COLUMN entity_id TEXT;
ALTER TABLE artifacts ADD COLUMN form_type TEXT;
ALTER TABLE artifacts ADD COLUMN period_end TEXT; -- YYYY-MM-DD
ALTER TABLE artifacts ADD COLUMN filed_at TEXT;   -- ISO

CREATE INDEX IF NOT EXISTS idx_artifacts_entity_period
  ON artifacts(entity_id, period_end);
```

### 2) datapoints
Assumed columns (matches code paths in `src/lib/d1.ts`):
```sql
CREATE TABLE IF NOT EXISTS datapoints (
  datapoint_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  scale INTEGER NOT NULL DEFAULT 0,
  as_of TEXT,
  reported_at TEXT,
  artifact_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  method TEXT,
  confidence REAL,
  flags_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_datapoints_entity_metric_asof
  ON datapoints(entity_id, metric, as_of);
CREATE INDEX IF NOT EXISTS idx_datapoints_artifact_metric
  ON datapoints(artifact_id, metric);
```

### 3) latest_datapoints
```sql
CREATE TABLE IF NOT EXISTS latest_datapoints (
  entity_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  datapoint_id TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT NOT NULL,
  scale INTEGER NOT NULL DEFAULT 0,
  as_of TEXT,
  reported_at TEXT,
  artifact_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  method TEXT,
  confidence REAL,
  flags_json TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entity_id, metric)
);
```

## Backfill algorithm (basic_shares)
Given a ticker set and date range:
1. Generate quarter-end dates between `from` and `to`.
2. For each (ticker, quarter_end):
   - Find an `artifacts` row with `entity_id=ticker` and `period_end=quarter_end` and form type in {10-Q,10-K,20-F,40-F,...}.
   - Pull the extracted `basic_shares` datapoint for that artifact.
   - Insert a normalized backfill datapoint into `datapoints` with:
     - `as_of = quarter_end`
     - deterministic `datapoint_id = sha256(entity|metric|as_of|unit|scale)` for idempotency
     - `method = 'backfill_qe'`
     - `flags_json.basis='historical'`
3. Optionally upsert `latest_datapoints(entity_id, metric)` when the inserted `as_of` is >= current latest.

## Validation + idempotency
- Idempotency: deterministic `datapoint_id` + `INSERT OR IGNORE`.
- Validation:
  - numeric finite, > 0
  - optional alert if shares > 50B
  - optionally compare to existing latest_datapoints basic_shares; warn if deviation > X%.

## Queries you’ll want

### Quarter-end series (already normalized at read time)
```sql
SELECT entity_id, as_of, value, unit, scale, artifact_id
FROM datapoints
WHERE entity_id = ?
  AND metric = 'basic_shares'
  AND as_of IS NOT NULL
ORDER BY as_of ASC;
```

### Coverage stats
```sql
SELECT entity_id, COUNT(*) AS n
FROM datapoints
WHERE metric = 'basic_shares' AND as_of IS NOT NULL
GROUP BY entity_id
ORDER BY n DESC;
```

## Minimal job
Script: `scripts/d1-backfill-basic-shares-qe.ts`

Run locally:
```bash
CLOUDFLARE_ACCOUNT_ID=... \
CLOUDFLARE_D1_DATABASE_ID=... \
CLOUDFLARE_API_TOKEN=... \
npx tsx scripts/d1-backfill-basic-shares-qe.ts --tickers=MSTR,MARA --from=2019-01-01 --to=2026-12-31
```

Cloudflare cron option (later): wrap the script logic into a Worker scheduled event and use a durable cursor; for Phase B we keep it as a CLI job.
