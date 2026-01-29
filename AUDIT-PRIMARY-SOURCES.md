# DAT Tracker Primary Source Audit

**Generated:** 2026-01-29
**Last Updated:** 2026-01-29 (Phase 1 complete)
**Purpose:** Ensure all data inputs have verifiable primary sources (SEC filings, regulatory filings, official IR pages)

## Executive Summary

| Category | Issues | Priority | Status |
|----------|--------|----------|--------|
| sharesForMnav | 22 companies | **HIGH** | ✅ FIXED |
| totalDebt | 3 companies | **HIGH** | ✅ FIXED |
| quarterlyBurnUsd | 41 companies | MEDIUM | 🔄 Pending |
| costBasisAvg | 35 companies | MEDIUM | 🔄 Pending |

**Progress:** Reduced from 101 issues to 76 issues (25% reduction)

---

## HIGH PRIORITY: Share Counts (sharesForMnav)

These directly affect mNAV calculations. Need SEC/regulatory filing sources.

| Ticker | Current Value | Needed Action |
|--------|---------------|---------------|
| MSTR | 331,748,000 | Add sharesSource: "strategy.com/shares" |
| 3350.T | 1,118,664,340 | Add sharesSource: "metaplanet.jp/en/shareholders" |
| MARA | 470,000,000 | Add sharesSource: "SEC 10-Q Q3 2025 XBRL" |
| RIOT | 403,000,000 | Add sharesSource: "SEC 10-Q Q3 2025" |
| CLSK | 255,750,361 | Add sharesSource: "SEC DEF 14A Jan 2026" |
| XXI | 651,390,912 | Add sharesSource: "SEC S-1/8-K" |
| ASST | 1,247,436,814 | Add sharesSource: "SEC DEF 14C Jan 2026" |
| NAKA | 511,555,864 | Already has inline source, add field |
| DJT | 279,997,636 | Add sharesSource: "SEC 10-Q Q3 2025" |
| ABTC | 899,489,426 | Add sharesSource: "SEC 10-Q Q3 2025" |
| NXTT | 2,865,730 | Add sharesSource: "SEC 10-Q Q3 2025" |
| BMNR | 455,000,000 | Add sharesSource: "SEC 8-K Jan 2026" |
| SBET | 196,690,000 | Add sharesSource: "SEC 10-Q Q3 2025" |
| BTBT | 323,792,059 | Already has inline source, add field |
| ALTBG | 226,884,068 | Add sharesSource: "mNAV.com / cptlb.com/analytics" |
| FWDI | 112,505,114 | Already has inline source, add field |
| HSDT | 75,900,000 | Add sharesSource: "SEC Q3 2025 press release" |
| DFDV | 29,892,800 | Add sharesSource: "Company press release Jan 2026" |
| UPXI | 61,761,756 | Add sharesSource: "SEC 10-Q Sep 2025 + PIPE" |
| PURR | 127,025,563 | Add sharesSource: "SEC 10-Q Dec 2025" |
| BNC | 52,800,000 | Add sharesSource: "SEC 8-K Aug 2025 PIPE" |
| IHLDF | 65,000,000 | Add sharesSource (OTC - company IR page) |

---

## HIGH PRIORITY: Debt Sources

These affect Enterprise Value calculations.

| Ticker | totalDebt | Needed Source |
|--------|-----------|---------------|
| DFDV | $186,000,000 | SEC 10-Q Q3 2025 + dashboard |
| UPXI | $200,000,000 | SEC 8-K Jul 2025 + Jan 2026 |
| AVX | $1,414,415 | SEC 10-Q Sep 2025 (legacy) |

---

## MEDIUM PRIORITY: Cost Basis Sources

costBasisAvg should reference:
- SEC 8-K filings with purchase prices
- purchases-history.ts calculations
- Company dashboards (where available)

**Companies with verified purchases-history.ts data:**
- BMNR ✓ (calculated from purchase history)
- SBET ✓ (calculated from purchase history)
- KULR ✓ (calculated from purchase history)
- XXI ✓ (calculated from purchase history)

**Companies needing source verification (35 total):**
Most can be verified by:
1. Cross-referencing SEC 8-K filings for purchase announcements
2. Adding "// Calculated from purchases-history.ts" comment
3. Adding costBasisSource field with SEC filing reference

---

## MEDIUM PRIORITY: Quarterly Burn Sources

quarterlyBurnUsd should be derived from:
- SEC 10-Q/10-K "Net cash used in operating activities"
- Or company-specific calculation methodology

**Verified with burnSource:**
- FGNX ✓ (SEC 10-Q Q3 2025)
- NA ✓ (SEC 6-K H1 2025)

**Need burnSource (41 companies)** - calculate from SEC cash flow statements

---

## Field Naming Convention

For consistency, all source tracking should use:

```typescript
// For holdings
holdings: 100_000,
holdingsLastUpdated: "2026-01-20",
holdingsSource: "sec-filing",  // or "press-release", "company-website", "regulatory-filing"
holdingsSourceUrl: "https://www.sec.gov/...",

// For shares
sharesForMnav: 50_000_000,
sharesAsOf: "2026-01-20",
sharesSource: "SEC 10-Q Q3 2025 cover page",
sharesSourceUrl: "https://www.sec.gov/...",  // optional but preferred

// For cash
cashReserves: 100_000_000,
cashAsOf: "2025-09-30",
cashSource: "SEC 10-Q Q3 2025",
cashSourceUrl: "https://www.sec.gov/...",  // optional

// For debt
totalDebt: 500_000_000,
debtAsOf: "2025-09-30",
debtSource: "SEC 10-Q Q3 2025 XBRL",
debtSourceUrl: "https://www.sec.gov/...",  // optional

// For burn rate
quarterlyBurnUsd: 5_000_000,
burnSource: "SEC 10-Q Q3 2025 - Net cash used in operating activities / 3",
burnSourceUrl: "https://www.sec.gov/...",  // optional
burnAsOf: "2025-09-30",

// For cost basis
costBasisAvg: 75_000,
costBasisSource: "SEC 8-K Jan 2026 (latest purchase price)",  // or "Calculated from purchases-history.ts"
```

---

## Recommended Fix Priority

### Phase 1: High Priority (affects mNAV accuracy)
1. Add `sharesSource` field to 22 companies
2. Add `debtSource` field to 3 companies
3. ~4 hours of work

### Phase 2: Medium Priority (data quality)
1. Add `burnSource` to companies with SEC filings
2. Verify `costBasisAvg` via purchases-history.ts or SEC 8-Ks
3. ~8 hours of work

### Phase 3: Ongoing Maintenance
1. Always add source fields when updating any data
2. Prefer SEC URLs over company dashboards where possible
3. Document calculation methodology in comments

---

## Next Steps

1. Run automated script to add missing `sharesSource` fields using existing inline comments
2. Cross-reference holdings-history.ts entries with SEC filings
3. Build SEC XBRL fetcher to auto-populate cash flow data for burn rates
