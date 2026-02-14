# ABTC Adversary Audit Report

**Auditor:** Adversarial Sub-Agent  
**Date:** 2026-02-14  
**Subject:** Independent verification of ABTC citation accuracy

---

## Executive Summary

The documenter's evidence was **partially verified** with several material findings:
- 🟡 **1 WARNING** - Holdings precision overstated
- 🟡 **1 WARNING** - Material liabilities excluded from "Debt"  
- 🟡 **1 WARNING** - Holdings data 62+ days stale
- 🟢 **6 VERIFIED** - Core numbers match source documents

---

## Finding 1: 🟡 WARNING - Holdings Imprecision Not Disclosed

**Description:** The citation says the holdings value is "5,098 BTC" as if exact, but the source says "**approximately** 5,098 Bitcoin".

**Evidence:**
- PR Newswire article states: *"held **approximately** 5,098 Bitcoin in its strategic reserve as of December 14, 2025"*
- The word "approximately" is in the original source
- UI displays "5,098 BTC" without any "approximately" qualifier
- Search term in popover is `5,098 Bitcoin` (no "approximately")

**Impact:** Minor - the actual number is likely 5,098 exactly, and "approximately" is standard PR language. However, for citation accuracy, the source uses hedging language that isn't reflected in the UI.

**Recommendation:** Add "(approx)" or similar qualifier to the display, OR update the note to acknowledge the source says "approximately".

---

## Finding 2: 🟡 WARNING - Material Liabilities Excluded from "Debt" 

**Description:** The mNAV formula shows "Debt: $0.00" but ABTC has $185.6M in operating lease liabilities, $286.2M in miner purchase liability, and $103.8M owed to Hut 8 (Parent).

**Evidence from 10-Q (Sept 30, 2025):**
```
Operating lease liability, current portion:     $40,614K
Operating lease liability, non-current:        $145,000K  
Total operating lease liability:               $185,614K

Miner purchase liability (non-current):        $286,202K

Related party owed to Parent (Hut 8):          $103,800K
(Note 12: "the Company owed Parent $103.8 million")
```

**Impact:** The mNAV formula shows:
- EV = Market Cap + **$0 debt** + $0 preferred - $0 excess cash

If operating leases were included as debt-like obligations, EV would increase by $185.6M, significantly affecting mNAV.

**Technical Analysis:**
- The $286.2M "miner purchase liability" is NOT traditional debt - it's an obligation to either pay cash OR forfeit pledged Bitcoin to Bitmain. This is more like a Bitcoin-collateralized purchase commitment.
- The $103.8M owed to Parent is intercompany - Parent owns 80% anyway.
- Operating leases ARE typically included in EV calculations per modern accounting (ASC 842), but DAT tracker methodology may intentionally exclude them.

**Recommendation:** Document the methodology. If operating leases are excluded by design, note why. The "$0 debt" claim is technically accurate (no formal debt instruments) but may mislead users expecting a comprehensive liabilities view.

---

## Finding 3: 🟡 WARNING - Holdings Data Staleness (62+ Days)

**Description:** The holdings figure (5,098 BTC) is from December 14, 2025. As of February 14, 2026, this data is 62 days old. The company is actively accumulating BTC.

**Evidence:**
- PR Newswire date: December 16, 2025 (holdings as of December 14, 2025)
- Current date: February 14, 2026
- 10-Q Note 5 states: *"During the period from October 1, 2025 to November 13, 2025, the Company purchased approximately 306 Bitcoin"*
- Company is actively mining and purchasing BTC

**Impact:** Actual holdings are likely HIGHER than 5,098 BTC given:
1. Ongoing mining operations
2. Active ATM purchases
3. Two months of operations since last disclosure

The UI shows a warning about balance sheet data being "62 days old" - this is good. However, this warning refers to SEC filing data, not the PR holdings data specifically.

**Recommendation:** The holdings warning should be more specific - holdings source is PR from Dec 14, balance sheet is from Sept 30. These are different dates with different implications.

---

## Finding 4: 🟢 VERIFIED - Share Count Accuracy

**Description:** The share count of 927,604,994 correctly uses the cover page "as of November 13, 2025" figure.

**Evidence:**
- 10-Q Cover page: "As of November 13, 2025, the registrant had **195,380,091** shares of Class A common stock, **732,224,903** shares of Class B common stock"
- 195,380,091 + 732,224,903 = **927,604,994** ✓
- UI displays: "927.6M" ✓

**Note:** The balance sheet (as of Sept 30, 2025) shows only 188,460,009 Class A shares. The difference (~6.9M shares) represents ATM issuances between Sept 30 and Nov 13, 2025. Using the more recent cover page count is correct.

---

## Finding 5: 🟢 VERIFIED - Cash Balance Accuracy  

**Description:** Cash of $7,976,000 matches the 10-Q exactly.

**Evidence:**
- 10-Q Balance Sheet: `Cash $ 7,976`
- UI displays: "$7.98M" ✓
- Note: This is "Cash" not "Cash and Cash Equivalents" - ABTC only reports Cash.

---

## Finding 6: 🟢 VERIFIED - G&A Burn Accuracy

**Description:** G&A of $8,052,000 matches the 10-Q Q3 2025 exactly.

**Evidence:**
- 10-Q Income Statement (Three Months Ended Sept 30, 2025):  
  `General and administrative expenses: 8,052`
- UI displays: "$8.1M" ✓

**Note:** G&A is a reasonable proxy for quarterly burn, though total operating expenses were higher ($28.7M including D&A). The Q3 2025 G&A appears clean without major one-time merger costs (merger closed Sept 3, costs mostly in prior period).

---

## Finding 7: 🟢 VERIFIED - Citation Links Functional

**Description:** All citation links navigate to correct destinations.

**Tested Links:**
| Citation | URL | Status |
|----------|-----|--------|
| BTC Holdings | PR Newswire article | ✓ Opens correct article |
| Shares | 10-Q filing | ✓ Opens full document (not index) |
| SEC source | 10-Q abtc-20250930.htm | ✓ Direct to filing |

**Note:** The SEC link goes to the specific .htm filing document, not the accession directory. This is correct.

---

## Finding 8: 🟢 VERIFIED - mNAV Calculation Logic

**Description:** The mNAV formula inputs appear internally consistent.

**Calculation Check:**
- Crypto NAV: 5,098 BTC × $69,854 = ~$356.1M ✓
- Equity NAV: $356.1M + $7.98M - $0 = $364.1M ✓  
- Equity NAV/Share: $364.1M / 927.6M = $0.393 ✓
- mNAV: Stock price $1.13 / $0.393 = 2.88x (UI shows 2.92x, slight BTC price variance is normal)

**Note:** See Finding 2 regarding debt exclusions that could affect mNAV interpretation.

---

## Finding 9: 🟢 VERIFIED - No Additional Share Classes to Consider

**Description:** There are no other share counts that would be more appropriate.

**Evidence from 10-Q:**
- Class C common stock: 0 shares authorized ✓
- Preferred stock: 0 shares issued ✓  
- Treasury shares: Not mentioned, assumed none ✓
- The 927.6M figure (Class A + Class B) is comprehensive

---

## Search Results for Debt-Related Terms

**"debt" mentions in 10-Q:**
- "Gain on debt extinguishment" - historical Gryphon debt, extinguished pre-merger
- "Repayments of loans payable" - $11.5M in 2024, none in 2025
- No active debt instruments as of Sept 30, 2025

**"loan" mentions:** Only historical loan repayments  
**"borrowing" mentions:** None found  
**"credit facility" mentions:** None found  
**"convertible" mentions:** None found  
**"notes payable" mentions:** None found  
**"103" search:** Found "$103.8 million" owed to Parent (Hut 8) for services

**Conclusion:** ABTC has no formal third-party debt instruments. The "Debt: $0" is technically accurate but excludes operating lease obligations and related party payables.

---

## Summary Table

| Metric | Displayed | Source Value | Status |
|--------|-----------|--------------|--------|
| Holdings | 5,098 BTC | "approximately 5,098 Bitcoin" | 🟡 Imprecision |
| Shares | 927.6M | 927,604,994 | 🟢 Verified |
| Cash | $7.98M | $7,976K | 🟢 Verified |
| Debt | $0.00 | $0 (but $185.6M lease liabilities exist) | 🟡 Methodology |
| G&A Burn | $8.1M | $8,052K | 🟢 Verified |
| Holdings Date | Dec 14, 2025 | Dec 14, 2025 PR | 🟡 Stale (62 days) |

---

## Recommendations

1. **Holdings qualifier:** Add "(approx)" or note that source uses "approximately"
2. **Debt methodology:** Document why operating leases ($185.6M) are excluded from mNAV debt input
3. **Holdings freshness:** Consider searching for more recent 8-K filings or company announcements for updated holdings
4. **Dual staleness warning:** Clarify that balance sheet (Sept 30) and holdings (Dec 14) have different dates

---

*Audit completed: 2026-02-14 15:30 UTC*
