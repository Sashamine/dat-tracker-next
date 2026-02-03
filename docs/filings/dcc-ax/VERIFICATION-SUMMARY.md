# DCC.AX (DigitalX Limited) - Verification Summary

## Date Verified: 2026-02-03

## Holdings Verification (ASX Filings)

| Date | Filing | Spot BTC | ETF BTC | Total BTC | Source |
|------|--------|----------|---------|-----------|--------|
| Dec 31, 2025 | Treasury Info | 308.8 | 194.85 | **503.7** | ASX Jan 23, 2026 |
| Nov 30, 2025 | Treasury Info | 308.8 | 194.4 | **503.2** | ASX Dec 17, 2025 |
| Oct 21, 2025 | Dashboard | - | - | **504** | treasury.digitalx.com |

## Key Data Points (Dec 2025 ASX Filing)

| Holdings | Quantity | Value (A$) | % |
|----------|----------|------------|---|
| Spot Bitcoin | 308.8 BTC | $40,533,170 | 51.0% |
| DigitalX Bitcoin ETF (BTXX) | 889,367 units (~194.85 BTC) | $27,486,964 | 34.6% |
| Other Digital Assets | 20,521.4 | $3,831,824 | 4.8% |
| Lime Street Capital SPC | 12.8565 units | $4,851,235 | 6.1% |
| Cash | - | $2,818,951 | 3.5% |
| **Total Treasury Holdings** | | **$79,522,144** | 100% |

## Share Data (ASX Verified)

- **Shares on Issue**: 1,488,510,854 (1.49B)
- **ISIN**: AU000000DCC9
- **Exchange**: ASX (Australia)
- **Market Cap**: ~A$56.56M (at A$0.038)

## Company Dashboard vs ASX Filing

- Dashboard shows 504 BTC (Oct 21, 2025)
- ASX filing shows 503.7 BTC (Dec 31, 2025)
- **Difference**: -0.3 BTC (within rounding)
- **Status**: ✅ VERIFIED

## Structure Notes

- **Not pure spot BTC** - 39% of BTC exposure is via their own ETF (BTXX)
- Has other investments: Lime Street Capital SPC, other digital assets
- Provides monthly Treasury Information announcements

## Files Downloaded

1. `2026-01-23_Treasury-Information-Dec-2025.pdf` (153KB) ✅
2. `2026-01-30_Quarterly-4C-Report.pdf` (385KB) ✅

## Recommended Updates to companies.ts

```typescript
holdings: 504,  // Dec 2025: 503.7 (308.8 direct + 194.9 ETF) - dashboard shows 504
holdingsLastUpdated: "2025-12-31",
holdingsSource: "asx-filing",
holdingsSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html",
notes: "503.7 BTC total: 308.8 direct + 194.85 via BTXX ETF. Also holds Lime Street SPC (~A$4.9M), other digital assets (~A$3.8M). Real-time dashboard: treasury.digitalx.com"
```

---
*Verified by comparing company dashboard against official ASX Treasury Information filings*
