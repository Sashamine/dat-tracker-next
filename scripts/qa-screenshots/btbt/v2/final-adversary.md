# BTBT Final Adversary Report — Agent D
**Audit Date:** 2026-02-14
**Reviewing:** All prior agents' work (Ground Truth, Extraction Adversary, Pipeline Check)

---

## Executive Summary

| Attack Vector | Status | Critical Issues Found |
|---------------|--------|----------------------|
| **1. Spot-check vs exhaustive** | ⚠️ PARTIAL | Agent C verified correctly but missed formula divergences |
| **2. Hardcoded values** | ⚠️ FOUND | 5+ hardcoded financial values in company view |
| **3. Formula parity** | ❌ FAIL | ITM debt adjustments missing from company page |
| **4. Chart/earnings alignment** | ✅ PASS | Holdings values match across UI components |
| **5. Placeholder detection** | ⚠️ FOUND | Q1 2025 "10,000 ETH" is placeholder with confidence: "low" |
| **6. Agent quality** | ⚠️ PARTIAL | Agent C missed formula divergences |
| **7. Fix safety** | ✅ PASS | Fabricated preferred quote removed, $9.05M now correct |

**Overall Verdict:** ⚠️ **FORMULA DIVERGENCE DETECTED** — Company page and overview page will produce different mNAV values when converts go ITM.

---

## Attack Vector 1: Spot-check vs Exhaustive

Agent C claimed "ALL MATCH" for key values. I independently verified:

### Holdings-history Q2 2025
**Code (holdings-history.ts):**
```typescript
{ date: "2025-06-30", holdings: 30_663, sharesOutstandingDiluted: 321_432_722, holdingsPerShare: 0.000095, ... }
```
**Agent C claim:** "Q2 2025 (Jun 30): 30,663 / 321,432,722 / 0.000095"

**Verdict:** ✅ MATCH

### Earnings-data Q3 2025
**Code (earnings-data.ts):**
```typescript
holdingsAtQuarterEnd: 122_187,  // Sep 30, 2025 monthly PR
sharesAtQuarterEnd: 323_674_831,
holdingsPerShare: 0.000378,
```
**Agent C claim:** "Q3 2025 (Sep 30): 122,187 / 323,674,831 / 0.000378"

**Verdict:** ✅ MATCH

### Companies.ts preferredEquity
**Code (companies.ts):**
```typescript
preferredEquity: 9_050_000,  // 1M preferred shares at $9.05M book value
```
**Agent C claim:** "$9,050,000"

**Verdict:** ✅ MATCH

**Agent C Assessment:** Verified spot values correctly, BUT missed formula-level divergences (see Vector 3).

---

## Attack Vector 2: Hardcoded Values

Searched `BTBTCompanyView.tsx` for hardcoded financial numbers:

### FOUND: Hardcoded Values (Should Be Dynamic)

| Location | Hardcoded Value | Should Come From |
|----------|-----------------|------------------|
| **Convertible Notes Card** | "36.1M" dilutive shares | `BTBT_CONVERTIBLE.potentialShares` (36,057,692) |
| **Convertible Notes Card** | "$4.16" conversion price | `BTBT_CONVERTIBLE.conversionPrice` |
| **Convertible Notes Card** | "Oct 2030" maturity | `BTBT_CONVERTIBLE.maturityDate` |
| **BTC Mining Card** | "64.9 BTC" | No provenance constant |
| **BTC Mining Card** | "~1.9 EH/s" hash rate | No provenance constant |
| **ETH Holdings sublabel** | "155,227 ETH (Dec 31, 2025)" | Dynamic from `BTBT_PROVENANCE.holdings.value` |

### Acceptable Hardcoded Text (Static Info)
- Underwriter names: "Barclays, Cantor, B. Riley"
- Investor names: "Kraken, Jump Trading, Jane Street"
- CEO name: "Sam Tabar"

### Risk Assessment
The "36.1M" dilutive shares text is hardcoded when `BTBT_CONVERTIBLE.potentialShares` already exists with the exact value. If convertible terms change, the card text won't update.

**Recommendation:** Replace hardcoded values with provenance references:
```typescript
<p className="text-2xl font-bold">{(BTBT_CONVERTIBLE.potentialShares.value/1e6).toFixed(1)}M</p>
```

---

## Attack Vector 3: Formula Parity (❌ CRITICAL)

Agent C said "formulas match." **This is INCORRECT.**

### Overview Page Formula (mnav-calculation.ts → getCompanyMNAV)
```typescript
// From getCompanyMNAV():
const { marketCap, inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = 
  getMarketCapForMnavSync(company, stockData, prices.forex);

// Adjust debt by subtracting in-the-money convertible face values
const adjustedDebt = Math.max(0, (company.totalDebt || 0) - inTheMoneyDebtValue);

// Add in-the-money warrant exercise proceeds to cash
const adjustedCashReserves = (company.cashReserves || 0) + inTheMoneyWarrantProceeds;
const adjustedRestrictedCash = (company.restrictedCash || 0) + inTheMoneyWarrantProceeds;

// From calculateMNAV():
baseCryptoNav = (holdings * assetPrice) + secondaryCryptoValue;  // ← Includes secondary crypto
totalNav = baseCryptoNav + restrictedCash + (otherInvestmentsMaterial ? otherInvestments : 0);
freeCash = adjustedCashReserves - adjustedRestrictedCash;
enterpriseValue = marketCap + adjustedDebt + preferredEquity - freeCash;  // ← Uses adjustedDebt
mNAV = enterpriseValue / totalNav;
```

### Company Page Formula (BTBTCompanyView.tsx)
```typescript
// From BTBTCompanyView useMemo:
const d = BTBT_PROVENANCE.totalDebt.value;  // ← Raw debt, NO ITM adjustment
const baseCryptoNav = h * ethP;              // ← NO secondaryCryptoValue
const fc = c - rc;                           // freeCash
const ev = mc + d + pf - fc;                 // ← Uses raw debt (d), not adjustedDebt
const mn = nav > 0 ? ev / nav : null;
```

### Divergences Found

| Component | Overview Page | Company Page | Impact |
|-----------|---------------|--------------|--------|
| **ITM Debt Adjustment** | Subtracts ITM convert face value from debt | Uses raw debt | **When stock > $4.16, mNAV will diverge** |
| **ITM Warrant Proceeds** | Adds to cash | Not implemented | Warrants would cause divergence |
| **Secondary Crypto** | Included in baseCryptoNav | Not included | Companies with secondary holdings diverge |

### Current Impact
- BTBT stock: $1.76
- Convert strike: $4.16
- Status: **OTM** — no current divergence

**When stock exceeds $4.16:** The overview page will treat the $150M converts as "already equity" (reducing debt by $150M) while the company page will still show $150M debt. This will produce different mNAV values.

### Latent Bug: secondaryCryptoValue
The company page doesn't include `secondaryCryptoValue` in its calculation. While BTBT doesn't have secondary crypto holdings today, any company with `secondaryCryptoHoldings` would show divergent mNAV between pages.

**Agent C Failure:** Agent C said "Line-by-line comparison: MATCH" for all formula components. This was incorrect — Agent C did not identify the ITM debt adjustment or secondary crypto differences.

---

## Attack Vector 4: Chart/Earnings Alignment

### Holdings History Table (from UI)
| Date | ETH Holdings |
|------|--------------|
| Dec 30, 2025 | 155,227 |
| Sep 29, 2025 | 122,187 |
| Jun 29, 2025 | 30,663 |
| Mar 30, 2025 | 10,000 |
| Dec 30, 2024 | 27,350 |
| Jun 29, 2024 | 22,890 |
| Dec 30, 2023 | 17,245 |

### Earnings-data.ts Values
| Quarter | Holdings |
|---------|----------|
| Q4 2025 | 155,227 ✅ |
| Q3 2025 | 122,187 ✅ |
| Q2 2025 | 30,663 ✅ |
| Q1 2025 | 10,000 ✅ |

### HPS Chart Summary
- Total ETH: 155,227 (from 17,245)
- ETH/Share: 0.0004794 (from 0.0001610)
- Period Growth: +197.5%
- Data points: 7

**Verdict:** ✅ PASS — All values consistent across Holdings History table, HPS chart, and earnings-data.ts.

---

## Attack Vector 5: Placeholder Detection

### BTBT_HISTORY Analysis (holdings-history.ts)

| Date | Holdings | Confidence | Suspicion |
|------|----------|------------|-----------|
| 2025-03-31 | **10,000** | **low** | ⚠️ **ROUND NUMBER, ESTIMATED** |
| 2024-12-31 | 27,350 | medium | "ETH count needs verification" |
| 2024-06-30 | 22,890 | medium | "ETH holdings need verification" |
| 2023-12-31 | 17,245 | medium | "ETH holdings from 20-F digital assets note" |
| 2025-06-30 | 30,663 | high | ✅ |
| 2025-09-30 | 122,187 | high | ✅ |
| 2025-12-31 | 155,227 | high | ✅ |

### Critical Finding: Q1 2025 Placeholder
```typescript
{ 
  date: "2025-03-31", 
  holdings: 10_000,  // ← Suspiciously round
  source: "Q1 2025 10-Q (pre-ETH pivot, estimated)",  // ← "estimated"
  confidence: "low"  // ← Low confidence flag
}
```

**This is NOT verified data.** The source says "estimated" and confidence is "low". The 10,000 ETH is a placeholder value before BTBT pivoted to ETH strategy.

### Pre-2025 Data Quality
Multiple entries have:
- `confidence: "medium"`
- Methodology notes like "ETH count needs verification"
- No direct source URL to specific ETH count

**Recommendation:** Either verify these values from SEC filings or add explicit "PLACEHOLDER" markers in the UI.

---

## Attack Vector 6: Agent Quality

### Agent A (Ground Truth) — ✅ GOOD
- Used most recent source (Feb 6, 2026 PR for Jan 31, 2026 data)
- Correctly identified all major financial instruments
- Provided verbatim quotes with URLs
- Noted data quality issues (slight discrepancies between slides)

### Agent B (Extraction Adversary) — ✅ GOOD
- Verified all quotes exist in source documents
- Caught completeness gaps (missing equity compensation)
- Correctly noted methodology differences

### Agent C (Pipeline Check) — ⚠️ INCOMPLETE
**What Agent C Did Well:**
- Verified specific values match across files
- Checked quarter-end anchors
- Confirmed HPS arithmetic

**What Agent C Missed:**
1. **ITM debt adjustment divergence** — Overview page applies ITM adjustments, company page doesn't
2. **secondaryCryptoValue missing** — Company page doesn't include it in baseCryptoNav
3. **Hardcoded values** — Didn't search component for hardcoded financial numbers

Agent C's "Line-by-line comparison" table said "MATCH" for every component, but the comparison was incomplete — it compared conceptual formula components but not the actual implementation details.

---

## Attack Vector 7: Fix Safety

### Preferred Equity Fix
**Before (fabricated):**
> "No preferred stock outstanding" — **NEVER EXISTED IN 10-Q**

**After (provenance/btbt.ts):**
```typescript
preferredEquity: pv(9_050_000, docSource({
  type: "sec-document",
  searchTerm: "9,050,000",
  url: "...ea0263546-10q_bitdigital.htm",
  quote: "Preferred shares, $0.01 par value, 10,000,000 shares authorized, 
         1,000,000 shares issued and outstanding — $9,050,000",
  anchor: "Preferred shares",
  ...
}), "1M preferred shares at $9.05M book value. Classified in shareholders' equity.")
```

**Verification:**
- Quote exists in 10-Q balance sheet ✅
- Search term "9,050,000" will find it ✅
- Fabricated quote removed ✅

**Verdict:** ✅ PASS — Fix is safe and accurate.

### Cross-File Consistency After Fix
| File | preferredEquity |
|------|-----------------|
| provenance/btbt.ts | $9,050,000 ✅ |
| companies.ts | $9,050,000 ✅ |
| holdings-history.ts Q4 2025 | $9,050,000 ✅ |
| earnings-data.ts | (not tracked) N/A |

All files agree on $9.05M preferred equity.

---

## Issues Summary

### Critical (Blocking)
1. **Formula Divergence:** Company page doesn't apply ITM debt adjustments. When BTBT stock exceeds $4.16, mNAV will differ between pages.

### Major
2. **Placeholder Data:** Q1 2025 entry (10,000 ETH) is estimated with `confidence: "low"`. Not flagged in UI.
3. **Agent C Miss:** Pipeline checker didn't catch formula implementation differences.

### Minor
4. **Hardcoded Values:** 5+ financial values hardcoded in component instead of using provenance.
5. **Missing secondaryCryptoValue:** Company page formula doesn't include it (no impact for BTBT but latent bug).
6. **Pre-2025 Data:** Multiple entries have `confidence: "medium"` with unverified ETH counts.

---

## Recommendations

### Immediate Fixes

1. **Sync mNAV Formula:**
   ```typescript
   // In BTBTCompanyView.tsx, use getCompanyMNAV() instead of custom calculation
   import { getCompanyMNAV } from "@/lib/utils/mnav-calculation";
   const mn = getCompanyMNAV(company, prices);
   ```
   This ensures formula parity automatically.

2. **Replace Hardcoded Values:**
   ```typescript
   // Instead of:
   <p>36.1M</p>
   // Use:
   <p>{(BTBT_CONVERTIBLE.potentialShares.value/1e6).toFixed(1)}M</p>
   ```

3. **Flag Placeholder Data:**
   Add visual indicator in Holdings History table for `confidence: "low"` entries.

### Process Improvements

4. **Agent C Checklist:** Add explicit verification step:
   > "For company pages with custom mNAV calculation: does it call getCompanyMNAV() or implement custom logic? If custom, verify ITM adjustments match."

5. **Formula Parity Test:** Add unit test comparing company page vs overview page mNAV for same inputs.

---

## Artifacts Verified

| File | Reviewed |
|------|----------|
| ground-truth.md | ✅ |
| extraction-adversary.md | ✅ |
| pipeline-check.md | ✅ |
| provenance/btbt.ts | ✅ |
| holdings-history.ts (BTBT section) | ✅ |
| earnings-data.ts (BTBT section) | ✅ |
| companies.ts (BTBT entry) | ✅ |
| BTBTCompanyView.tsx | ✅ |
| mnav-calculation.ts (getCompanyMNAV, calculateMNAV) | ✅ |
| calculations.ts (calculateMNAV) | ✅ |
| Company page UI | ✅ (via browser) |

---

## Conclusion

**BTBT data is ACCURATE but company page formula DIVERGES from overview page.**

The critical issue is that BTBTCompanyView implements its own mNAV calculation instead of using the centralized `getCompanyMNAV()` function. While both produce identical results today (converts are OTM), they will diverge when the stock exceeds the $4.16 conversion price.

Agent C's "ALL MATCH" claim was incomplete — it verified values but not formula implementation parity.

**Recommendation:** Refactor company view to use `getCompanyMNAV()` or sync the ITM adjustment logic.

---

*Final Adversary complete. Trust nothing, verify everything.*
