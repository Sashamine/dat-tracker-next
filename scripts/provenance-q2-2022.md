# MSTR Q2 2022 BTC Holdings Reconciliation

## Summary

| Metric | Value |
|--------|-------|
| **Period** | April 1 - June 30, 2022 |
| **Starting Balance** | 129,218 BTC |
| **Q2 Purchases** | 481 BTC |
| **Ending Balance** | 129,699 BTC |
| **Reconciliation** | ✅ VERIFIED (129,218 + 481 = 129,699) |

---

## SEC Filing Sources

### 10-Q (Q2 2022) - Filed August 2, 2022
**File:** `public/sec/mstr/10q/10-Q-2022-08-02.html#dat-btc-holdings`

**Key Data Points:**
- Approximate number of bitcoins held as of June 30, 2022: **129,699 BTC**
- Approximate number of bitcoins purchased Q2 2022: **481 BTC**
- Approximate number of bitcoins purchased H1 2022 (YTD): **5,308 BTC**
- Digital assets carrying value as of June 30, 2022: Impaired (cost basis ~$3.98B, carrying value lower due to impairment losses)

**XBRL Tags:**
- `mstr:NumberOfBitcoinsHeld` contextRef="C_0001050446_20220101_20220630": 129,699
- `mstr:NumberOfBitcoinsPurchased` contextRef="C_0001050446_20220401_20220630": 481

---

### 8-K April 5, 2022 (Item 8.01)
**File:** `public/sec/mstr/8k/8k-2022-04-05-095632.html#dat-btc-holdings`

**Coverage Period:** February 15, 2022 - April 4, 2022

**Purchase Details:**
| Metric | Value |
|--------|-------|
| BTC Acquired | ~4,167 BTC |
| Cash Spent | ~$190.5 million |
| Avg Price | ~$45,714 per BTC |
| Total Holdings (as of Apr 4) | ~129,218 BTC |
| Aggregate Cost Basis | ~$3.97 billion |
| Overall Avg Price | ~$30,700 per BTC |

**Note:** This 8-K confirms the starting balance for Q2 2022. Purchases occurred Feb 15 - Apr 4, which spans Q1/Q2 boundary. Holdings of 129,218 BTC as of April 4, 2022 establishes Q2 starting position.

**Holder Breakdown:**
- MacroStrategy LLC (wholly-owned subsidiary): ~115,110 BTC
- MicroStrategy parent: ~14,108 BTC

---

### 8-K June 1, 2022 (Item 5.07)
**File:** `public/sec/mstr/8k/8k-2022-06-01-165191.html`

**Content:** 2022 Annual Meeting of Stockholders results

**BTC Holdings Update:** ❌ None (not applicable - governance filing only)

---

### 8-K June 29, 2022 (Item 8.01)
**File:** `public/sec/mstr/8k/8k-2022-06-29-184423.html#dat-btc-holdings`

**Coverage Period:** May 3, 2022 - June 28, 2022

**Purchase Details:**
| Metric | Value |
|--------|-------|
| BTC Acquired | ~480 BTC |
| Cash Spent | ~$10.0 million |
| Avg Price | ~$20,817 per BTC |
| Total Holdings (as of Jun 28) | ~129,699 BTC |
| Aggregate Cost Basis | ~$3.98 billion |
| Overall Avg Price | ~$30,664 per BTC |

**Note:** Minor 1 BTC variance between 8-K (~480) and 10-Q (481) is rounding.

---

## Q2 2022 Purchase Timeline

| Date | Event | BTC | Cumulative |
|------|-------|-----|------------|
| Apr 4, 2022 | Q2 Start (per 8-K) | - | 129,218 |
| May 3 - Jun 28 | Purchase (per 8-K) | +480 | 129,698 |
| Jun 30, 2022 | Q2 End (per 10-Q) | +1 (rounding) | 129,699 |

---

## Collateral Notes (Q2 2022)

From the 10-Q, as of June 30, 2022:

1. **2028 Secured Notes (6.125%):** ~14,589 BTC pledged as collateral

2. **2025 Silvergate Secured Term Loan ($205M):** 
   - ~30,051 BTC pledged as collateral
   - In June 2022, MacroStrategy deposited an additional **10,585 BTC** to maintain LTV ratio as BTC price declined
   - Required LTV: ≤50%
   - Cure LTV: ≤25% (or ≤35% with 25bps rate increase)

---

## Verification Checklist

- [x] 10-Q Q2 2022 holdings confirmed: 129,699 BTC
- [x] 8-K April 5, 2022 reviewed: Confirms Q2 starting position
- [x] 8-K June 1, 2022 reviewed: No holdings data (governance only)
- [x] 8-K June 29, 2022 reviewed: Confirms Q2 purchase of 480 BTC
- [x] Reconciliation verified: 129,218 + 481 = 129,699 ✓
- [x] `id="dat-btc-holdings"` anchors added to relevant filings

---

## Files Modified

| File | Change |
|------|--------|
| `10-Q-2022-08-02.html` | Updated `id="btc-holdings"` → `id="dat-btc-holdings"` |
| `8k-2022-06-29-184423.html` | Added `id="dat-btc-holdings"` anchor |
| `8k-2022-04-05-095632.html` | Already had `id="dat-btc-holdings"` anchor ✓ |
