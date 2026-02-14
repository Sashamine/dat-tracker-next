# BTBT Post-Fix Verification
**Date:** 2026-02-16

## 1. StalenessNote Per-Metric Mode ✅

Screenshot: `staleness-permetric.jpg`

The Balance Sheet card shows individual stale metrics:
- **Burn rate** — 320 days old (as of Mar 30, 2025)
- **Cash** — 137 days old (as of Sep 29, 2025)
- **Debt** — 135 days old (as of Oct 1, 2025)

Per-metric staleness working correctly.

## 2. Provenance Citations Upgraded ✅

File: `src/lib/data/provenance/btbt.ts`

| Metric | Source Type | Verified |
|--------|-------------|----------|
| Cash | `xbrlSource` (was docSource) | ✅ `us-gaap:CashAndCashEquivalentsAtCarryingValue` |
| Debt | SEC 8-K document URL | ✅ `ea0258193-8k_bitdigital.htm` |
| Holdings | SEC cross-ref in comment | ✅ `0001213900-26-011802` |
| Shares | XBRL cross-ref in comment | ✅ `323,674,831 (Nov 10)` |

## 3. Data Freshness ✅

File: `src/lib/data/companies.ts`

| Field | Expected | Actual | Match |
|-------|----------|--------|-------|
| holdings | 155,239 | 155_239 | ✅ |
| holdingsLastUpdated | 2026-01-31 | "2026-01-31" | ✅ |
| sharesForMnav | 324,202,059 | 324_202_059 | ✅ |
| sharesAsOf | 2026-01-31 | "2026-01-31" | ✅ |

---

**All changes verified and working.**
