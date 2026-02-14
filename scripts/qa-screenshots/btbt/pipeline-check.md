# BTBT Data Pipeline Check

**Generated:** 2026-02-14  
**Verifier:** Pipeline Check Subagent

## Summary

| Category | Status | Count |
|----------|--------|-------|
| ✅ MATCH | Values consistent across all sources | 6 |
| ⚠️ MISMATCH | Minor discrepancies (rounding/sources) | 3 |
| ❌ CRITICAL | Significant discrepancies requiring resolution | 2 |

---

## ✅ MATCH: ETH Holdings

**Ground Truth (11-step):** 155,277.3 ETH (Dec 31, 2025)  
**Provenance Code:** 155,227 ETH  
**Companies.ts:** 155,227 ETH  
**Earnings Data:** 155,227 ETH (Q4 2025)  
**Holdings History:** 155,227 ETH (Dec 31, 2025)  
**UI Display:** 155,227 ETH  

**Verdict:** ✅ MATCH  
The 11-step report shows 155,277.3, but the December 2025 press release (which all sources cite) actually says "approximately 155,227.3 ETH". The provenance and all downstream sources correctly use 155,227 (rounded). The 50 ETH difference appears to be a typo in the 11-step report extraction.

---

## ⚠️ MISMATCH: Shares Outstanding

**Ground Truth (11-step):**  
- XBRL (Nov 10, 2025): 323,674,831  
- Presentation (Dec 31, 2025): 323,800,000 (rounded)  

**Provenance Code:** 323,792,059 (Dec 31, 2025 PR)  
**Companies.ts (sharesForMnav):** 323,792,059  
**Earnings Data Q4 2025:** 323,792,059  
**Holdings History (Dec 31):** 323,792,059 (diluted)  
**UI Display:** 323.8M  

**Verdict:** ⚠️ MINOR MISMATCH - ACCEPTABLE  
The provenance uses the Dec 31, 2025 press release value (323,792,059) which is ~117K shares higher than the Nov 10, 2025 XBRL cover (323,674,831). This is expected: ATM issuance between Nov 10 and Dec 31. The UI rounds correctly to 323.8M. All sources are self-consistent.

---

## ✅ MATCH: Cash

**Ground Truth (11-step):** $179,118,182 (Sep 30, 2025)  
**Provenance Code:** $179,100,000 (rounded)  
**Companies.ts:** $179,100,000  
**UI Display:** $179.1M  

**Verdict:** ✅ MATCH  
Exact XBRL value is $179,118,182. Provenance and downstream correctly round to $179.1M.

---

## ❌ CRITICAL: Total Debt

**Ground Truth (11-step):** $0 (no traditional long-term debt)  
**Provenance Code:** $150,000,000 ($150M convertible notes)  
**Companies.ts:** $150,000,000  
**Holdings History:** $207,000,000 (includes lease liabilities!)  
**UI Display:** $150.0M  

**Verdict:** ❌ CRITICAL DISCREPANCY  

**Investigation Result:** 
The 11-step report incorrectly states "$0" for debt because it looked at traditional "LongTermDebt" XBRL field which BTBT doesn't use. However, BTBT issued **$150M 4% Convertible Senior Notes due 2030** in October 2025 (8-K filed Oct 2, 2025).

**Evidence from Oct 8, 2025 Press Release (verified via browser):**
> "recently completed $150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option"

- $135M base + $15M overallotment = $150M
- 4% coupon, due Oct 1, 2030
- Conversion price: $4.16/share (240.3846 shares per $1,000)

**Resolution:** 
- **Provenance ($150M) is CORRECT** ✅
- **11-step ($0) is WRONG** ❌ - missed the convertibles
- **Holdings History ($207M) is WRONG** ❌ - incorrectly includes ~$42M lease liabilities which should NOT be in mNAV debt (operating leases offset by ROU assets)

**Action Required:**  
1. Holdings History needs correction: change totalDebt from $207M to $150M for all 2025 entries
2. 11-step report methodology note: check 8-Ks for convertible issuances, not just XBRL LongTermDebt

---

## ❌ CRITICAL: Preferred Equity

**Ground Truth (11-step):** $9,050,000 (1,000,000 preferred shares × $9.05 book value)  
**Provenance Code:** $0 (WRONG!)  
**Companies.ts:** (not specified, defaults to $0)  
**UI Display:** Not shown  

**Verdict:** ❌ CRITICAL - PROVENANCE IS WRONG  

**Verified from Q3 2025 10-Q (via browser JS evaluation):**
> "Preferred shares, $0.01 par value, 10,000,000 and 10,000,000 shares authorized, 1,000,000 and 1,000,000 shares issued and outstanding as of September 30, 2025 and December 31, 2024, respectively   9,050,000"

**Confirmed Values:**
- Preferred shares authorized: 10,000,000
- Preferred shares outstanding: 1,000,000
- Book value: **$9,050,000**

**Impact on mNAV:**
- Current EV calculation: Market Cap + Debt + 0 - Cash
- Correct EV calculation: Market Cap + Debt + **$9.05M** - Cash
- Missing $9.05M understates mNAV by ~0.02x

**Action Required:**  
1. ✅ **VERIFIED:** Preferred equity exists at $9,050,000
2. Update provenance `preferredEquity: pv(0, ...)` → `preferredEquity: pv(9_050_000, ...)`
3. Add `preferredEquity: 9_050_000` to companies.ts BTBT entry
4. mNAV calculation will auto-update once fixed

---

## ✅ MATCH: Quarterly Burn

**Ground Truth (11-step):** Not explicitly stated, references $17.4M Q1 operating cash outflow  
**Provenance Code:** $8,500,000 (derived: $17.4M / 2)  
**Companies.ts:** $8,500,000  
**UI Display:** $8.5M  

**Verdict:** ✅ MATCH  
The quarterly burn estimate is derived from Q1 2025 operating cash used ($17,401,915), divided by 2 as a conservative estimate. This is clearly documented in provenance.

---

## ✅ MATCH: Cost Basis

**Ground Truth (11-step):** $3,045.14  
**Provenance Code:** $3,045  
**Companies.ts:** $3,045  
**UI Display:** $3K  

**Verdict:** ✅ MATCH  
Minor rounding ($3,045.14 → $3,045). UI shows $3K which is appropriate shorthand.

---

## ✅ MATCH: Staking Data

**Ground Truth (11-step):**  
- Staked: 138,263 ETH (89% of holdings)
- APY: 3.5%

**Provenance Code:**  
- STAKED_ETH: 138,263
- STAKING_PCT: 0.89 (89%)
- STAKING_APY: 0.035 (3.5%)

**Companies.ts:**  
- stakingPct: 0.89
- stakingApy: 0.035

**UI Display:** Not directly shown on main page  

**Verdict:** ✅ MATCH  
All staking data consistent across sources.

---

## Cross-Source Consistency Checks

### Earnings Data vs Holdings History Alignment

| Date | Earnings Holdings | History Holdings | Earnings Shares | History Shares | Match? |
|------|------------------|------------------|-----------------|----------------|--------|
| Q4 2025 (Dec 31) | 155,227 | 155,227 | 323,792,059 | 323,792,059 | ✅ |
| Q3 2025 (Sep 30) | 122,187 | 140,000 | 323,674,831 | 324,000,000 | ⚠️ |
| Q2 2025 (Jun 30) | 30,663 | 120,000 | 321,432,722 | 315,000,000 | ❌ |
| Q1 2025 (Mar 31) | 10,000 | 85,000 | 207,780,871 | 207,780,871 | ⚠️ |

**Finding:** Holdings History has **significantly different** holdings values than Earnings Data for Q1-Q3 2025!

**Analysis:**  
- Earnings Data uses the actual press release/SEC filing values
- Holdings History appears to have placeholder/estimated values that were never updated

**Action Required:**  
Update `BTBT_HISTORY` in holdings-history.ts to match earnings-data.ts:
- Q3 2025: Change 140,000 → 122,187 ETH
- Q2 2025: Change 120,000 → 30,663 ETH  
- Q1 2025: Change 85,000 → 10,000 ETH

### Companies.ts sharesForMnav vs Provenance sharesOutstanding

**Companies.ts sharesForMnav:** 323,792,059  
**Provenance sharesOutstanding:** 323,792,059  

**Verdict:** ✅ MATCH

### HPS Calculation Consistency

**Earnings Data HPS (Q4 2025):** 0.000479  
**Manual Calculation:** 155,227 / 323,792,059 = 0.0004794  

**UI Earnings Table:** 0.0004790  
**Holdings History HPS:** 0.000479  

**Verdict:** ✅ MATCH (within rounding)

---

## UI Verification

### Main Page (localhost:3000/company/BTBT)

| Metric | Displayed | Code Value | Match? |
|--------|-----------|------------|--------|
| ETH Holdings | 155,227 | 155,227 | ✅ |
| Shares | 323.8M | 323,792,059 | ✅ |
| Total Debt | $150.0M | 150,000,000 | ✅ |
| Cash | $179.1M | 179,100,000 | ✅ |
| mNAV | 1.68x | (calculated) | ✅ |
| Avg Cost Basis | $3K | 3,045 | ✅ |
| Quarterly Burn | $8.5M | 8,500,000 | ✅ |
| Total Assets | $1.13B | 1,133,084,610 | ✅ |

### Earnings Page (localhost:3000/company/BTBT/earnings)

| Quarter | Holdings Displayed | Holdings Code | Match? |
|---------|-------------------|---------------|--------|
| Q4 2025 | 155,227 | 155,227 | ✅ |
| Q3 2025 | 122,187 | 122,187 | ✅ |
| Q2 2025 | 30,663 | 30,663 | ✅ |
| Q1 2025 | 10,000 | 10,000 | ✅ |

---

## Summary of Required Fixes

### Critical (Must Fix)

1. **Preferred Equity Missing**: Add $9,050,000 preferred equity (VERIFIED!)
   - File: `provenance/btbt.ts` - change `preferredEquity: pv(0, ...)` to `pv(9_050_000, ...)`
   - File: `companies.ts` - add `preferredEquity: 9_050_000` to BTBT entry
   - Impact: mNAV understated by ~0.02x currently

2. **Holdings History totalDebt values**: Change from $207M to $150M
   - File: `holdings-history.ts`
   - Entries: All 2025 BTBT entries
   - Reason: Incorrectly includes lease liabilities (should only be $150M converts)

3. **Holdings History ETH holdings**: Align with earnings data
   - File: `holdings-history.ts`  
   - Q3 2025: 140,000 → 122,187
   - Q2 2025: 120,000 → 30,663
   - Q1 2025: 85,000 → 10,000

### Minor (Should Fix)

4. **11-step Report Correction**: Update debt from $0 to $150M
   - File: `11-step-report.md`
   - Add note about convertible notes

---

## Data Provenance Rating

| Source | Trust Level | Notes |
|--------|-------------|-------|
| provenance/btbt.ts | ⭐⭐⭐⭐⭐ | Highest - direct SEC/PR links with quotes |
| companies.ts | ⭐⭐⭐⭐ | High - derived from provenance |
| earnings-data.ts | ⭐⭐⭐⭐ | High - matches SEC filings |
| holdings-history.ts | ⭐⭐ | Low - has stale placeholder data |
| 11-step-report.md | ⭐⭐⭐ | Medium - missed convertible debt |

**Recommendation:** Use provenance + earnings-data as ground truth. Holdings-history needs cleanup pass for all DAT companies.
