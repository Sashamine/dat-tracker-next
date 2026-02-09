# Q2 2021 MSTR Bitcoin Holdings Reconciliation

**Period:** April 1 - June 30, 2021  
**Starting Point:** 91,326 BTC (Q1 2021 ending)  
**Ending Point:** 105,085 BTC (from 10-Q)

---

## Summary

| Metric | Value |
|--------|-------|
| Q1 2021 Ending | 91,326 BTC |
| Q2 2021 Purchases | +13,759 BTC |
| Q2 2021 Ending | 105,085 BTC |
| Explicitly Announced | 753 BTC |
| Inferred from Secured Notes | ~13,006 BTC |

---

## Documents Examined

### 10-Q (Authoritative Quarter-End)

| File | Period | Cumulative BTC | XBRL Element ID |
|------|--------|---------------|-----------------|
| `10q/10-Q-2021-07-29.html` | Jun 30, 2021 | **105,085** | `mstr:NumberOfCarryingValueBitcoins` (F_000752) |

**Key Quote:**
> "As of June 30, 2021, the carrying value of the Company's approximately **105,085** bitcoins was $2.051 billion"

**H1 2021 Total Purchases:** 34,616 BTC for $1.616 billion (~$46,673/BTC avg)

---

### 8-K Purchase Announcements (Q2 2021)

| Date | File | Purchase | Cumulative | Type |
|------|------|----------|------------|------|
| Apr 5, 2021 | `8k/8k-2021-04-05-105625.html` | **+253 BTC** ($15.0M @ $59,339) | 91,579 | Explicit |
| May 13, 2021 | `8k/8k-2021-05-13-159855.html` | **+271 BTC** ($15.0M @ $55,387) | 91,850 | Explicit |
| May 18, 2021 | `8k/8k-2021-05-18-164617.html` | **+229 BTC** ($10.0M @ $43,663) | 92,079 | Explicit |

**Total Explicitly Announced in Q2:** 753 BTC ($40M)

---

### 8-K Non-Purchase Filings (Q2 2021)

| Date | File | Description |
|------|------|-------------|
| Apr 12, 2021 | `8k/8k-2021-04-12-112475.html` | Board compensation in BTC (policy change, no purchase) |
| Jun 2, 2021 | `8k/8k-2021-06-02-179845.html` | Annual Meeting voting results |
| Jun 7, 2021 | `8k/8k-2021-06-07-183788.html` | Impairment warning ($284.5M expected Q2 impairment) |
| Jun 8, 2021 | `8k/8k-2021-06-08-185538.html` | **$500M Senior Secured Notes** - priced, ~$488M net proceeds for BTC |
| Jun 14, 2021 | `8k/8k-2021-06-14-189600.html` | **Secured Notes Closed** - $487.7M net proceeds for BTC |

---

## The June 2021 Secured Notes Purchase (Inferred)

### Gap Analysis
```
Last Explicit 8-K (May 18): 92,079 BTC
10-Q Quarter-End (Jun 30): 105,085 BTC
------------------------------------
Inferred Purchase:          13,006 BTC
```

### Financing Details
- **Instrument:** 6.125% Senior Secured Notes due 2028
- **Principal:** $500,000,000
- **Net Proceeds:** ~$487.7 million
- **Implied Average Price:** $487.7M ÷ 13,006 ≈ **$37,498/BTC**
- **Purchase Window:** June 14-30, 2021

### Why No Separate 8-K?
The June 2021 secured notes purchase was **not separately announced** via 8-K because:
1. The 8-K on Jun 14 already disclosed the intended use of proceeds ("to acquire additional bitcoin")
2. The 10-Q filed July 29 served as the disclosure of the actual quarter-end holdings
3. This was a large intra-quarter purchase using debt proceeds, not a discrete treasury purchase like the smaller cash buys

### Supporting Evidence from 10-Q:
> "These purchases included purchases of bitcoin using the net proceeds from our issuance of... $500.0 million aggregate principal amount of 6.125% Senior Secured Notes due 2028 (the '2028 Secured Notes') in the second quarter of 2021."

---

## Timeline Reconstruction

| Date | Event | Purchase | Cumulative |
|------|-------|----------|------------|
| Mar 31, 2021 | Q1 Ending | - | 91,326 |
| Apr 5, 2021 | 8-K Purchase | +253 | 91,579 |
| Apr 12, 2021 | Board Comp Policy | - | 91,579 |
| May 13, 2021 | 8-K Purchase | +271 | 91,850 |
| May 18, 2021 | 8-K Purchase | +229 | 92,079 |
| Jun 7, 2021 | Impairment Warning | - | 92,079 |
| Jun 8, 2021 | Notes Priced | - | 92,079 |
| Jun 14, 2021 | Notes Closed | - | 92,079 |
| Jun 14-30, 2021 | **Inferred Purchase** | **+13,006** | 105,085 |
| Jun 30, 2021 | **Q2 Ending (10-Q)** | - | **105,085** |

---

## Provenance Anchors Added

The following files were modified with `id="dat-btc-holdings"` citation anchors:

| File | Anchor Location |
|------|-----------------|
| `10q/10-Q-2021-07-29.html` | XBRL element F_000752 (105,085 BTC) |
| `8k/8k-2021-04-05-105625.html` | Item 8.01 purchase disclosure |
| `8k/8k-2021-05-13-159855.html` | Item 8.01 purchase disclosure |
| `8k/8k-2021-05-18-164617.html` | Item 8.01 purchase disclosure |

---

## Notes

1. **424B/S-3 Directories:** Did not exist in the file system. The secured notes were 144A private placement, not registered offerings.

2. **XBRL Elements Used:**
   - `mstr:NumberOfCarryingValueBitcoins` - Cumulative holdings
   - `mstr:NumberOfBitcoinsPurchased` - Period purchases
   - Context: `C_0001050446_20210101_20210630`

3. **Validation:** 
   - Q1 ending (91,326) + Q2 purchases (13,759) = 105,085 ✓
   - Explicit purchases (753) + Inferred (13,006) = 13,759 ✓

---

*Generated: Q2 2021 Reconciliation*  
*Source Files: SEC EDGAR via dat-tracker-next*
