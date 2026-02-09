# MSTR Q1 2021 Bitcoin Holdings Reconciliation

**Period:** January 1, 2021 - March 31, 2021  
**Starting BTC:** 70,469 (per 10-K as of Dec 31, 2020)  
**Ending BTC:** 91,326 (per 10-Q as of Mar 31, 2021)  
**Net Change:** +20,857 BTC

---

## Summary

Q1 2021 was a landmark quarter for MicroStrategy's Bitcoin acquisition strategy. The company:
- Purchased **20,857 BTC** for **$1.086 billion** (avg ~$52,087/BTC)
- Issued **$1.05B** in 0% Convertible Senior Notes due 2027 (closed Feb 19)
- Only **1,404 BTC** were announced via individual 8-K filings
- **19,453 BTC** were purchased using convertible note proceeds but NOT separately announced

---

## Documents Examined

### 10-Q Filing (Quarterly Report)
| File | Period | Key Data |
|------|--------|----------|
| `10q/10-Q-2021-04-29.html` | Q1 2021 | 91,326 BTC as of Mar 31, 2021 |

**XBRL Elements:**
- `mstr:NumberOfCarryingValueBitcoins` (contextRef: C_0001050446_20210101_20210331) = 91,326
- `mstr:NumberOfBitcoinsPurchased` = 20,857
- Carrying value: $1.947B (after $264.8M cumulative impairments)

**Anchor Added:** `#btc-holdings-q1-2021`

---

### 8-K Filings (Current Reports)

#### January 2021

| Date | File | BTC Purchased | Cost | Cumulative | Type |
|------|------|---------------|------|------------|------|
| Jan 22 | `8k/8k-2021-01-22-014227.html` | 314 | $10.0M | 70,784 | Purchase |
| Jan 28 | `8k/8k-2021-01-28-020760.html` | — | — | — | Q4 2020 Earnings |

**Anchor Added:** `#btc-purchase-2021-01-22`

#### February 2021

| Date | File | BTC Purchased | Cost | Cumulative | Type |
|------|------|---------------|------|------------|------|
| Feb 2 | `8k/8k-2021-02-02-025369.html` | 295 | $10.0M | 71,079 | Purchase |
| Feb 17 | `8k/8k-2021-02-17-045792.html` | — | ~$879M (est.) | — | Convertible Note Announcement |
| Feb 19 | `8k/8k-2021-02-19-048555.html` | — | $1.03B net | — | Convertible Note Closing |

**Anchors Added:**
- `#btc-purchase-2021-02-02`
- `#btc-funding-2021-02-17`
- `#btc-funding-2021-02-19`

**KEY FINDING:** The Feb 19, 2021 8-K announced closing of $1.05B convertible notes (net proceeds ~$1.03B) with stated intent to acquire bitcoin. However, **no separate 8-K announced the actual purchase** of bitcoin with these proceeds.

#### March 2021

| Date | File | BTC Purchased | Cost | Cumulative | Type |
|------|------|---------------|------|------------|------|
| Mar 1 | `8k/8k-2021-03-01-062322.html` | 328 | $15.0M | 90,859 | Purchase |
| Mar 5 | `8k/8k-2021-03-05-070446.html` | 205 | $10.0M | 91,064 | Purchase |
| Mar 12 | `8k/8k-2021-03-12-078715.html` | 262 | $15.0M | 91,326 | Purchase |

**Anchors Added:**
- `#btc-purchase-2021-03-01`
- `#btc-purchase-2021-03-05`
- `#btc-purchase-2021-03-12`

---

### 424B / S-3 Filings

**Directories checked:**
- `424b/` — Directory does not exist
- `s3/` — Directory does not exist

No prospectus supplement documents available in the local repository for Q1 2021.

---

## Reconciliation

### Explicit 8-K Purchases
| Date | BTC | Cost | Avg Price |
|------|-----|------|-----------|
| Jan 22 | 314 | $10.0M | $31,808 |
| Feb 2 | 295 | $10.0M | $33,810 |
| Mar 1 | 328 | $15.0M | $45,710 |
| Mar 5 | 205 | $10.0M | $48,888 |
| Mar 12 | 262 | $15.0M | $57,146 |
| **Total** | **1,404** | **$60.0M** | ~$42,735 |

### Inferred Purchase (Convertible Note Proceeds)

| Period | BTC | Cost | Avg Price | Source |
|--------|-----|------|-----------|--------|
| Feb 19 - Feb 28 | ~19,453 | ~$1.026B | ~$52,742 | 10-Q minus 8-K totals |

**Calculation:**
- 10-Q reports: 20,857 BTC purchased in Q1 for $1.086B
- 8-K announced: 1,404 BTC for $60M
- Inferred: 20,857 - 1,404 = **19,453 BTC** for **$1.026B**

### Verification Math

```
Starting (Dec 31, 2020):         70,469 BTC
+ Jan 22 purchase:                  314 BTC
+ Feb 2 purchase:                   295 BTC
+ Inferred (Feb 19-28):          19,453 BTC  ← NOT separately announced
+ Mar 1 purchase:                   328 BTC
+ Mar 5 purchase:                   205 BTC
+ Mar 12 purchase:                  262 BTC
─────────────────────────────────────────────
Ending (Mar 31, 2021):           91,326 BTC  ✓ (matches 10-Q)
```

### Gap Analysis: Feb 2 → Mar 1

| Checkpoint | Cumulative BTC |
|------------|----------------|
| Feb 2, 2021 (8-K) | 71,079 |
| Mar 1, 2021 (8-K) | 90,859 |
| **Delta** | **19,780** |

The Mar 1 8-K shows a +328 BTC purchase with cumulative 90,859.
Pre-Mar-1 cumulative: 90,859 - 328 = 90,531
Gap from Feb 2 to pre-Mar-1: 90,531 - 71,079 = **19,452 BTC** (matches inferred within rounding)

---

## Files Modified (Anchors Added)

| File | Anchor ID | Purpose |
|------|-----------|---------|
| `8k/8k-2021-01-22-014227.html` | `#btc-purchase-2021-01-22` | Jan 22 purchase disclosure |
| `8k/8k-2021-02-02-025369.html` | `#btc-purchase-2021-02-02` | Feb 2 purchase disclosure |
| `8k/8k-2021-02-17-045792.html` | `#btc-funding-2021-02-17` | Convertible note offering |
| `8k/8k-2021-02-19-048555.html` | `#btc-funding-2021-02-19` | Convertible note closing |
| `8k/8k-2021-03-01-062322.html` | `#btc-purchase-2021-03-01` | Mar 1 purchase disclosure |
| `8k/8k-2021-03-05-070446.html` | `#btc-purchase-2021-03-05` | Mar 5 purchase disclosure |
| `8k/8k-2021-03-12-078715.html` | `#btc-purchase-2021-03-12` | Mar 12 purchase disclosure |
| `10q/10-Q-2021-04-29.html` | `#btc-holdings-q1-2021` | Q1 2021 BTC holdings (Note 3) |

---

## Key Observations

1. **Inferred Purchase Pattern**: The ~19,453 BTC purchased with convertible note proceeds between Feb 19-28, 2021 was NOT announced via a separate 8-K. The purchase is only documented in aggregate in the 10-Q filing.

2. **Funding Source**: The 10-Q explicitly states: *"During the three months ended March 31, 2021, the Company purchased approximately 20,857 bitcoins for $1.086 billion in cash, including cash from the net proceeds related to the issuance of its convertible senior notes due 2027."*

3. **Disclosure Pattern**: Small cash purchases (~$10-15M each) received individual 8-K announcements. The large convertible-funded purchase (~$1B) was only disclosed in aggregate via the 10-Q.

4. **XBRL Compliance**: The 10-Q uses custom XBRL elements (`mstr:NumberOfBitcoinsPurchased`, `mstr:NumberOfCarryingValueBitcoins`) for Bitcoin-specific disclosures.

---

## Data Quality Notes

- All BTC quantities are stated as "approximately" in SEC filings
- Cost figures include fees and expenses
- Average prices are calculated inclusive of fees
- Cumulative totals in 8-Ks may have minor rounding differences

---

*Generated: Q1 2021 Reconciliation*  
*Source Documents: SEC EDGAR / Local Repository*
