# BTBT Extraction Adversary Report — Agent B
**Review Date:** 2026-02-14
**Reviewing:** Agent A's `ground-truth.md`

---

## Executive Summary

| Vector | Status | Critical Issues |
|--------|--------|-----------------|
| **Completeness** | ⚠️ ISSUES | Missing 9+ 8-K filings, equity compensation not extracted |
| **Accuracy** | ✅ PASS | All key quotes verified in source documents |
| **Staleness** | ✅ PASS | Feb 6, 2026 PR is most recent, no newer data found |
| **Methodology** | ⚠️ MINOR | Company's mNAV methodology differs (includes WYFI) |
| **Arithmetic** | ✅ PASS | HPS and mNAV calculations correct |

**Overall Assessment:** Agent A's core data is accurate, but completeness gaps exist in filing coverage and dilutive instruments.

---

## 1. Completeness Attack

### 1.1 SEC Filings Missed

Agent A's list included 16 filings. EDGAR shows **25+ filings** in the last 6 months. Missing:

| Form | Date | Items | What Agent A Missed |
|------|------|-------|---------------------|
| **8-K** | 2025-09-25 | 5.07, 9.01 | Shareholder meeting vote results |
| **8-K** | 2025-09-24 | 8.01, 9.01 | Other events disclosure |
| **8-K** | 2025-09-22 | 8.01, 9.01 | Other events disclosure |
| **8-K** | 2025-09-19 | 8.01, 9.01 | Other events disclosure |
| **8-K** | 2025-09-17 | 8.01, 9.01 | Other events disclosure |
| **8-K** | 2025-09-10 | 8.01, 9.01 | Other events disclosure |
| **8-K** | 2025-09-08 | 7.01, 9.01 | September investor presentation |
| **8-K** | 2025-08-15 | 7.01, 9.01 | August investor presentation |
| **8-K** | 2025-08-08 | 8.01, 9.01 | Other events disclosure |
| **424B5** | 2025-09-29 | — | Convertible notes prospectus supplement |
| **FWP** | 2025-09-30 | — | Free writing prospectus |
| **305B2** | 2025-10-02 | — | Trust Indenture Act filing |

**Impact:** The September 8-Ks (Items 8.01) likely contain ETH acquisition updates leading up to the convertible offering. Not critical for current state but incomplete for historical tracking.

### 1.2 Dilutive Instruments Incomplete

Agent A stated: *"Stock Options/RSUs - Not separately extracted from this review"*

**This is INCOMPLETE.** The 10-Q contains equity compensation details that should be extracted:
- Stock options outstanding
- RSU grants
- Exercise prices and vesting schedules

**Recommendation:** Extract from 10-Q Note on Stock-Based Compensation for full dilutive picture.

### 1.3 Debt Instruments ✅

Agent A correctly identified:
- **$150M Convertible Notes** (4.00% due 2030) at $4.16 conversion price
- Potential dilution: 36,057,690 shares

Verified from 8-K filed October 2, 2025.

### 1.4 Preferred Equity ✅

Agent A correctly identified:
- 1,000,000 preferred shares issued
- Stated value: $9,050,000

Verified from Q3 10-Q balance sheet.

### 1.5 Warrants ✅

Agent A stated: *"No material warrants identified in recent 8-K filings (checked Items 3.02)"*

I verified: No Item 3.02 8-Ks in the past 6 months. **CORRECT.**

---

## 2. Accuracy Attack

### 2.1 Holdings Quote Verification

**Agent A's Quote:**
> "As of January 31, 2026, the Company held approximately 155,239.4 ETH."

**Source:** https://bit-digital.com/press-releases/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/

**Actual text in document:**
> "As of January 31, 2026, the Company held approximately 155,239.4[1] ETH."

**Verdict:** ✅ MATCH (footnote reference [1] is stylistic)

### 2.2 Shares Quote Verification

**Agent A's Quote:**
> "Bit Digital shares outstanding were 324,202,059 as of January 31, 2026."

**Source:** Same PR

**Actual text in document:**
> "Bit Digital shares outstanding were 324,202,059 as of January 31, 2026."

**Verdict:** ✅ EXACT MATCH

### 2.3 Convertible Notes Quote Verification

**Agent A's Quote:**
> "The initial conversion rate for the Notes is 240.3846 ordinary shares of the Company per $1,000 principal amount of Notes, which is equivalent to an initial conversion price of approximately $4.16 per ordinary share."

**Source:** https://www.sec.gov/Archives/edgar/data/1710350/000121390025095533/ea0259669-8k_bitdigital.htm

**Actual text in document:**
> "The initial conversion rate for the Notes is 240.3846 ordinary shares of the Company per $1,000 principal amount of Notes, which is equivalent to an initial conversion price of approximately $4.16 per ordinary share."

**Verdict:** ✅ EXACT MATCH

### 2.4 Balance Sheet Verification

Verified against Q3 10-Q (https://www.sec.gov/Archives/edgar/data/1710350/000121390025110383/ea0263546-10q_bitdigital.htm):

| Agent A's Value | 10-Q Value | Match |
|-----------------|------------|-------|
| Cash: $179,118,182 | $179,118,182 | ✅ |
| Total Assets: $1,133,084,610 | $1,133,084,610 | ✅ |
| Total Liabilities: $87,503,224 | $87,503,224 | ✅ |
| Preferred shares: $9,050,000 | $9,050,000 | ✅ |
| Shares outstanding: 322,124,795 | 322,124,795 | ✅ |

**Verdict:** ✅ ALL MATCH

---

## 3. Staleness Attack

### 3.1 EDGAR Check (Post Feb 1, 2026)

Navigated to: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001710350

Most recent SEC filing: **8-K filed February 4, 2026** (Items 7.01, 9.01 - Investor Presentation)

Agent A cited this filing and correctly noted the Feb 6, 2026 PR supersedes it with Jan 31, 2026 data.

**Verdict:** ✅ PASS - Agent A used most recent source

### 3.2 Company Press Releases Check

Navigated to: https://bit-digital.com/press-releases/

Most recent PR: **February 6, 2026** - "Monthly Ethereum Treasury and Staking Metrics for January 2026"

No February 2026 PRs after Feb 6. Agent A's source is current.

**Verdict:** ✅ PASS - No newer data available

### 3.3 News Page Check

Navigated to: https://bit-digital.com/latest-news/

Same content as press releases. No newer updates.

**Verdict:** ✅ PASS

---

## 4. Methodology Attack

### 4.1 Share Count Type

Agent A used **324,202,059 shares** from the Feb 6, 2026 PR.

This is the **basic shares outstanding** as of Jan 31, 2026 - correct for `sharesForMnav`.

Agent A also noted the Q3 10-Q cover page shows 323,674,831 as of Nov 10, 2025 and period-end shows 322,124,795 as of Sep 30, 2025.

**Verdict:** ✅ CORRECT - Used most recent basic shares

### 4.2 Convertible Notes Treatment

Agent A correctly:
- Identified $150M face value
- Calculated 36,057,690 potential shares at $4.16 conversion
- Noted these should go in dilutive-instruments.ts

**Note:** The $150M convertibles were issued October 2, 2025 - AFTER the Q3 period ended (Sep 30, 2025). They correctly don't appear in the Q3 balance sheet. Agent A properly sourced from the Oct 2, 2025 8-K.

**Verdict:** ✅ CORRECT

### 4.3 Preferred Equity Treatment

Agent A used $9,050,000 preferred equity in EV calculation:
> "EV = MarketCap + Debt + PreferredEquity - ExcessCash"

This is **correct for mNAV methodology**.

**Verdict:** ✅ CORRECT

### 4.4 Company vs Agent A mNAV Methodology Divergence

Agent A calculated: **mNAV = 1.92x**

Company presentation (Feb 4, 2026) shows:
- "mNAV per Share $2.74"
- "BTBT Share Price $1.89"  
- "-31% Discount"

**The discrepancy:** Company's "mNAV" appears to include the WYFI stake ($527.6M) in their NAV calculation. Agent A's calculation is ETH-only.

Agent A noted this: *"Company may be including WYFI stake in their NAV calculation as 'Combined Asset Value.'"*

**Recommendation:** For DAT tracker purposes, clarify whether mNAV should be:
1. **ETH-only** (Agent A's approach) - Pure crypto NAV
2. **Combined** (Company's approach) - Includes WYFI stake

**Verdict:** ⚠️ METHODOLOGY DIFFERENCE - Not wrong, but needs clarification

---

## 5. Arithmetic Attack

### 5.1 HPS Calculation

**Agent A's calculation:**
- ETH Holdings: 155,239.4
- Shares: 324,202,059
- HPS: 0.0004787 ETH/share

**My verification:**
```
155,239.4 / 324,202,059 = 0.00047874628...
Rounded to 4 sig figs: 0.0004787
```

**Verdict:** ✅ CORRECT

### 5.2 CryptoNAV Calculation

**Agent A's calculation:**
> CryptoNAV = 155,239.4 × $2,449 = $380,191,311

**My verification:**
```
155,239.4 × 2,449 = 380,081,240.60
```

**Discrepancy:** ~$110,000 (0.03%)

The PR states "~$380.2 million" which is consistent with either. This appears to be a minor rounding difference, possibly from intermediate calculations.

**Verdict:** ⚠️ MINOR - Off by 0.03%, not material

### 5.3 mNAV Calculation

**Agent A's inputs:**
- Market Cap: 324,202,059 × $1.76 = $570,595,624
- Debt: $150,000,000
- Preferred: $9,050,000
- Excess Cash: $0
- CryptoNAV: $380,191,311

**Agent A's calculation:**
```
EV = $570.6M + $150M + $9.05M = $729.65M
mNAV = $729.65M / $380.2M = 1.92x
```

**My verification:**
```
EV = 570,595,624 + 150,000,000 + 9,050,000 = 729,645,624
mNAV = 729,645,624 / 380,191,311 = 1.919x
Rounded: 1.92x
```

**Verdict:** ✅ CORRECT

### 5.4 Cross-Check: Agent A's HPS vs Stated

Agent A stated: **0.0004787 ETH/share**

Verified: 155,239.4 / 324,202,059 = 0.0004787 ✓

---

## Issues Summary

### Critical Issues
None. Core data is accurate.

### Major Issues
1. **Completeness:** Missing 9+ 8-K filings from EDGAR
2. **Completeness:** Equity compensation (options/RSUs) not extracted

### Minor Issues
1. **Methodology:** Company's mNAV includes WYFI; Agent A's is ETH-only (needs clarification)
2. **Arithmetic:** CryptoNAV differs by $110K (0.03%)

---

## Recommendations

1. **For Agent A (if re-running):**
   - Extract all 8-K Items 8.01 from Sep-Oct 2025 for ETH acquisition history
   - Extract equity compensation details from 10-Q for dilutive instruments
   - Document methodology decision: ETH-only mNAV vs Combined mNAV

2. **For Phase 4 (Pipeline Check):**
   - Verify whether companies.ts and provenance use ETH-only or Combined mNAV
   - Ensure dilutive-instruments.ts includes convertible notes with $4.16 strike

3. **For DAT Tracker:**
   - Consider adding WYFI-adjusted mNAV as secondary metric for BTBT
   - Document that company's investor presentations use Combined Asset Value

---

## Verification Artifacts

| Source | URL | Status |
|--------|-----|--------|
| Feb 6, 2026 PR | bit-digital.com/press-releases/...january-2026/ | ✅ Verified |
| Q3 10-Q | sec.gov/.../ea0263546-10q_bitdigital.htm | ✅ Verified |
| Convertible 8-K | sec.gov/.../ea0259669-8k_bitdigital.htm | ✅ Verified |
| EDGAR Filings | sec.gov/cgi-bin/browse-edgar?...CIK=0001710350 | ✅ Verified |
| Company News | bit-digital.com/latest-news/ | ✅ Verified |

---

**Agent B Assessment:** Ground truth data is **APPROVED for Phase 2** with noted completeness gaps. No blocking issues for mNAV/HPS implementation.
