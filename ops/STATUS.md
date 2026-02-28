# Ops Status (live)

> Keep this file current during Phase 10b/10c so runs are resumable and auditable.

## Current focus
- **Phase 10b** — R2 inventory → D1 artifacts backfill (full backfill; resumable)

## Definition of done (10b)
- Backfill can run **without a prefix** (full dataset) in bounded batches.
- Resuming works via `cursor` / `startAfter` with no duplicates created.
- Post-run checks:
  - `unknownSourceType = 0`
  - `duplicates by (r2_bucket, r2_key) = 0`
  - Artifacts summary totals and per-type breakdown are stable across reruns.

## Last known good
- **2026-02-28**
  - Smoke test backfill (live, non–dry run)
    - Prefix: `bmnr/`
    - max_objects: `2000`
    - scanned: 40 | inserted: 40 | skipped: 0 | errors: 0 | unknownSourceType: 0
    - Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530036691
  - Sanity check summary
    - total: 1011 | unknown: 0 | duplicates: []
    - Run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530058698

## Next actions
1) Add lightweight run ledger for resumability (record cursor/startAfter per batch).
2) Run staged full backfill (dry-run → live) with caps and automatic resume.
3) After each batch: run summary + (if needed) D1 ad-hoc duplicate/unknown checks.
