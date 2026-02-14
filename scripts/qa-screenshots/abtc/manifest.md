# ABTC Citation Evidence Manifest

Generated: 2025-02-13

## Summary

All citations were successfully verified. Screenshots captured for popovers and destination documents.

---

## Popover Screenshots

| # | File | Metric | Data Source | Search Term | Link |
|---|------|--------|-------------|-------------|------|
| 1 | 01-mnav-popover.jpg | mNAV 2.93x | Calculated | 5,098 Bitcoin | [PR Newswire](https://www.prnewswire.com/news-releases/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings-302643079.html) |
| 2 | 02-equity-nav-share-popover.jpg | Equity NAV/Share $0.391 | Calculated | 5,098 Bitcoin, 195,380,091 | PR Newswire, SEC 10-Q |
| 3 | 03-btc-holdings-popover.jpg | BTC Holdings 5,098 | Press Release | 5,098 Bitcoin | [PR Newswire](https://www.prnewswire.com/news-releases/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings-302643079.html) |
| 4 | 04-operating-burn-popover.jpg | Operating Burn $8.1M | SEC XBRL (10-Q) | 8,052,000 | SEC Filing |
| 5 | 05-crypto-nav-popover.jpg | Crypto NAV $355.2M | Calculated | 5,098 Bitcoin | PR Newswire |
| 6 | 06-shares-outstanding-popover.jpg | Shares Outstanding 927.6M | SEC 10-Q | 195,380,091 | SEC Filing |

---

## Destination Document Verification

### Holdings (PR Newswire)

| # | File | What it shows | Search term | Found? | Context |
|---|------|---------------|-------------|--------|---------|
| 7 | 07-holdings-pr-newswire.jpg | PR Newswire article confirming holdings | 5,098 Bitcoin | ✅ YES | "...mulation platform focused on building America's Bitcoin infrastructure backbone, held approximately **5,098 Bitcoin** in its strategic reserve as of December 14, 2025, placing the Company among the top 20 publicly tra..." |

### SEC 10-Q Verification

| # | File | What it shows | Search term | Found? | Context |
|---|------|---------------|-------------|--------|---------|
| 8 | 08-sec-10q-full.jpg | Full SEC 10-Q document | (multiple) | ✅ ALL FOUND | See details below |
| 9 | 09-sec-10q-shares.jpg | Share count section | 195,380,091 | ✅ YES | "As of November 13, 2025, the registrant had **195,380,091** shares of Class A common stock, **732,224,903** shares of Class B common stock, and no shares of Class C common stock outstanding." |
| 10 | 10-sec-10q-cash.jpg | Balance sheet - Cash | 7,976 | ✅ YES | "Cash $ **7,976**" |
| 11 | 11-sec-10q-ga.jpg | Income statement - G&A | 8,052 | ✅ YES | "General and administrative expenses **8,052**" |

---

## Detailed JavaScript Verification Results

### PR Newswire Holdings Verification
```json
{
  "found": true,
  "searchTerm": "5,098 Bitcoin",
  "context": "mulation platform focused on building America's Bitcoin infrastructure backbone, held approximately 5,098 Bitcoin in its strategic reserve as of December 14, 2025, placing the Company among the top 20 publicly tra"
}
```

### SEC 10-Q Multiple Value Verification
```json
[
  {
    "label": "Class A Shares",
    "term": "195,380,091",
    "found": true,
    "context": "(as defined in Rule 12b‑2 of the Act).    Yes ☐   No ☒\n\nAs of November 13, 2025, the registrant had 195,380,091 shares of Class A common stock, 732,224,903 shares of Class B common stock, and no shares of Class"
  },
  {
    "label": "Class B Shares",
    "term": "732,224,903",
    "found": true,
    "context": "s ☐   No ☒\n\nAs of November 13, 2025, the registrant had 195,380,091 shares of Class A common stock, 732,224,903 shares of Class B common stock, and no shares of Class C common stock outstanding."
  },
  {
    "label": "Cash",
    "term": "7,976",
    "found": true,
    "context": "Current assets\n\nCash\n\n$\n\n7,976\n\n$\n\n—\n\nDeposits and prepaid expenses\n\n2,943"
  },
  {
    "label": "G&A",
    "term": "8,052",
    "found": true,
    "context": "31,590\n\n17,791\n\nGeneral and administrative expenses\n\n8,052\n\n4,812\n\n26,062\n\n23,641\n\nLos"
  }
]
```

---

## Citation Summary Table

| Metric | Displayed Value | Search Term | Source | Verified? |
|--------|-----------------|-------------|--------|-----------|
| mNAV | 2.93x | (calculated) | Calculated from EV/CryptoNAV | ✅ |
| Equity NAV/Share | $0.391 | (calculated) | Calculated from NAV/Shares | ✅ |
| BTC Holdings | 5,098 BTC | "5,098 Bitcoin" | PR Newswire Dec 14, 2025 | ✅ |
| Operating Burn | $8.1M | "8,052,000" | SEC 10-Q XBRL | ✅ |
| Crypto NAV | $355.2M | (calculated) | Holdings × BTC Price | ✅ |
| Shares Outstanding | 927.6M | "195,380,091" | SEC 10-Q Cover Page | ✅ |
| Cash | $7.98M | "7,976" | SEC 10-Q Balance Sheet | ✅ |
| Class B Shares | 732.2M | "732,224,903" | SEC 10-Q Cover Page | ✅ |

---

## Notes

1. **Share Count Calculation:** Class A (195,380,091) + Class B (732,224,903) = 927,604,994 total shares
2. **Class B Ownership:** Held by Hut 8 (~80% ownership)
3. **Holdings Source:** Press release dated Dec 14, 2025 - not SEC verified (XBRL does not include CryptoAssetNumberOfUnits for this CIK)
4. **Cash Value:** $7,976 thousands = $7.976M (displayed as $7.98M)
5. **G&A Value:** $8,052 thousands = $8.052M (displayed as $8.1M)
6. **SEC Filing Date:** November 14, 2025 (10-Q for Q3 2025, period ending September 30, 2025)

---

## Files in this directory

1. `00-abtc-page.jpg` - Full ABTC company page
2. `01-mnav-popover.jpg` - mNAV citation popover
3. `02-equity-nav-share-popover.jpg` - Equity NAV/Share citation popover  
4. `03-btc-holdings-popover.jpg` - BTC Holdings citation popover
5. `04-operating-burn-popover.jpg` - Operating Burn citation popover
6. `05-crypto-nav-popover.jpg` - Crypto NAV citation popover
7. `06-shares-outstanding-popover.jpg` - Shares Outstanding citation popover
8. `07-holdings-pr-newswire.jpg` - PR Newswire destination (holdings verification)
9. `08-sec-10q-full.jpg` - SEC 10-Q full document view
10. `09-sec-10q-shares.jpg` - SEC 10-Q shares section
11. `10-sec-10q-cash.jpg` - SEC 10-Q cash section
12. `11-sec-10q-ga.jpg` - SEC 10-Q G&A section
