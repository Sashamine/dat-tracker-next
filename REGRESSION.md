# Numerical Regression Snapshots

This repo tracks **computed financial numbers** (holdings, shares, dilution inputs, earnings/HPS fields, and deterministic mNAV outputs) via a snapshot+diff system.

Goal: **refactors must never change numbers** without an intentional update.

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
