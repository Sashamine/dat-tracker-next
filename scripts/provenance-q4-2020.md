# MSTR Bitcoin Provenance - Q4 2020

**Period:** October 1 - December 31, 2020

## Summary

| Metric | Value |
|--------|-------|
| Q3 2020 Ending Balance | 38,250 BTC |
| Q4 2020 Purchases | 32,219 BTC |
| **Q4 2020 Ending Balance** | **70,469 BTC** |
| Total Cost Basis (2020) | $1.125 billion |
| Average Price per BTC (2020) | ~$15,964 |

---

## 10-K Cumulative Holdings (Dec 31, 2020)

**Source:** `10k/10-K-2021-02-12.html`

| Field | Value |
|-------|-------|
| BTC Holdings | 70,469 BTC |
| Aggregate Purchase Price | $1.125 billion |
| Average Price | ~$15,964/BTC |
| Carrying Value (after impairment) | $1.054 billion |
| Cumulative Impairment | $70.7 million |

**XBRL Element:**
- **Element ID:** `F_000687`
- **Element Name:** `mstr:NumberOfBitcoinsPurchased`
- **Context:** `C_0001050446_20200101_20201231`
- **Anchor:** Line 18750 in source file

---

## Q4 2020 8-K Filings

### 8-K: December 4, 2020
**File:** `8k/8k-2020-12-04-310787.html`
**Accession:** 310787

| Field | Value |
|-------|-------|
| BTC Purchased | 2,574 BTC |
| Purchase Cost | $50.0 million |
| Average Price | ~$19,427/BTC |
| **Cumulative Holdings** | **40,824 BTC** |
| Cumulative Cost | $475.0 million |

**Citation Anchor Added:** `id="dat-btc-holdings"` (Item 8.01 paragraph)

**Key Quote:**
> "On December 4, 2020, MicroStrategy Incorporated announced that it had purchased approximately 2,574 bitcoins for $50.0 million in cash in accordance with its Treasury Reserve Policy, at an average price of approximately $19,427 per bitcoin. As of December 4, 2020, the Company holds approximately 40,824 bitcoins that were acquired at an aggregate purchase price of $475.0 million, inclusive of fees and expenses."

---

### 8-K: December 9, 2020 (Convertible Note Pricing)
**File:** `8k/8k-2020-12-09-313349.html`
**Accession:** 313349

| Field | Value |
|-------|-------|
| Event | Convertible Note Offering Announcement & Pricing |
| Initial Offering | $400 million (announced Dec 7) |
| Priced Amount | $550 million (Dec 9) |
| Greenshoe Option | $100 million additional |
| Estimated Net Proceeds | ~$537.2 million |
| **Intended Use** | Purchase bitcoin |

**Citation Anchor Added:** `id="dat-btc-holdings"` (paragraph with bitcoin intent)

**Key Quote:**
> "The Company intends to invest the net proceeds from the sale of the notes in bitcoin in accordance with its Treasury Reserve Policy pending the identification of working capital needs and other general corporate purposes."

---

### 8-K: December 11, 2020 (Convertible Note Close)
**File:** `8k/8k-2020-12-11-315971.html`
**Accession:** 315971

| Field | Value |
|-------|-------|
| Event | Convertible Note Offering Closed |
| Total Principal | $650 million (including greenshoe) |
| Net Proceeds | ~$634.9 million |
| Note Terms | 0.750% Convertible Senior Notes due 2025 |
| **Intended Use** | Purchase bitcoin |

**Citation Anchor Added:** `id="dat-btc-holdings"` (paragraph with bitcoin intent)

**Key Quote:**
> "The Company intends to invest the net proceeds from the sale of the notes in bitcoin in accordance with its Treasury Reserve Policy pending the identification of working capital needs and other general corporate purposes."

---

## Reconciliation

### BTC Balance Reconciliation

```
Q3 2020 Ending Balance:                    38,250 BTC
+ Dec 4 Purchase (8-K documented):          2,574 BTC
= Balance as of Dec 4:                     40,824 BTC
+ Remaining Q4 Purchases (inferred):       29,645 BTC
= 10-K Year-End Balance:                   70,469 BTC  ✓
```

### Cost Basis Reconciliation

```
Cumulative as of Dec 4 (8-K):            $475.0 million
+ Remaining Q4 Purchases (inferred):     $650.0 million
= Total 2020 Cost Basis (10-K):        $1,125.0 million  ✓
```

### Q4 2020 Purchases Summary

| Date | BTC | Cost | Avg Price | Source |
|------|-----|------|-----------|--------|
| Dec 4 | 2,574 | $50.0M | ~$19,427 | 8-K explicitly |
| Dec 4-31 | ~29,645 | ~$650M | ~$21,925 | Inferred from 10-K |
| **Q4 Total** | **32,219** | **~$700M** | **~$21,728** | |

---

## Notes on Q4 2020 Purchases

### Gap Analysis

The 8-K filings only document **one explicit BTC purchase** in Q4 2020 (Dec 4, 2,574 BTC). The remaining ~29,645 BTC were purchased between Dec 4-31, 2020 using:

1. **Convertible Note Proceeds:** ~$634.9 million net proceeds from the Dec 11 offering
2. **Remaining Treasury Cash:** Additional corporate cash

These purchases were **not announced in separate 8-Ks** but are disclosed cumulatively in the 10-K annual report.

### Convertible Note Impact

The $650M convertible note offering (0.750% due 2025) was the primary funding mechanism for Q4 bitcoin purchases:
- Announced: Dec 7, 2020
- Priced: Dec 9, 2020 ($550M + $100M greenshoe)
- Closed: Dec 11, 2020
- Net Proceeds: ~$634.9 million
- All proceeds intended for bitcoin purchases per Treasury Reserve Policy

---

## Files Modified

| File | Modification |
|------|--------------|
| `8k/8k-2020-12-04-310787.html` | Added `id="dat-btc-holdings"` anchor |
| `8k/8k-2020-12-09-313349.html` | Added `id="dat-btc-holdings"` anchor |
| `8k/8k-2020-12-11-315971.html` | Added `id="dat-btc-holdings"` anchor |

---

## Citation URLs

For web references, use these fragment identifiers:

- **Dec 4 Purchase:** `/sec/mstr/8k/8k-2020-12-04-310787.html#dat-btc-holdings`
- **Dec 9 Note Pricing:** `/sec/mstr/8k/8k-2020-12-09-313349.html#dat-btc-holdings`
- **Dec 11 Note Close:** `/sec/mstr/8k/8k-2020-12-11-315971.html#dat-btc-holdings`

---

*Generated: 2026-02-20*
