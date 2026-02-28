# D1 Artifacts Cleanup + R2→D1 Backfill — Postmortem & Runbook

## 1) What changed

- **Eliminated `source_type='unknown'` artifacts** (brought unknown count to 0).
- **Deduped `artifacts` by `(r2_bucket, r2_key)`**:
  - selected the row with the **max(`fetched_at`)** as the winner
  - **remapped** `datapoints.artifact_id` → winner artifact id
  - **deleted** loser artifact rows
- **Added a unique constraint** to prevent recurrence:
  - unique index on **`(r2_bucket, r2_key)`**
- **Hardened backfill behavior**:
  - R2→D1 backfill only **upgrades** `source_type` when the existing value is **`unknown`** (never overwrites a known `source_type`).

## 2) Why it was needed

- Duplicates in `artifacts` broke the “one object → one artifact row” assumption and polluted joins.
- Unknown `source_type` entries obscured provenance and made verification harder.
- Without a uniqueness constraint, backfills could re-introduce duplicates.
- Remapping `datapoints.artifact_id` was required to preserve data integrity before deleting duplicate artifact rows.

## 3) Invariants (must hold)

- **Uniqueness:** `artifacts` has **at most one** row per `(r2_bucket, r2_key)`.
- **No unknowns:** `artifacts.source_type` contains **no `unknown`** rows.
- **No orphans:** every `datapoints.artifact_id` references an existing `artifacts.id`.
- **Backfill safety:** ingestion/backfill logic must **not downgrade/overwrite** a known `source_type`.

## 4) How to verify (D1 SQL)

Run these in D1 (or via the repo’s ad-hoc query workflow).

### A) Confirm no duplicate keys
```sql
SELECT r2_bucket, r2_key, COUNT(*) AS cnt
FROM artifacts
GROUP BY r2_bucket, r2_key
HAVING cnt > 1;
```
Expected: **0 rows**

### B) Confirm no unknown source types
```sql
SELECT COUNT(*) AS unknown_cnt
FROM artifacts
WHERE source_type = 'unknown';
```
Expected: `unknown_cnt = 0`

### C) Confirm `datapoints` has no orphaned `artifact_id`
```sql
SELECT dp.id
FROM datapoints dp
LEFT JOIN artifacts a ON a.id = dp.artifact_id
WHERE dp.artifact_id IS NOT NULL
  AND a.id IS NULL
LIMIT 50;
```
Expected: **0 rows**

## 5) How to (re)run safely

### R2 inventory → D1 artifacts backfill
Use the workflow **“R2 Inventory → D1 Artifacts Backfill”**.

Recommended progression:
1. **Dry run first** (`dry_run=true`, small `max_objects`, optional `r2_prefix`)
2. If clean, run **live** (`dry_run=false`) with the same prefix/cap
3. Re-run the **Artifacts Summary** + SQL checks above

Notes:
- If you need to resume a large inventory, pass the `cursor` (preferred) or `start_after` from prior output.

## 6) Recovery steps if it regresses

If duplicates or unknowns reappear:

1. **Stop automated ingestion** (or pause scheduled runs) to prevent churn.
2. Re-run the verification SQL from section (4) to quantify the blast radius.
3. If duplicates exist:
   - choose winners by **max(`fetched_at`)** per `(r2_bucket,r2_key)`
   - **remap** `datapoints.artifact_id` → winner
   - delete losers
4. Re-assert the **unique index** on `(r2_bucket, r2_key)` if it was dropped.
5. Re-run section (4) until clean.

## 7) “Do not do” list

- Do **not** delete `artifacts` rows without remapping `datapoints.artifact_id` first.
- Do **not** remove the unique index on `(r2_bucket, r2_key)`.
- Do **not** overwrite known `source_type` values during backfill.
- Do **not** treat directory listings/homepages as citations; cite the **specific** source document.
