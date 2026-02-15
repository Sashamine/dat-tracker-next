# BMNR Final Adversary Report
Generated: 2026-02-14

## Phase 4C Issue Assessment

### Issue 1 — HIGH: CVI Warrants (10.4M @ $87.50) missing from dilutive-instruments.ts
**CONFIRMED HIGH.** Pipeline check clearly documents 10,435,430 warrants at $87.50 strike (expires Mar 22, 2027) that are completely absent from code. Even though currently OTM, the mNAV framework needs them for dynamic ITM tracking. Must fix.

### Issue 2 — HIGH: Strategic Advisor warrants undercounted (1.2M vs 3.0M)
**CONFIRMED HIGH.** Code only has ThinkEquity placement agent portion (1,231,945 @ $5.40). Ground truth says total strategic advisor + rep = 3,043,654 @ $5.40. Missing ~1.8M warrants at $5.40 — these are ITM at any stock price above $5.40, so they materially affect diluted share count.

### Issue 3 — HIGH: RSU misclassification (26,954 RSUs labeled as 3,043,654 warrants)
**CONFIRMED HIGH.** The 3,043,654 "NonOptionEquityInstrumentsOutstanding" XBRL field was mapped as RSUs at $0 strike. In reality that's the total warrant count (Issue #2). Actual RSUs = 26,954. This double-counts the warrants AND misrepresents the RSUs.

### Issue 4 — MEDIUM: C-3 Warrants count mismatch (1,280 vs 129,375)
**CONFIRMED but DOWNGRADED to LOW.** These are legacy pre-pivot warrants. The 129,375 vs 1,280 discrepancy needs verification but the absolute dollar impact is negligible (either way, <$1.3M at $10 strike). Low priority relative to CVI and strategic advisor fixes.

### Issue 5 — MEDIUM: Nov 30 share anchor (408.6M) missing → ~6% HPS overstatement
**CONFIRMED MEDIUM.** Code uses 384.1M (Nov 20 10-K cover) for the Nov 30 entry, but the 10-Q balance sheet shows 408.6M at Nov 30. HPS at that date: 0.00970 vs correct 0.00912. This affects historical HPS chart accuracy but NOT current mNAV (which uses estimated ~524M). Still should fix for data integrity.

### Issue 6 — LOW: Staking revenue $188M → $202M stale
**CONFIRMED LOW.** Feb 2 8-K ($188M) vs Feb 9 8-K ($202M). ~7% difference, display-only metric. Easy update.

### Issue 7 — MEDIUM: Consulting fee ($40-50M/yr) not in burn
**DISPUTED — downgrade to INFORMATIONAL.** This is a methodology choice, not a bug. The pipeline check itself notes "$1M/qtr is meant to capture operational overhead, not AUM management fees." The consulting fee is a strategy cost tied to ETH accumulation, not operational burn. The current approach (low burn = more cash available for crypto) is defensible. However, the UX should disclose this exclusion. Recommend adding a tooltip or note, not changing the burn number.

### Issue 8 — LOW: hasDilutiveInstruments should be true
**CONFIRMED — UPGRADE to MEDIUM.** With ~13.5M potentially dilutive shares (CVI 10.4M + strategic advisor 3.0M + RSUs 27K), this boolean affects whether the UI shows dilution analysis. Setting it false hides material information from users. Easy one-line fix.

---

## Code Spot-Checks

### Spot-Check 1: dilutive-instruments.ts — BMNR section

**Verified against code (lines 52-82).** BMNR has exactly 3 entries:
1. `warrant` — 129,375 @ $10.00 (labeled "ClassOfWarrantOrRightOutstanding @ $10 exercise price")
2. `warrant` — 1,231,945 @ $5.40 (labeled "Placement agent warrants (ThinkEquity) from $250M PIPE")
3. `option` — 3,043,654 @ $0 (labeled "RSUs/restricted stock (NonOptionEquityInstrumentsOutstanding)")

**Findings:**
- **CVI warrants (10.4M @ $87.50): CONFIRMED MISSING.** Not present anywhere in the BMNR array. This is the single biggest dilutive-instruments gap.
- **RSU misclassification: CONFIRMED.** Entry #3 maps `NonOptionEquityInstrumentsOutstanding` (3,043,654) as RSUs with $0 strike. Per ground truth, the NonOptionEquityInstruments XBRL tag captures the *warrants* (strategic advisor + placement agent = 3,043,654 total). Actual RSUs = 26,954. This entry is **double-counting** the warrants already partially captured in entry #2 AND misrepresenting 3M+ warrants as zero-cost RSUs.
- **Strategic advisor undercount: CONFIRMED.** Only 1,231,945 (ThinkEquity portion) is in entry #2. The remaining ~1,811,709 strategic advisor warrants at $5.40 are missing. BUT: the misclassified entry #3 (3,043,654 at $0) inadvertently captures the *total count* — just at the wrong strike ($0 vs $5.40). So the mNAV model actually OVER-counts dilution at low stock prices (treating all 3M as ITM regardless of price) while UNDER-counting if someone fixed just #2 without removing #3.
- **C-3 warrants (129,375 vs 1,280): NEEDS RESEARCH.** The 129,375 likely comes from a different XBRL line item. Pipeline check couldn't determine which is correct. Low priority given dollar magnitude.

### Spot-Check 2: BMNRCompanyView.tsx — Hardcoded values and StalenessNote

**Verified against code (full file read).**

- **No hardcoded financial values.** All metrics derived from `BMNR_PROVENANCE` and `estimateBMNRShares()`. ✅
- **`hasDilutiveInstruments={false}`** on line ~243 (MnavCalculationCard props): CONFIRMED incorrect. Should be `true`.
- **mNAV formula in component:** `ev = estimatedMarketCap + totalDebt + preferredEquity - cashReserves`. This uses `estimatedMarketCap = stockPrice * estimatedShares` where `estimatedShares = estimateBMNRShares().totalEstimated`. **Parity concern**: The component computes its own EV inline, while the shared `calculateMNAV()` function has a different formula involving `restrictedCash` and `otherInvestments` materiality threshold. See Spot-Check 3 below.
- **StalenessNote:** Passes 4 dates (`holdingsLastUpdated`, `debtAsOf`, `cashAsOf`, `sharesAsOf`). No `burnAsOf`. Minor — burn is estimated anyway.
- **Cost basis STALE badge:** Displayed correctly with "Nov 2025" label. ✅

### Spot-Check 3: mnav-calculation.ts + calculations.ts — BMNR mNAV formula parity

**File at `src/lib/utils/mnav-calculation.ts` delegates to `calculateMNAV()` in `src/lib/calculations.ts`.**

The canonical `calculateMNAV()` formula:
```
baseCryptoNav = holdings × assetPrice + secondaryCryptoValue
freeCash = cashReserves - restrictedCash
EV = marketCap + totalDebt + preferredEquity - freeCash
totalNav = baseCryptoNav + restrictedCash + (otherInvestments if >5% of cryptoNav)
mNAV = EV / totalNav
```

**BMNR-specific values flow:**
- `restrictedCash = 595M` (same as cashReserves) → `freeCash = 595M - 595M = 0` → EV not reduced by cash ✅
- `otherInvestments = 219M` (Beast + Eightco) → Check: 219M / (4,325,738 × ETH_price). At $2,125: cryptoNav = $9.19B → ratio = 2.4% < 5% threshold → **otherInvestments EXCLUDED from totalNav**. ✅ Correct — these are non-crypto equity stakes.
- `totalNav = cryptoNav + 595M + 0` = cryptoNav + 595M (restrictedCash added to NAV denominator)

**BMNRCompanyView.tsx formula:**
```
cryptoNav = holdings × ethPrice
ev = estimatedMarketCap + totalDebt + preferredEquity - cashReserves
mNav = ev / cryptoNav
```

**⚠️ PARITY ISSUE:** The component's formula differs from the canonical:
1. Component: `ev = mcap - cashReserves` (subtracts full $595M from EV) and `mNAV = ev / cryptoNav` (denominator is just cryptoNav)
2. Canonical: `ev = mcap - freeCash` where `freeCash = cash - restrictedCash = 0` (no subtraction from EV) and `mNAV = ev / (cryptoNav + restrictedCash)` (denominator includes $595M)

**Net effect for BMNR:** Both $595M cancel out differently but reach approximately the same result:
- Component: `(mcap - 595M) / cryptoNav`
- Canonical: `mcap / (cryptoNav + 595M)`

These are NOT algebraically equivalent. Example at mcap=$15B, cryptoNav=$9.2B:
- Component: (15B - 595M) / 9.2B = 14.4B / 9.2B = **1.567**
- Canonical: 15B / (9.2B + 595M) = 15B / 9.795B = **1.531**

**Difference: ~2.4%.** This is a NEW ISSUE not found by the pipeline check. The overview page (using canonical `getCompanyMNAV()`) and the BMNR detail page (using inline formula) will show slightly different mNAV values.

---

## Cross-Agent Quality Notes (from Extraction Adversary)

The extraction adversary (Agent B) report is **thorough and well-structured**. Key points:

1. **Staking headline vs body discrepancy** (2,873,459 vs 2,897,459): Good catch. Agent A used the body figure correctly. Pipeline check didn't flag this.
2. **Consulting fee units** ($40K-50K in thousands = $40-50M actual): Important context that validates Issue #7. Agent B correctly identified this.
3. **Share count gap reconciliation** (408.6M + 46.2M ATM = 454.7M vs cover 454.9M, gap 113K from warrant exercises): Nice cross-check showing data consistency.
4. **All arithmetic independently verified** — Q1 FY2026 HPS, QoQ growth, ETH NAV. No errors found.
5. **Source authority: FULL PASS** — all citations to SEC filings, no third-party sourcing.

**Cross-agent consensus:** Both agents agree on the 8 issues. No contradictions between extraction adversary and pipeline checker findings.

---

## New Issues Found

### NEW-1: mNAV formula parity gap between BMNRCompanyView.tsx and canonical calculateMNAV()
**Severity: MEDIUM.** The inline formula in the company view treats cash differently from the shared calculator. Result: ~2.4% mNAV discrepancy between overview page and detail page. Fix: refactor BMNRCompanyView to use the canonical `calculateMNAV()` or `getCompanyMNAV()` function.

### NEW-2: Duplicate holdings history files
**Severity: LOW.** Both `holdings-history.ts` (inline `BMNR_HISTORY`) and `bmnr-holdings-history.ts` contain identical data. Risk of divergence. Consider having `holdings-history.ts` import from `bmnr-holdings-history.ts`.

---

## Recommended Fix Order

### Priority 1 — Data Correctness (dilutive instruments)
1. **Add CVI Warrants:** 10,435,430 @ $87.50, exp Mar 22 2027, source: 10-Q Note 7/8
2. **Fix RSU misclassification:** Change entry #3 from `option/3,043,654/$0` to `warrant/3,043,654/$5.40` (or split into two entries: 1,811,709 strategic advisor + 1,231,945 already captured). Then add actual RSUs: `option/26,954/$0`.
3. **Set `hasDilutiveInstruments={true}`** in BMNRCompanyView.tsx (one-line fix, do with #1-2)

### Priority 2 — Share accuracy
4. **Add Nov 30 share anchor** (408,578,823) to `bmnr-holdings-history.ts` SHARE_ANCHORS
5. **Verify C-3 warrants** (1,280 vs 129,375) — requires going back to pre-pivot 10-K

### Priority 3 — Formula parity
6. **Refactor BMNRCompanyView mNAV** to use canonical `calculateMNAV()` instead of inline formula

### Priority 4 — Data freshness
7. **Update staking revenue** from $188M → $202M (use Feb 9 8-K accession)

### Priority 5 — Methodology decisions (not bugs)
8. **Consulting fee treatment** — decide whether to increase burn to ~$10-12.5M/qtr or add a disclosure note. Recommend: add tooltip/note, don't change the burn number.
9. **Deduplicate holdings history** files (low urgency, code hygiene)

---

## Summary

**Status:** Complete
**Output file:** `C:\Users\edwin\dat-tracker-next\scripts\qa-screenshots\bmnr\final-adversary.md`

### Phase 4C Issues Confirmed (7 of 8)
1. ✅ HIGH: CVI Warrants missing — **CONFIRMED HIGH**
2. ✅ HIGH: Strategic Advisor warrants undercounted — **CONFIRMED HIGH** (with nuance: misclassified entry #3 inadvertently captures total count at wrong strike)
3. ✅ HIGH: RSU misclassification — **CONFIRMED HIGH**
4. ✅ MEDIUM→LOW: C-3 Warrants mismatch — **CONFIRMED, DOWNGRADED TO LOW** (negligible dollar impact)
5. ✅ MEDIUM: Nov 30 share anchor missing — **CONFIRMED MEDIUM**
6. ✅ LOW: Staking revenue stale — **CONFIRMED LOW**
8. ✅ LOW→MEDIUM: hasDilutiveInstruments=false — **CONFIRMED, UPGRADED TO MEDIUM**

### Phase 4C Issues Disputed (1 of 8)
7. ⚠️ MEDIUM→INFORMATIONAL: Consulting fee not in burn — **DISPUTED.** This is a methodology choice, not a bug. The fee is an AUM management cost, not operational burn. Recommend disclosure note instead of changing the number.

### New Issues Found (2)
- **NEW-1 MEDIUM:** mNAV formula parity gap between BMNRCompanyView inline calc and canonical calculateMNAV() (~2.4% discrepancy)
- **NEW-2 LOW:** Duplicate holdings history files risk divergence

### Recommended Fix Order
1. Dilutive instruments (Issues 1-3, 8) — highest impact, data correctness
2. Nov 30 share anchor (Issue 5) — historical HPS accuracy
3. mNAV formula parity (NEW-1) — UI consistency
4. Staking revenue update (Issue 6) — data freshness
5. C-3 warrant verification (Issue 4) — low priority research
6. Consulting fee disclosure (Issue 7) — methodology/UX
7. Holdings history dedup (NEW-2) — code hygiene
