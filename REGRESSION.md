# Numerical Regression Snapshots

This repo tracks **computed financial numbers** (holdings, shares, dilution inputs, earnings/HPS fields, and deterministic mNAV outputs) via a snapshot+diff system.

Goal: **refactors must never change numbers** without an intentional update.

## Split-proof corporate actions (2026-02)

Added a `corporate_actions` table in D1 and normalization helpers to make time-series calculations robust to stock splits/reverse splits.

- New D1 migration: `scripts/migrations/009-corporate-actions.sql`
- New D1 table: `corporate_actions`
- New API:
  - `GET /api/d1/corporate-actions?ticker=...`
  - `GET /api/d1/normalize-shares?ticker=...&value=...&as_of=YYYY-MM-DD&basis=current&kind=shares|price`
- New library: `src/lib/corporate-actions.ts`
- Unit tests: `src/lib/corporate-actions.test.ts`
- New extraction script: `scripts/llm-extract-corporate-actions.ts`

Normalization convention:
- `ratio` is the multiplier applied to shares going forward in time at `effective_date`.
- For `basis=current`, values dated before an action are scaled by the product of all later ratios.
- Price normalization is the inverse so that `shares * price` remains invariant.

## Commands

### Generate / refresh snapshot

```bash
npm run snapshot
```

This writes:

- `snapshots/numerical-snapshot.json`

### Diff two snapshots

```bash
npm run diff-snapshot -- snapshots/numerical-snapshot.json snapshots/numerical-snapshot.json
```

Exit codes:
- `0` = identical
- `1` = differences found
- `2` = usage error

## What’s inside the snapshot

- `companies` (keyed by ticker):
  - raw inputs used across the app (holdings, sharesForMnav, cash, debt, preferred, etc.)
  - dilution/effective-shares calculation at a deterministic stock price
  - deterministic `mNAV` and breakdown (EV, NAV, materiality flags)
- `dilutiveInstruments` (keyed by ticker):
  - instrument strike, potentialShares, faceValue, dates
- `earnings` (keyed by ticker):
  - quarterly earnings calendar + `holdingsAtQuarterEnd`, `sharesAtQuarterEnd`, `holdingsPerShare`, and other numeric fields

## Determinism (important)

The snapshot script does **not** fetch live market data.
It uses fixed synthetic prices so the output is stable across machines and time.

If you intentionally change core number logic or data, regenerate the snapshot and commit the updated baseline.
