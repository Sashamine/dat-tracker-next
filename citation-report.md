# Citation Verification Report
Generated: 2026-02-14

## Summary

| Company | ✅ Pass | ❌ Fail | ⚠️ Warn | ⏭️ Skip | Status |
|---------|--------|--------|---------|---------|--------|
| ABTC | 4 | 0 | 1 | 0 | ⚠️ |
| UPXI | 4 | 0 | 2 | 0 | ⚠️ |
| **TOTAL** | **8** | **0** | **3** | **0** | ⚠️ |

## ABTC

### ⚠️ Warnings

- **totalDebt** (0)
  - URL: `https://data.sec.gov/api/xbrl/companyfacts/CIK0001755953.json`
  - Search term: "0"
  - Details: Value 0 not found in XBRL data for fact 'us-gaap:LongTermDebt'. Check if the value or fact name has changed.

### ✅ Passed

- **cashReserves** (7976000) — Found val=7976000 in USD (filed 2025-11-14, period 2025-09-30)
- **quarterlyBurn** (8052000) — Found val=8052000 in USD (filed 2025-11-14, period 2025-09-30)
- **holdings** (5098) — ✓ "5,098 Bitcoin", ✓ "5,098", ✓ "held approximately 5,098 Bitcoin in its strategic "
- **sharesOutstanding** (899489426) — ✓ EFTS: "899,489,426" found in 8-K (0001193125-25-281406:abtc-ex99_1.htm)

## UPXI

### ⚠️ Warnings

- **quarterlyBurn** (12461887)
  - URL: `https://data.sec.gov/api/xbrl/companyfacts/CIK0001775194.json`
  - Search term: "12,461,887"
  - Details: Value 12461887 not found in XBRL data for fact 'us-gaap:NetCashProvidedByUsedInOperatingActivities'. Check if the value or fact name has changed.

- **preferredEquity** (0)
  - URL: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`
  - Details: Value not found. Searched: ✗ "Preferred stock, \$0\.00001 par value, 150,000 sha", (crawled 4/93 filing docs)

### ✅ Passed

- **sharesOutstanding** (69760581) — Found val=69760581 in shares (filed 2026-02-10, period 2026-02-09)
- **holdings** (LATEST_HOLDINGS) — ✓ "2,174,583 SOL as of January 5, 2026"
- **totalDebt** (144115480) — ✓ EFTS: "144,115,480" found in 8-K (0001477932-26-000740:upxi_ex992.htm)
- **cashReserves** (1616765) — ✓ EFTS: "1,616,765" found in 8-K (0001477932-26-000740:upxi_ex992.htm)
