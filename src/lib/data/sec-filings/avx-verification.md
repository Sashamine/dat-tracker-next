# AVX (AVAX One Technology) - SEC Filing Verification

**CIK:** 1826397  
**Asset:** AVAX  
**Verified:** 2026-01-29  
**Status:** ⚠️ INCOMPLETE - Holdings not SEC-verifiable until Q4 2025 10-K

---

## Critical Finding

**The AVAX holdings are NOT in any SEC filing yet.**

- 10-Q period: Q3 2025 (Jul 1 - Sep 30, 2025)
- PIPE closed: Nov 5, 2025 (AFTER quarter end)
- Digital assets on Sep 30 balance sheet: **$1,079,429** (pre-PIPE BTC mining)
- Next filing with AVAX: Q4 2025 10-K (expected Feb/Mar 2026)

**Until then, only source for AVAX count is company dashboard.**

---

## SEC-Verified Data

### Shares Outstanding
| Date | Shares | Source |
|------|--------|--------|
| Nov 14, 2025 | **93,112,148** | 10-Q cover page |

### Dilutive Instruments
| Type | Amount | Strike | Expiration | Source |
|------|--------|--------|------------|--------|
| Pre-funded Warrants | 6,123,837 | $0.0001 | None | 8-K Nov 6, 2025 |

### Debt (as of Sep 30, 2025)
| Type | Amount | Source |
|------|--------|--------|
| Debentures (current) | $1,372,679 | 10-Q XBRL |
| Long-term debt | $41,736 | 10-Q XBRL |
| **Total Debt** | **$1,414,415** | 10-Q |

*Note: Legacy debentures from AgriFORCE era, not related to AVAX treasury.*

### Digital Assets (as of Sep 30, 2025 - PRE-PIPE)
| Asset | Fair Value | Source |
|-------|------------|--------|
| Crypto (BTC from mining) | $1,079,429 | 10-Q XBRL |

*This is BEFORE the PIPE - does NOT include AVAX treasury.*

---

## PIPE Transaction (Nov 5, 2025)

From 8-K (0001493152-25-021006):

| Item | Value |
|------|-------|
| Common shares issued | 86,690,657 |
| Pre-funded warrants | 6,123,837 @ $0.0001 |
| Total purchase price | $219,042,206 |
| Cash/stablecoins | $145,375,936 |
| AVAX tokens contributed | $73,666,270 (at VWAP) |

**AVAX received is in USD, not token count.** At ~$30/AVAX VWAP, this would be ~2.4M AVAX from investors.
Remaining cash (~$145M) was to be used to buy more AVAX.

---

## Post-PIPE Updates (from 8-Ks)

### Jan 28, 2026 (0001493152-26-004069)
- **Staking**: 90%+ of AVAX holdings staked
- **Staking rewards**: ~$600K generated through Dec 31, 2025
- **Expected Q1 2026 rewards**: ~180,000 AVAX (~$2M)
- **Buybacks**: 649,845 shares repurchased @ $1.71 avg through Jan 25
- **Dashboard reference**: https://analytics-avaxone.theblueprint.xyz/

### Name Change (Nov 13, 2025)
- Changed from AgriFORCE Growing Systems to AVAX One Technology
- Ticker changed to AVX

---

## Dashboard Data (NOT SEC)

From https://analytics-avaxone.theblueprint.xyz/ (Jan 28, 2026):
- Holdings: **13.871M AVAX**
- Shares: **92.672M** (after buybacks)

---

## Summary for DATCAP

### What we CAN verify from SEC:
- ✅ Shares: 93,112,148 (10-Q Nov 14)
- ✅ Pre-funded warrants: 6,123,837 @ $0.0001
- ✅ PIPE details: $219M total, $73.7M in AVAX tokens
- ✅ Total debt: ~$1.4M (minimal)
- ✅ Buybacks: 649,845 shares through Jan 25

### What we CANNOT verify from SEC:
- ❌ Actual AVAX token count (only $ value in 8-K)
- ❌ Current holdings (Q3 10-Q is pre-PIPE)
- ❌ Cost basis per AVAX

### Recommended Approach:
1. Use dashboard for holdings (13.87M AVAX) with clear sourcing
2. Flag as "company-reported, not SEC-verified"
3. Re-verify when Q4 2025 10-K is filed

---

## Filing Inventory

| Accession | Type | Date | Period | Key Content |
|-----------|------|------|--------|-------------|
| 0001493152-26-004069 | 8-K | 2026-01-28 | - | Strategic update, buybacks, staking |
| 0001493152-26-003716 | 8-K | 2026-01-27 | - | Presentation |
| 0001493152-26-003637 | 8-K | 2026-01-26 | - | Other events |
| 0001493152-26-003635 | 424B5 | 2026-01-26 | - | Prospectus supplement |
| 0001493152-26-001125 | S-3/A | 2026-01-09 | - | Shelf registration |
| 0001493152-25-026425 | S-3 | 2025-12-05 | - | Shelf registration |
| 0001493152-25-024469 | 8-K | 2025-11-20 | - | $40M buyback announcement |
| **0001493152-25-023464** | **10-Q** | 2025-11-14 | **Q3 2025** | **Last financials (pre-PIPE)** |
| 0001493152-25-022400 | 8-K | 2025-11-13 | - | Name change to AVAX One |
| 0001493152-25-021948 | 8-K | 2025-11-12 | - | New officers, RSU grants |
| **0001493152-25-021006** | **8-K** | 2025-11-06 | - | **PIPE closing - key transaction data** |
| 0001493152-25-019747 | 8-K | 2025-10-27 | - | Treasury strategy announcement |
| 0001493152-25-019013 | 8-K | 2025-10-23 | - | Subscription agreements |
| 0001493152-25-018839 | 424B5 | 2025-10-22 | - | PIPE prospectus |

---

## Data for companies.ts

```typescript
{
  ticker: "AVX",
  asset: "AVAX",
  holdings: 13_871_000,  // ⚠️ Dashboard only - not SEC verified
  holdingsSource: "company-dashboard",  // Flag clearly
  holdingsSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
  holdingsLastUpdated: "2026-01-28",
  sharesForMnav: 93_112_148,  // SEC 10-Q Nov 14, 2025
  totalDebt: 1_414_415,  // SEC 10-Q Sep 30, 2025 (legacy, pre-PIPE)
  secCik: "1826397",
}
```

## Data for dilutive-instruments.ts

```typescript
AVX: [
  {
    type: "warrant",
    strikePrice: 0.0001,  // Pre-funded, essentially always ITM
    potentialShares: 6_123_837,
    source: "8-K Nov 6, 2025 (PIPE closing)",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225021006/form8-k.htm",
    issuedDate: "2025-11-05",
    notes: "Pre-funded warrants from $219M PIPE",
  },
]
```
