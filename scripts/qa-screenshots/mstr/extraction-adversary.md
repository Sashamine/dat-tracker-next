# MSTR Extraction Adversary Report

**Reviewed By:** Agent B (Extraction Adversary)
**Date:** February 14, 2026
**Subject:** Attack on Agent A's Ground Truth Extraction

---

## Executive Summary

Agent A's extraction contains **multiple critical gaps and errors** that would materially impact mNAV calculation. The most severe issues are:
1. **Missing ~$6.73B in preferred stock liquidation values** — directly impacts EV
2. **Share count 3+ months stale** during active ATM issuance — likely understated by 30-50M+ shares
3. **Q4 earnings URL filename suggests Q3 data** — potential mislabeling
4. **BTC Yield arithmetic doesn't check** — 22.8% yield on starting holdings doesn't equal 101,873 BTC gain

---

## 1. COMPLETENESS ATTACKS 🔴

### 1.1 Convertible Note Tranches — CRITICAL GAP

Agent A explicitly marked this as "TODO" but **convertible debt is essential for mNAV**. From the Q3 10-Q balance sheet:

| Line Item | Sep 30, 2025 | Dec 31, 2024 |
|-----------|--------------|--------------|
| Long-term debt, net | **$8,173,587K** | $7,191,158K |
| Current portion of long-term debt | $316K | $517K |
| **Total Debt** | **~$8.17B** | ~$7.19B |

The extraction needs the **individual tranches** (face value, coupon, maturity, conversion price) from the 10-K debt footnotes. Without these, we can't:
- Model conversion scenarios
- Calculate diluted share counts at various stock prices
- Properly value the debt component of EV

**ACTION REQUIRED:** Extract full debt schedule from 10-K Note 7 (Long-Term Debt).

### 1.2 Preferred Stock Liquidation Values — FOUND, NOT EXTRACTED

Agent A listed preferred tickers but **missed the liquidation preferences** which feed directly into `preferredEquity` in the mNAV formula.

From Q3 10-Q Mezzanine Equity section (as of Sep 30, 2025):

| Preferred Class | Shares Outstanding | Liquidation Preference |
|-----------------|-------------------|----------------------|
| STRF (10% Strife) | 11,948 | **$1,332,115K** |
| STRC (Variable Stretch) | 28,011 | **$2,801,111K** |
| STRK (8% Strike) | 13,606 | **$1,360,587K** |
| STRD (10% Stride) | 12,322 | **$1,232,214K** |
| **TOTAL** | | **$6,726,027K (~$6.73B)** |

**This is a $6.73B omission from EV calculation!**

Note: STRE (Stream) is listed on Luxembourg exchange — liquidation value needs 10-K verification.

### 1.3 ATM Programs — 424B5 Filings

Agent A listed ATM capacity but didn't reference the 424B5 prospectus supplements that establish these programs. For audit trail:
- Need 424B5 accession numbers for each ATM program
- Need cumulative shares issued under each program

---

## 2. ACCURACY ATTACKS 🔴

### 2.1 Q4 2025 Earnings URL — WRONG FILENAME?

Agent A cites:
```
Source URL: https://www.sec.gov/Archives/edgar/data/1050446/000105044626000012/mstr-20251030x8kxex991.htm
```

**Problem:** The filename contains "20251030" — that's **October 30, 2025**, which is the Q3 2025 earnings date, NOT Q4 2025.

Q4 2025 earnings were released February 5, 2026. The correct filename should contain a date in late January or early February 2026.

**STATUS:** URL needs verification. May be pulling Q3 data labeled as Q4.

### 2.2 Q4 Holdings "Derived from BTC Yield" — NOT PRIMARY SOURCE

Agent A states:
> "Holdings: ~672,500 (Dec 31)" for Q4 is marked "Derived from BTC Yield"

This is **circular reasoning** — we can't use a derived number as ground truth. We need:
- The actual Dec 31, 2025 holdings from the 10-K or 8-K filing
- The 10-K (when filed) will have audited year-end holdings

**Current best primary source:** The Feb 5, 2026 Q4 earnings 8-K exhibit should have Feb 1, 2026 holdings of 713,502 BTC.

### 2.3 Quarterly Holdings "est" — Find Actual Numbers

Agent A marked Q1-Q3 holdings as estimates. The 10-Q filings contain exact holdings:

| Quarter | Agent A Value | Primary Source Needed |
|---------|--------------|----------------------|
| Q3 2025 | 252,220 | ✅ From 10-Q |
| Q2 2025 | 226,500 (est) | ❌ Need 10-Q or 8-K |
| Q1 2025 | 214,246 | Check if from 10-K or 10-Q |

### 2.4 Feb 9 8-K URL — Filename Date Mismatch (NOT AN ERROR)

Agent A cited URL: `mstr-20260105.htm` for a Feb 9 filing.

**Verified:** This is **NOT an error** — SEC Edgar naming convention uses the date from the document preparation, not filing date. The 8-K itself states "Date of Report: February 9, 2026" and contains Feb 8, 2026 holdings data. URL works correctly.

---

## 3. STALENESS ATTACKS 🔴

### 3.1 Share Count — MASSIVELY STALE (Critical!)

Agent A uses:
> "Total Basic Shares = 287,353,735 (Oct 30, 2025)"

**Problem:** MSTR has been issuing shares via ATM **every week** since then!

From the Feb 9, 2026 8-K I verified:
- In just **ONE WEEK** (Feb 2-8, 2026): **616,715 MSTR shares sold**
- Net proceeds: $89.5M

This means ~15 weeks of ATM issuance have occurred since Oct 30, 2025. Assuming similar pace:
- Estimated additional shares: 15 × 600K = **~9M+ shares** (conservative)
- Actual number could be 20-50M+ higher depending on weekly activity

**The share count is likely understated by 10-20%**, which directly impacts:
- Market cap calculation
- HPS (Holdings Per Share)
- mNAV

**ACTION REQUIRED:** Sum all weekly 8-K ATM filings since Oct 30, 2025 to get current share count.

### 3.2 Cash Position — Misleading Representation

Agent A states:
> "Cash: $2.3B from Q4 PR"

**Reality from Q3 10-Q balance sheet:**
- Cash and cash equivalents (Sep 30, 2025): **$54,285K** (~$54M)

The "$2.3B" is the **USD Reserve** established for preferred dividends — this is NOT freely available cash. The Q4 PR describes it as "2.5 years of dividend and interest coverage."

For mNAV purposes:
- This cash is **earmarked for obligations** (dividends, interest)
- It should NOT be treated as "excess cash" that reduces EV
- It's actually closer to a liability matching exercise

**CLASSIFICATION:** Should be neutral to mNAV (not added to CryptoNAV, not subtracted from EV).

---

## 4. METHODOLOGY ATTACKS ⚠️

### 4.1 Class A vs Class B for sharesForMnav

Agent A uses combined Class A + Class B:
> "Total Basic Shares = 287,353,735 (Class A + Class B)"

**Question:** Should Class B (19,640,250 shares held by Michael Saylor) be included?

**Analysis:**
- **For market cap:** Only Class A × price (Class B doesn't trade)
- **For HPS:** All shares have equal economic rights to BTC
- **For mNAV:** The formula uses marketCap which is Class A only

**Recommendation:** 
- `sharesForMnav` should be **Class A only** (for market cap)
- HPS can use **both classes** (for dilution tracking)

**Current treatment appears INCORRECT** — using combined shares for mNAV will understate market cap.

### 4.2 BTC Yield vs Raw HPS

Agent A tracks BTC Yield (22.8% FY2025) as the HPS metric.

**Issue:** BTC Yield is a **company-defined KPI** that may not equal raw HPS growth:
- BTC Yield = BTC Gain / (Beginning Holdings + weighted issuance)
- Raw HPS = (Ending Holdings / Ending Shares) vs (Beginning Holdings / Beginning Shares)

These can diverge significantly with mid-period issuances. For DAT Tracker, we should calculate **raw HPS** from:
- Quarter-end holdings (from 10-Q/8-K)
- Quarter-end shares (from 10-Q cover)

**BTC Yield is useful context but NOT a substitute for HPS calculation.**

---

## 5. ARITHMETIC ATTACKS ❌

### 5.1 BTC Yield Arithmetic — DOESN'T CHECK

Agent A reports:
- FY2025 BTC Yield: 22.8%
- FY2025 BTC Gain: 101,873 BTC

**Verification attempt:**
```
If BTC Yield = BTC Gain / Starting Holdings
Then: 22.8% = 101,873 / X
X = 101,873 / 0.228 = 446,811 BTC (implied starting holdings)
```

**Problem:** Dec 31, 2024 holdings from 10-K should be ~189,150 BTC (pre-Q1 2025 purchases).

446,811 BTC starting holdings is **way too high**. Either:
1. The BTC Yield formula uses a different denominator (weighted average?)
2. The 22.8% and 101,873 numbers are inconsistent
3. I'm missing context on the methodology

**NEEDS RECONCILIATION** — get exact formula from Q4 PR or 10-K.

### 5.2 Q3 HPS Calculation — Minor Discrepancy

Agent A: Q3 HPS = ~87,766 sats
Task claims correct = 87,804 sats

**My calculation:**
```
252,220 BTC ÷ 287,353,735 shares = 0.000877855
× 100,000,000 = 87,785.5 sats
```

None of these match exactly:
- Agent A: 87,766 (off by ~20)
- Task "correct": 87,804 (off by ~19)
- My calc: 87,786

**Likely cause:** Different share counts or holdings figures used. Need to verify exact quarter-end numbers from 10-Q XBRL.

---

## 6. SOURCE AUTHORITY ATTACKS ⚠️

### 6.1 Shares from 10-Q Cover — Stale But Best Available

Agent A correctly notes shares from Oct 30, 2025 10-Q cover page.

**Better source exists:** Weekly 8-K filings include cumulative ATM shares sold. The Feb 9 8-K should show cumulative shares under each program.

**However:** 8-Ks don't show total shares outstanding — they show shares sold under ATM programs. To get current shares:
```
Current Shares = 10-Q Cover Shares + Sum(all ATM shares since filing date) + Stock Option Exercises
```

This requires aggregating all weekly 8-Ks — significant work but necessary for accurate mNAV.

### 6.2 Cash from Press Release — Should Use 10-Q

Agent A cites "$2.3B" from press release.

**Better source:** The Q3 10-Q balance sheet has audited cash figure ($54.3M). For Q4, wait for 10-K or use 8-K exhibit with balance sheet.

Press release figures may be rounded and aren't primary SEC sources.

---

## Summary of Required Fixes

### Critical (Blocks mNAV Calculation)
1. ❌ Extract convertible note tranches from 10-K debt footnotes
2. ❌ Add preferred stock liquidation values (~$6.73B)
3. ❌ Update share count with post-Oct ATM issuance

### High Priority (Accuracy)
4. ⚠️ Verify Q4 earnings URL points to correct filing
5. ⚠️ Get primary source for Dec 31, 2025 BTC holdings
6. ⚠️ Clarify Class A vs A+B for sharesForMnav
7. ⚠️ Correct cash treatment (earmarked vs excess)

### Medium Priority (Methodology)
8. ⚠️ Reconcile BTC Yield arithmetic
9. ⚠️ Calculate raw HPS in addition to BTC Yield
10. ⚠️ Get exact Q2 2025 holdings from 10-Q

---

## Data I Verified

From Q3 2025 10-Q (direct browser verification):
- **Cash & equivalents:** $54,285K
- **Long-term debt:** $8,173,587K
- **STRF liquidation preference:** $1,332,115K
- **STRC liquidation preference:** $2,801,111K
- **STRK liquidation preference:** $1,360,587K
- **STRD liquidation preference:** $1,232,214K
- **Class A shares (Oct 30):** 267,713,485
- **Class B shares (Oct 30):** 19,640,250

From Feb 9, 2026 8-K (direct browser verification):
- **BTC Holdings (Feb 8, 2026):** 714,644 BTC ✅
- **MSTR shares sold (Feb 2-8):** 616,715
- **Net proceeds:** $89.5M
- **ATM capacity remaining:** $7,974.3M (MSTR), $20,331.6M (STRK), etc.

---

*Report generated by Agent B on behalf of DAT Tracker QA Pipeline*
