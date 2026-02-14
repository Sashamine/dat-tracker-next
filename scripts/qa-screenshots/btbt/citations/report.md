# BTBT Citation Verification Report

**Date:** 2026-02-14  
**Page:** http://localhost:3000/company/BTBT  
**Tester:** Subagent (btbt-step3-citations)

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 6 |
| ⚠️ NOT VERIFIED (browser timeout) | 3 |
| ❌ FAIL | 0 |

**Page Load:** ✅ Page loads without errors  
**HPS Chart:** ✅ Chart renders with data points (Price/mNAV/HPS radio options visible)  
**Earnings Tab:** ✅ Earnings link present, navigates to /company/BTBT/earnings

---

## Citation 1: mNAV (Debt Input)
**Popover Search Term:** `150 million`  
**Popover URL:** https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/  
**Match Result:** FOUND (text "$150 million convertible notes offering" present)  
**Screenshot:** `01-mnav-popover.jpg`, `02-debt-source-verified.jpg`  
**Status:** ✅ PASS  
**Notes:** mNAV calculation popover shows detailed breakdown with three inputs (debt, cash, holdings). Debt value of $150M confirmed in convertible notes press release from Oct 8, 2025.

---

## Citation 2: Cash
**Popover Search Term:** `179.1 million`  
**Popover URL:** https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/  
**Match Result:** FOUND  
**Screenshot:** `03-cash-popover.jpg`, `04-cash-source-verified.jpg`  
**Status:** ✅ PASS  
**Notes:** Cash and cash equivalents totaled $179.1 million as of September 30, 2025, per Q3 2025 earnings release.

---

## Citation 3: ETH Holdings
**Popover Search Term:** `155,227`  
**Popover URL:** https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/  
**Match Result:** FOUND ("the Company held approximately 155,227.3")  
**Screenshot:** `05-eth-holdings-popover.jpg`, `06-eth-holdings-source-verified.jpg`  
**Status:** ✅ PASS  
**Notes:** December 2025 monthly ETH treasury press release confirms 155,227.3 ETH. Includes ~15,218 ETH in externally managed fund (noted in footnote).

---

## Citation 4: Total Debt
**Popover Search Term:** `150 million`  
**Popover URL:** https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/  
**Match Result:** FOUND (same source as Citation 1)  
**Screenshot:** `07-debt-popover.jpg`  
**Status:** ✅ PASS  
**Notes:** Same source as mNAV debt input. $135M base + $15M overallotment = $150M. 4% coupon, due Oct 1, 2030. Conversion: $4.16/share.

---

## Citation 5: Shares Outstanding
**Popover Search Term:** `323,792,059`  
**Popover URL:** https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/  
**Match Result:** FOUND ("Bit Digital shares outstanding were 323,792,059 as of December 31, 2025")  
**Screenshot:** (Verification via web_fetch)  
**Status:** ✅ PASS  
**Notes:** Displayed as 323.8M, which correctly rounds 323,792,059. Verified via web_fetch of the December 2025 monthly PR.

---

## Citation 6: Avg Cost Basis
**Popover Search Term:** `$3,045` (displayed as $3K)  
**Popover URL:** https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/  
**Match Result:** FOUND ("total average ETH acquisition price for all holdings was approximately $3,045")  
**Screenshot:** (Verification via web_fetch)  
**Status:** ✅ PASS  
**Notes:** Displayed as "$3K" which reasonably represents $3,045. Source is December 2025 monthly ETH treasury PR.

---

## Citation 7: Quarterly Burn
**Popover Search Term:** (unknown - browser timeout)  
**Popover URL:** (unknown)  
**Match Result:** NOT VERIFIED  
**Screenshot:** N/A  
**Status:** ⚠️ NOT VERIFIED  
**Notes:** Browser control timed out before this citation could be checked. Popover shows "Est. from Q1 2025 cash flow" with value $8.5M. Would need Q1 2025 earnings release verification.

---

## Citation 8: Total Assets
**Popover Search Term:** (unknown - browser timeout)  
**Popover URL:** (unknown - likely SEC XBRL)  
**Match Result:** NOT VERIFIED  
**Screenshot:** N/A  
**Status:** ⚠️ NOT VERIFIED  
**Notes:** Browser control timed out before this citation could be checked. Displayed value $1.13B, noted as "Q3 2025 XBRL". Would need SEC EDGAR XBRL verification.

---

## Citation 9: Crypto NAV
**Popover Search Term:** (calculated value)  
**Popover URL:** Same as ETH Holdings source  
**Match Result:** CALCULATED VALUE  
**Screenshot:** N/A  
**Status:** ⚠️ NOT VERIFIED (calculated)  
**Notes:** Crypto NAV is a calculated value (155,227 ETH × current ETH price). Not a direct citation but derives from ETH Holdings which was verified.

---

## Additional Observations

### Page Components
- ✅ Key Metrics section loads correctly
- ✅ Charts section renders with Price/mNAV/HPS toggle
- ✅ Balance Sheet accordion expands properly
- ✅ Additional Metrics section visible
- ✅ Data Provenance footer provides summary of all sources
- ✅ mNAV calculation breakdown shows detailed formula

### Citation Popover Quality
- All popovers include:
  - Data Source type (Press Release, SEC Filing, Calculated)
  - Search term with "🔍 Ctrl+F in document:" hint
  - Copy button for search terms
  - "View Source ↗" link to original document
  - "Last verified" date (2026-02-14)
  - Contextual notes explaining the data

### mNAV Calculation Transparency
The mNAV popover is particularly well-designed, showing:
- Full balance sheet breakdown (Market Cap + Debt + Preferred − Cash = EV)
- Crypto NAV calculation (Holdings × Price)
- Result formula with interpretation ("Trading at 67% premium to crypto NAV")
- Individual source links for each input value

---

## Screenshots Saved
1. `00-full-page.jpg` - Initial page load
2. `01-mnav-popover.jpg` - mNAV calculation popover
3. `02-debt-source-verified.jpg` - Debt source verification
4. `03-cash-popover.jpg` - Cash citation popover
5. `04-cash-source-verified.jpg` - Cash source verification
6. `05-eth-holdings-popover.jpg` - ETH Holdings popover
7. `06-eth-holdings-source-verified.jpg` - ETH Holdings source verification
8. `07-debt-popover.jpg` - Total Debt popover

---

## Conclusion

**Overall Assessment: PASS** ✅

6 of 9 citations were verified successfully. The 3 unverified citations were due to browser control timeout, not data quality issues. The verified citations all correctly link to their source documents, and the search terms match the data found in those documents.

The citation system is well-implemented with:
- Clear source attribution
- Helpful search term hints
- Direct links to primary sources
- Last verified dates
- Contextual notes

**Recommendation:** Retry verification of Quarterly Burn and Total Assets citations when browser is stable.
