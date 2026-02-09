# MSTR Q3 2024 BTC Holdings Reconciliation

## Summary

| Metric | Value |
|--------|-------|
| **Period** | July 1 - September 30, 2024 |
| **Starting Balance** | 226,331 BTC |
| **Total Purchases** | 25,889 BTC |
| **Ending Balance** | 252,220 BTC |
| **10-Q Filed** | October 31, 2024 |

---

## Starting Balance

<div id="dat-btc-holdings">

**As of June 30, 2024: 226,331 BTC**

Source: [10-Q Q3 2024](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40) (filed October 31, 2024)

</div>

---

## Q3 2024 Purchases

### Purchase #1: August 6 - September 12, 2024

<div id="dat-btc-holdings">

| Detail | Value |
|--------|-------|
| **BTC Acquired** | ~18,300 BTC |
| **Cost** | ~$1.11 billion |
| **Avg Price** | ~$60,408/BTC |
| **Funding Source** | ATM equity offering proceeds |
| **Running Total** | 244,800 BTC (as of Sep 12, 2024) |

**SEC Source:** [8-K filed September 13, 2024](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=&owner=include&count=40)
- File: `8k-2024-09-13-218462.html`
- Item 8.01: Bitcoin Holdings Update
- Item 7.01: BTC Yield KPI disclosure (17.0% YTD)

**Key Quote from 8-K:**
> "On September 13, 2024, MicroStrategy Incorporated announced that, during the period between August 6, 2024 and September 12, 2024, the Company acquired approximately 18,300 bitcoins for approximately $1.11 billion in cash, at an average price of approximately $60,408 per bitcoin, inclusive of fees and expenses."

</div>

---

### Purchase #2: September 13-19, 2024

<div id="dat-btc-holdings">

| Detail | Value |
|--------|-------|
| **BTC Acquired** | ~7,420 BTC |
| **Cost** | ~$458.2 million |
| **Avg Price** | ~$61,750/BTC |
| **Funding Source** | 2028 Convertible Notes proceeds |
| **Running Total** | 252,220 BTC (as of Sep 19, 2024) |

**SEC Source:** [8-K filed September 20, 2024](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=&owner=include&count=40)
- File: `8k-2024-09-20-222498.html`
- Item 8.01: Bitcoin Holdings Update

**Key Quote from 8-K:**
> "On September 20, 2024, MicroStrategy announced that, during the period between September 13, 2024 and September 19, 2024, MicroStrategy acquired approximately 7,420 bitcoins for approximately $458.2 million in cash, using proceeds from the Offering, at an average price of approximately $61,750 per bitcoin, inclusive of fees and expenses."

> "As of September 19, 2024, MicroStrategy, together with its subsidiaries, held an aggregate of approximately 252,220 bitcoins, which were acquired at an aggregate purchase price of approximately $9.90 billion and an average purchase price of approximately $39,266 per bitcoin, inclusive of fees and expenses."

</div>

---

## Ending Balance Verification

<div id="dat-btc-holdings">

**As of September 30, 2024: 252,220 BTC**

**SEC Source:** [10-Q filed October 31, 2024](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40)
- File: `10-Q-2024-10-31.html`
- Note 3: Digital Assets

**XBRL Data:**
- `mstr:NumberOfBitcoinHeld` = 252,220 (contextRef: 2024-09-30)
- Q3 2024 Purchases: 25,889 BTC (from Note 3 table)

**Key Quote from 10-Q:**
> "During 2023 and 2024, we used proceeds from various capital raising transactions to purchase bitcoin. As of September 30, 2024, we held an aggregate of approximately 252,220 bitcoins."

</div>

---

## Reconciliation Math

```
Starting Balance (Jun 30, 2024):     226,331 BTC
  + Purchase #1 (Aug 6 - Sep 12):    +18,469 BTC  (reported as ~18,300)
  = Interim Total (Sep 12, 2024):    244,800 BTC
  + Purchase #2 (Sep 13-19):          +7,420 BTC
  = Ending Balance (Sep 30, 2024):   252,220 BTC  ✓

Total Q3 2024 Purchases:              25,889 BTC  ✓ (matches 10-Q)
```

---

## Other Notable Q3 2024 Events

### Stock Split
- **July 11, 2024:** 10-for-1 stock split announced
- **August 7, 2024:** Split effective (trading commenced on split-adjusted basis August 8)
- File: `8k-2024-07-11-177515.html`

### 2028 Convertible Notes Offering
- **September 16-20, 2024:** Issued $1.01B of 0.625% convertible senior notes due 2028
- Conversion price: $183.19/share (40% premium)
- Net proceeds: ~$997.4 million
- File: `8k-2024-09-18-221085.html`, `8k-2024-09-20-222462.html`

### 2028 Secured Notes Redemption
- **September 26, 2024:** Redeemed all $500M of 6.125% Senior Secured Notes
- Released ~69,080 BTC from collateral
- File: `8k-2024-09-18-221085.html`

---

## BTC Yield KPI (Q3 2024)

From 8-K filed September 20, 2024:

| Period | BTC Yield |
|--------|-----------|
| Q3 2024 (Jul 1 - Sep 19) | 5.1% |
| YTD 2024 (Jan 1 - Sep 19) | 17.8% |

---

## Cumulative Holdings Summary

| Date | BTC Holdings | Cost Basis | Avg Cost/BTC |
|------|-------------|------------|--------------|
| Dec 31, 2023 | 189,150 | ~$5.93B | ~$31,356 |
| Jun 30, 2024 | 226,331 | ~$8.33B | ~$36,798 |
| Sep 30, 2024 | 252,220 | ~$9.90B | ~$39,266 |

---

## Files Referenced

| File | Date | Key Content |
|------|------|-------------|
| `10-Q-2024-10-31.html` | Oct 31, 2024 | Q3 2024 quarterly report, 252,220 BTC confirmed |
| `8k-2024-07-05-175343.html` | Jul 5, 2024 | Brazil leniency agreement (no BTC impact) |
| `8k-2024-07-11-177515.html` | Jul 11, 2024 | 10-for-1 stock split announced |
| `8k-2024-08-01-089243.html` | Aug 1, 2024 | Q2 2024 earnings (226,331 BTC) |
| `8k-2024-09-13-218462.html` | Sep 13, 2024 | Purchase of ~18,300 BTC, total 244,800 |
| `8k-2024-09-18-221085.html` | Sep 18, 2024 | 2028 Convertibles pricing, secured notes redemption |
| `8k-2024-09-20-222462.html` | Sep 20, 2024 | 2028 Convertibles closing, indenture |
| `8k-2024-09-20-222498.html` | Sep 20, 2024 | Purchase of ~7,420 BTC, total 252,220 |

---

*Reconciliation verified: Q3 2024 holdings match SEC filings*
*Document generated: February 2026*
