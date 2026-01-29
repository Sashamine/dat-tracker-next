# AVX (AVAX One Technology) - SEC Filing Verification

**CIK:** 1826397  
**Asset:** AVAX  
**Verified:** 2026-01-29  

## SEC-Verified Data

### Shares Outstanding
| Date | Shares | Source |
|------|--------|--------|
| Nov 14, 2025 | **93,112,148** | 10-Q (0001493152-25-023464) cover page |

### Dilutive Instruments
| Type | Amount | Strike | Source |
|------|--------|--------|--------|
| Pre-funded Warrants | 6,123,837 | $0.0001 | 8-K Nov 6, 2025 (PIPE closing) |

### PIPE Transaction (Nov 5, 2025)
From 8-K (0001493152-25-021006):
- **86,690,657 common shares** issued
- **6,123,837 pre-funded warrants** issued
- Total purchase price: **$219,042,206**
  - Cash/stablecoins: $145,375,936
  - AVAX tokens contributed: $73,666,270 (at VWAP)

### Buybacks (through Jan 25, 2026)
From 8-K Jan 28, 2026 (0001493152-26-004069):
- **649,845 shares** repurchased
- Total cost: ~$1.1M
- Avg price: $1.71/share

### Staking Activity
From 8-K Jan 28, 2026:
- **90%+ of AVAX holdings** staked
- Expected Q1 2026 staking rewards: ~180,000 AVAX (~$2M)
- Total staking rewards through Dec 31, 2025: ~$600,000

---

## Holdings - NOT directly stated in SEC filings

**The actual AVAX token count is NOT explicitly stated in SEC filings.**

We know:
- $73.7M worth of AVAX was contributed in the PIPE
- Cash proceeds were to be used to acquire additional AVAX
- The company refers investors to their dashboard: https://analytics-avaxone.theblueprint.xyz/

**Dashboard data (Jan 28, 2026):**
- 13.871M AVAX held
- 92.672M shares outstanding (after buybacks)

This creates a data sourcing question: Do we rely on the third-party dashboard, or only SEC-disclosed data?

---

## Filing Summary

| Accession | Type | Date | Key Content |
|-----------|------|------|-------------|
| 0001493152-26-004069 | 8-K | 2026-01-28 | Strategic update, buybacks, staking |
| 0001493152-26-003716 | 8-K | 2026-01-27 | Presentation |
| 0001493152-26-003637 | 8-K | 2026-01-26 | Other events |
| 0001493152-25-023464 | 10-Q | 2025-11-14 | Q3 2025 financials, **93.1M shares** |
| 0001493152-25-022400 | 8-K | 2025-11-13 | Name change to AVAX One |
| 0001493152-25-021948 | 8-K | 2025-11-12 | New officers, equity issuance |
| 0001493152-25-021006 | 8-K | 2025-11-06 | **PIPE closing** - key balance sheet data |
| 0001493152-25-019013 | 8-K | 2025-10-23 | Subscription agreements |
| 0001493152-25-018839 | 424B5 | 2025-10-22 | Prospectus supplement |

---

## Recommended Data for DATCAP

Based on SEC-verified sources:

```typescript
// companies.ts update for AVX
{
  ticker: "AVX",
  asset: "AVAX",
  holdings: 13_800_000,  // Per dashboard - NOT SEC disclosed
  sharesForMnav: 93_112_148,  // SEC 10-Q Nov 14, 2025
  // Note: Dashboard shows 92.67M after buybacks
}

// dilutive-instruments.ts
{
  ticker: "AVX",
  instruments: [
    {
      type: "prefunded-warrant",
      shares: 6_123_837,
      strike: 0.0001,  // Essentially exercisable at any time
      expiration: null,  // No expiration
      source: "8-K 2025-11-06 PIPE closing"
    }
  ]
}
```

## Open Questions

1. **Holdings source**: Dashboard vs SEC - which do we use?
2. **Share count post-buybacks**: Use SEC 10-Q (93.1M) or dashboard (92.67M)?
3. **Do we need to track buyback program remaining capacity?**
