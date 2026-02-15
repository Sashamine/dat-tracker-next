# BMNR Extraction Adversary Report

**Agent B — Extraction Adversary**
**Date:** February 14, 2026
**Target:** Agent A's ground truth research (`bmnr-ground-truth.md`)
**CIK:** 0001829311

---

## 1. COMPLETENESS ATTACK

### 1.1 Filing Coverage
Agent A's filing inventory is **comprehensive**. Cross-referenced against `data.sec.gov/submissions/CIK0001829311.json`:

- **8-Ks:** Agent A lists 40+ 8-Ks from Jul 2025 to Feb 2026. Verified against EDGAR — no missing 8-Ks.
- **10-K:** FY2025 (filed 2025-11-21) ✅
- **10-Q:** Q1 FY2026 (filed 2026-01-13) ✅
- **S-3ASR:** Two shelf registrations (Jul 2025) ✅
- **424B5:** Three prospectus supplements (Jul/Aug/Sep 2025) ✅ — no new 424B5 since Sep 22, 2025.
- **S-8:** Filed 2026-02-09 for employee benefit plan ✅

**No 8-K has Item 3.02 (unregistered equity sales) since the July 9, 2025 PIPE deal.** Agent A correctly captured the PIPE warrants but should explicitly confirm no subsequent warrant issuances occurred.

### 1.2 Missing Filing Types
Agent A omitted:
- **DEFA14A filings** (multiple in Jan 2026) — proxy soliciting materials. These are not critical for holdings/mNAV but show some omission in the filing inventory.
- **Form 3/4 insider filings** (7 Form 4s filed Jan 27, 2026) — not relevant to mNAV but indicate insider activity around the same time.

### 1.3 Dilutive Instruments — Complete
Agent A captures all dilutive instruments:
- C-3 Warrants (1,280) ✅
- Strategic Advisor + Rep Warrants (3,043,654 at $5.40) ✅
- CVI Warrants (10,435,430 at $87.50) ✅
- RSUs (26,954) ✅
- Preferred stock — all converted ✅

**Verdict: PASS (minor omissions of proxy/insider filings, not material to mNAV)**

---

## 2. ACCURACY ATTACK

### 2.1 Holdings Quote Verification
**Source URL:** `https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm`

Navigated directly to the SEC filing via browser. **Verified verbatim:**

> "As of February 8th, 2026 at 3:00pm ET, the Company's crypto holdings are comprised of 4,325,738 ETH at $2,125 per ETH (NASDAQ: COIN), 193 Bitcoin (BTC), $200 million stake in Beast Industries, $19 million stake in Eightco Holdings (NASDAQ: ORBS) ("moonshots") and total cash of $595 million. Bitmine's ETH holdings are 3.58% of the ETH supply (of 120.7 million ETH)."

✅ **Quote matches exactly.** Holdings figure of 4,325,738 ETH confirmed.

### 2.2 Staking Quote — DISCREPANCY FOUND

**⚠️ MEDIUM ISSUE:** The 8-K exhibit has an internal inconsistency:
- **Headline/subtitle:** "Bitmine has **2,873,459** staked ETH" 
- **Body text:** "Bitmine total staked ETH stands at **2,897,459**"

Agent A quoted the body figure (2,897,459) and used it consistently. The 24,000 ETH discrepancy between headline and body is likely a typo in the filing's headline. **Agent A made the correct choice** using the body text figure, but should have flagged this inconsistency.

### 2.3 Shares Outstanding — Verified
**XBRL data confirms:**
- `EntityCommonStockSharesOutstanding` at `2026-01-12` = **454,862,451** ✅
- From 10-Q (Q1 FY2026) cover page ✅
- Balance sheet (Nov 30, 2025) = 408,578,823 ✅

### 2.4 Cash — Verified
8-K states "total cash of $595 million" ✅
10-Q BS (Nov 30, 2025) shows $887,678K — different date, consistent trajectory ✅

### 2.5 Debt — Verified  
10-Q balance sheet shows $0 long-term debt, $0 notes payable. Total liabilities ($235,743K) are accrued liabilities, unsettled trades, warrant liability, and deferred taxes. **No financial debt.** ✅

### 2.6 BTC Count — Minor Discrepancy Noted
- Aug 25, 2025 8-K: "192 Bitcoin (BTC)"
- Dec 1, 2025 8-K: "192 Bitcoin (BTC)"  
- 10-Q Note 3 (Nov 30, 2025): "193 BTC"
- Feb 9, 2026 8-K: "193 Bitcoin (BTC)"

BTC went from 192 → 193 between the Dec 1 8-K and the 10-Q. Agent A correctly uses 193 for current. ✅

### 2.7 CryptoAssetNumberOfUnits XBRL Check
XBRL tag shows **3,737,333** units as of Nov 30, 2025. Agent A quotes 10-Q Note 3 as 3,737,140 ETH + 193 BTC = 3,737,333 total. ✅ The XBRL tag is an aggregate of all crypto units.

### 2.8 ETH NAV Arithmetic
4,325,738 × $2,125 = $9,192,193,250 ✅ Matches Agent A exactly.

### 2.9 ETH Supply Percentage
4,325,738 / 120,700,000 × 100 = 3.584% → rounds to 3.58% ✅

**Verdict: PASS with caveats (staking headline discrepancy should be flagged)**

---

## 3. STALENESS ATTACK

### 3.1 Holdings Data Currency
- **Most recent 8-K with holdings:** Feb 9, 2026 (Acc-no: 0001493152-26-005707) — data as of Feb 8, 2026
- **Feb 11 8-K:** Confirmed via browser — this is a CoinDesk Consensus 2026 conference presentation filing (slides only, no numerical updates). Items 7.01/9.01.
- **EFTS search Feb 12-14:** Zero new 8-K filings found.

✅ **Agent A's data IS the most current available as of Feb 14, 2026.**

### 3.2 Share Count Staleness — CONCERN

**⚠️ MEDIUM ISSUE:** The share anchor (454,862,451) is from the 10-Q cover page dated **January 12, 2026** — now **33 days stale**. BMNR has been actively issuing shares via ATM:
- Nov 30 to ~Jan 12: 46,169,850 shares via ATM (per 10-Q Note 13)
- Rate: ~1.06M shares/day
- Estimated additional shares issued Jan 12 to Feb 14: ~35M shares (rough estimate)
- **Estimated current shares: ~490M** (vs 454.9M anchor)

Agent A acknowledges this staleness but doesn't quantify the gap. For mNAV calculation purposes, the ~7-8% undercount in shares would materially affect the result.

### 3.3 No New 424B5 Filings
Zero 424B5 filings since September 22, 2025. The ATM continues under existing shelf registration — no prospectus supplement with updated cumulative share count. This is expected (ATMs don't require new 424B5 for each sale).

**Verdict: PARTIAL PASS — share count staleness is material and needs estimation methodology**

---

## 4. METHODOLOGY ATTACK

### 4.1 Share Count Anchor Validation
- **454,862,451** from 10-Q cover page (Jan 12, 2026) ✅ verified via XBRL
- **408,578,823** from balance sheet (Nov 30, 2025) ✅ verified via XBRL
- **Note 13 subsequent events:** 46,169,850 shares for ~$1,515,726K gross proceeds

**Cross-check:** 408,578,823 + 46,169,850 = 454,748,673 — but cover shows 454,862,451.
**Gap: 113,778 shares** — likely from warrant exercises (63,460 warrants exercised in Q1, with additional exercises between Nov 30 and Jan 12).

This is a minor discrepancy (~0.025%) and doesn't materially affect the methodology. ✅

### 4.2 ATM Estimation Methodology
Agent A references the BMNR share estimation method from TOOLS.md:
```
shares_issued = (ETH_acquired × ETH_price) / stock_price
```

**This methodology is sound in principle** but Agent A didn't actually apply it in the ground truth document. The document uses the 454.9M anchor without forward estimation. **This is a gap** — the ground truth should either:
1. Apply the estimation formula to get current estimated shares, OR
2. Explicitly document that the 454.9M is stale and flag the uncertainty

### 4.3 Basic vs Diluted Shares
Agent A correctly uses **basic shares** (454,862,451) for sharesForMnav. ✅
- Per methodology: dilutives go in `dilutive-instruments.ts` with strike prices
- Agent A explicitly states: "sharesForMnav should use BASIC: 454,862,451" ✅
- Dilutive instruments are enumerated with strikes for dynamic ITM calculation ✅

### 4.4 Q4 FY2025 HPS — Estimation Concerns

**⚠️ LOW ISSUE:** Agent A estimates Q4 FY2025 ETH holdings at "~1.8M-1.9M" by interpolating between the Aug 24 8-K (1,713,899) and Sep 7 8-K (2,069,443). 

The interpolation assumes linear acquisition, which may be roughly correct but:
- Agent A could have used the 10-K digital asset note for the exact Aug 31 figure
- Agent A notes "The 10-K would have similar for Aug 31" but didn't actually extract it
- The 10-K XBRL `CryptoAssetFairValue` at Aug 31, 2025 = $8,281,532,000

Using the ETH price from the 8-K at Aug 25 ($4,808/ETH): $8,281,532,000 / $4,808 ≈ 1,722,486 ETH — very close to the Aug 24 figure. But this mixes the cost basis (which was ~$7.4B) with fair value. The 10-K CryptoAssetCost at Aug 31 = $7,447,561,000. Neither perfectly yields units.

**The better approach:** Look for CryptoAssetNumberOfUnits in the 10-K XBRL — but it only has 1 entry (Nov 30, 2025 = 3,737,333). The 10-K didn't use this tag. So estimation is unavoidable for Q4 FY2025.

### 4.5 Consulting Fee Context

**⚠️ LOW ISSUE:** Agent A quotes "$40,000 to $50,000 annually" from Note 12. The 10-Q reports financial data **in thousands**. This means the actual consulting fee is **$40-50 million annually**, which is material (~0.5% of AUM at current ETH NAV). Agent A should have contextualized this.

**Verdict: PARTIAL PASS — estimation methodology referenced but not applied; Q4 FY2025 estimation weak**

---

## 5. ARITHMETIC ATTACK

### 5.1 Q1 FY2026 HPS
- Holdings: 3,737,140 ETH (from 10-Q Note 3)
- Shares: 408,578,823 (from 10-Q BS)
- HPS = 3,737,140 / 408,578,823 = **0.009147** ETH/share

Agent A states **0.00915** → ✅ Correct (rounded to 5 decimal places)

### 5.2 Q4 FY2025 HPS (Estimated)
- Holdings: ~1,800,000 (Agent A estimate)
- Shares: 234,712,324 (10-K BS)
- HPS = 1,800,000 / 234,712,324 = **0.007669**

Agent A states **~0.00767** → ✅ Correct

### 5.3 QoQ Growth
- 0.00915 / 0.00767 - 1 = **19.3%**

Agent A states **+19.3% QoQ** → ✅ Correct

### 5.4 ETH NAV
- 4,325,738 × $2,125 = **$9,192,193,250**

Agent A states $9,192,193,250 → ✅ Exact match

### 5.5 Note 13 Implied Share Reconciliation
- BS (Nov 30): 408,578,823
- + Note 13 ATM: 46,169,850
- = 454,748,673
- Cover page (Jan 12): 454,862,451
- **Gap: 113,778** — explained by warrant exercises between Nov 30 and Jan 12

Agent A doesn't flag this gap but it's immaterial. ✅

**Verdict: FULL PASS — all arithmetic verified**

---

## 6. SOURCE AUTHORITY ATTACK

### 6.1 Holdings Data
Agent A sources holdings from the **8-K filed Feb 9, 2026 (Exhibit 99.1)** — this is a press release attached to an SEC filing. While technically a press release, it's filed as Ex-99.1 to an 8-K under Item 7.01 (Reg FD), making it an SEC filing. ✅

### 6.2 Financial Data
- Shares: 10-Q XBRL ✅ (SEC filing)
- Balance sheet: 10-Q ✅ (SEC filing)
- Digital assets: 10-Q Note 3 ✅ (SEC filing)
- Dilutives: 10-Q Notes 7-8 ✅ (SEC filing)

### 6.3 Citation URLs
All major citations point to SEC EDGAR URLs:
- Holdings: `sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm` ✅
- 10-Q: `sec.gov/Archives/edgar/data/1829311/000149315226002084/form10-q.htm` ✅

**No citations pointing to company press releases, IR pages, or third-party sources for core data.** ✅

### 6.4 Source URL Validity
Verified via browser that the Feb 9, 2026 8-K URL resolves and contains the quoted text. ✅

**Verdict: FULL PASS — all citations point to SEC filings**

---

## 7. BMNR-SPECIFIC PITFALLS CHECK

### 7.1 Non-Standard Fiscal Year
Agent A correctly identifies:
- FY end: August 31 ✅
- Current quarter mapping (Q2 FY2026 = Dec 1, 2025 — Feb 28, 2026) ✅
- Quarter boundaries for all FY2025 and FY2026 quarters ✅

### 7.2 No ATM Share Disclosure
Agent A correctly notes BMNR doesn't disclose shares in weekly 8-Ks. ✅
References the estimation methodology from TOOLS.md. ✅

### 7.3 Warrant Issuances
Verified via EDGAR EFTS: no Item 3.02 filings since Jul 9, 2025 PIPE. ✅
Agent A captures the only warrant issuances (PIPE deal + CVI offering). ✅

### 7.4 Staking Yield
Agent A quotes:
- CESR: 3.11% ✅ (matches filing)
- BMNR 7-day annualized yield: 3.3234% ✅ (matches filing)
- Annualized staking revenues: $202M ✅ (matches filing)

**Staking yield claims are sourced from the 8-K press release**, which is the primary source. No independent verification possible (no on-chain data cited). This is acceptable — the staking data is from the company's own disclosure.

### 7.5 Former Name / Entity History
Agent A doesn't mention that BMNR was formerly "Sandy Springs Holdings, Inc." (changed ~Jul 2021). This is context that could be relevant for understanding the company's history. **Minor omission.**

**Verdict: PASS**

---

## 8. ISSUES SUMMARY

### Critical Issues: 0

### High Issues: 0

### Medium Issues: 2

1. **Share count staleness (33 days):** The 454.9M anchor is from Jan 12 and BMNR is actively issuing via ATM. Estimated current count ~490M. Agent A acknowledges but doesn't quantify the gap or apply the estimation formula from TOOLS.md.

2. **Staking figure headline/body discrepancy:** The 8-K's headline says 2,873,459 but body says 2,897,459 staked ETH. Agent A used the body (correct choice) but didn't flag the inconsistency.

### Low Issues: 2

3. **Q4 FY2025 ETH estimate not from 10-K:** Agent A interpolates between 8-K dates rather than extracting the exact Aug 31 figure from the 10-K digital asset notes.

4. **Consulting fee context:** Agent A quotes "$40,000 to $50,000 annually" without noting the 10-Q reports in thousands, making the actual fee $40-50M/year — material at ~0.5% AUM.

---

## 9. VERIFIED CLEAN

The following data points were independently verified and match Agent A's report:

- ✅ ETH holdings: 4,325,738 (verified against 8-K filing via browser)
- ✅ ETH price cited: $2,125 (verified against 8-K filing)
- ✅ BTC holdings: 193 (verified against 8-K and 10-Q)
- ✅ Cash: $595M (verified against 8-K)
- ✅ Total debt: $0 (verified against 10-Q BS)
- ✅ Preferred equity: $0 (verified against 10-Q)
- ✅ Shares (10-Q cover Jan 12): 454,862,451 (verified via XBRL)
- ✅ Shares (BS Nov 30): 408,578,823 (verified via XBRL)
- ✅ ETH NAV calculation: $9,192,193,250 (arithmetic verified)
- ✅ Q1 FY2026 HPS: 0.00915 (arithmetic verified)
- ✅ QoQ HPS growth: +19.3% (arithmetic verified)
- ✅ ETH supply %: 3.58% (arithmetic verified)
- ✅ Fiscal year end: Aug 31 (verified via EDGAR submissions)
- ✅ CIK: 0001829311 (verified via EDGAR)
- ✅ All dilutive instruments enumerated with strikes
- ✅ Feb 9, 2026 8-K is the most recent holdings update (no newer filings)
- ✅ Feb 11 8-K confirmed as conference presentation only
- ✅ No 424B5 filings since Sep 22, 2025
- ✅ No Item 3.02 filings since Jul 9, 2025

---

## 10. NEXT PHASE RECOMMENDATIONS

1. **Apply share estimation formula** — Pipeline checker should verify whether the codebase uses 454.9M or an estimated current count. If using 454.9M as sharesForMnav, mNAV will be understated.

2. **Verify consulting fee treatment** — The $40-50M annual consulting fee (Ethereum Tower LLC) is material. Check if it's factored into the mNAV model anywhere (e.g., as an ongoing liability or cash drain).

3. **Beast Industries investment** — No SEC filing details the terms. Check if this is equity, convertible, or has warrants attached. Currently at $200M stated value with no independent verification.

4. **Warrant exercise tracking** — 63,460 Strategic Advisor warrants exercised in Q1. Monitor ongoing exercises (3,043,654 remaining at $5.40 — deeply ITM).

5. **Q4 FY2025 10-K exact ETH** — Extract from 10-K digital asset note for precise Q4 HPS rather than using estimation.
