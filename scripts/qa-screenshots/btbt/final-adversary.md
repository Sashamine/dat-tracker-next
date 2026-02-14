# BTBT Final Adversary Report

**Generated:** 2026-02-14  
**Adversary:** Final Adversary Subagent

---

## Executive Summary

I found **6 critical errors** across the previous reports and code that need immediate attention. Trust nothing — the provenance file actively lies about preferred stock, the holdings history has fabricated data, and multiple sources conflict with SEC filings.

---

## ❌ CRITICAL ERROR 1: Provenance Lies About Preferred Equity

### The Lie
```typescript
// btbt.ts provenance file
preferredEquity: pv(0, docSource({
  type: "sec-document",
  quote: "No preferred stock outstanding",  // THIS IS A FABRICATED QUOTE
  ...
}), "No preferred equity issued."),
```

### The Truth
**Directly from Q3 2025 10-Q balance sheet (verified via browser):**
> "Preferred shares, $0.01 par value, 10,000,000 and 10,000,000 shares authorized, **1,000,000 and 1,000,000 shares issued and outstanding** as of September 30, 2025 and December 31, 2024, respectively — **$9,050,000**"

**Also verified in Q2 2025 10-Q:** Same values — 1M preferred shares, $9,050,000 book value.

### Impact
- **mNAV understated by ~0.02x** (missing $9.05M in EV calculation)
- **The quote "No preferred stock outstanding" appears NOWHERE in the SEC filing** — it was fabricated or misremembered
- The preferred has been there since at least Dec 2024, unchanged

### What Type of Preferred Is This?
- Book value suggests **non-redeemable** (carried at issuance value, not accreting)
- Classification in "Shareholders' Equity" (not between liabilities and equity)
- **BUT:** For mNAV purposes, preferred equity IS typically added to EV if it has liquidation preference
- **Verdict:** Should be $9,050,000 in preferredEquity, not $0

---

## ❌ CRITICAL ERROR 2: Holdings History is Fabricated for Q1-Q3 2025

### The Fabrication
**holdings-history.ts shows:**
| Date | Holdings | Actual Source |
|------|----------|---------------|
| Q1 2025 (Mar 31) | 85,000 ETH | **NO SOURCE** |
| Q2 2025 (Jun 30) | 120,000 ETH | **NO SOURCE** |
| Q3 2025 (Sep 30) | 140,000 ETH | **NO SOURCE** |

### The Truth (from 10-Q balance sheets)
| Date | Digital Assets ($) | Implied ETH (@~$3,000) | earnings-data.ts |
|------|-------------------|------------------------|------------------|
| Q2 2025 (Jun 30) | $91,214,450 | ~30,400 ETH | 30,663 ✅ |
| Q3 2025 (Sep 30) | $423,682,364 | ~141,000 ETH* | 122,187 ⚠️ |

*Note: Q3 $423.7M includes massive fair value gains from ETH price increase + continued buying.

**Q2 holdings-history shows 120,000 ETH — actual was ~30,663 ETH.** This is a **290% fabrication**.

### Where Did 85K/120K/140K Come From?
Appears to be "placeholder" data that was never updated. These numbers form a suspiciously linear progression (85K → 120K → 140K → 155K) that doesn't match BTBT's actual acquisition pattern (they bought heavily via the Oct 2025 convert proceeds).

### Impact
- HPS chart is completely wrong for Q1-Q3 2025
- Historical trend analysis meaningless
- Any "QoQ growth" metrics are fiction

---

## ❌ CRITICAL ERROR 3: Debt Value of $207M in Holdings History is Wrong

### The Error
**holdings-history.ts shows totalDebt: $207,000,000** for all 2025 entries.

### The Truth
- **$150M convertible notes** issued Oct 2025 (verified from press release)
- **~$42M operating lease liabilities** (verified from Q3 10-Q balance sheet)
- $207M = $150M + ~$42M lease liabilities (incorrect inclusion)

### Why Lease Liabilities Don't Belong in mNAV Debt
Operating leases are **offset by ROU (Right-of-Use) assets** on the balance sheet:
- Operating lease ROU assets: $42,773,580 (Sep 30, 2025)
- Operating lease liability (current + non-current): $41,916,655

These largely offset — including lease liabilities without the corresponding assets overstates EV.

### The Correct Value
**totalDebt should be $150,000,000** (converts only)

### But Wait — Shouldn't Converts Have Accrued Interest?
The 4% convertible notes issued Oct 1, 2025. By Sep 30, 2025 (Q3 10-Q date), they weren't even issued yet! So Q3 carrying value = $0.

For current state (Dec 31, 2025):
- Face value: $150M
- Coupon: 4%
- Time elapsed: ~3 months
- Accrued interest: ~$1.5M
- **Realistic carrying value: ~$151.5M** (but $150M is close enough for mNAV purposes)

---

## ⚠️ ERROR 4: 11-Step Report Has Wrong Holdings Number (Typo)

### The Error
**11-step-report.md states:** "ETH Holdings: 155,277.3 ETH"

### The Truth
**December 2025 Press Release (verified via web_fetch):**
> "As of December 31, 2025, the Company held approximately **155,227.3** ETH"

The digits are transposed: 1552**77** vs 1552**27**. This 50 ETH difference (~$150K) is minor but shows sloppy verification.

---

## ⚠️ ERROR 5: 11-Step Report Says $0 Debt

### The Error
> "Long-Term Debt: $0 (no bonds/loans, just lease liabilities)"
> "No Long-Term Debt: Clean balance sheet, no convertible notes"

### The Truth
**$150 MILLION CONVERTIBLE NOTES** issued Oct 2, 2025 (8-K filed same day, press release Oct 8, 2025).

The 11-step report looked at XBRL "LongTermDebt" field which BTBT doesn't use (they classify converts separately). The report methodology is flawed — it missed Item 2.03 8-Ks entirely.

---

## ⚠️ ERROR 6: Q3 Holdings Discrepancy Between Sources

### The Discrepancy
| Source | Q3 2025 Holdings |
|--------|------------------|
| earnings-data.ts | 122,187 ETH |
| holdings-history.ts | 140,000 ETH |
| 11-step report | ~170,000 ETH (estimated from $423.7M) |

**Which is right?**

The $423.7M digital assets at Sep 30, 2025 includes:
- ETH at fair value
- Possibly other crypto (BTC remnants?)
- The ETH-equivalents in externally managed funds

At ETH ~$2,500 (Sep 30 price), 122,187 ETH = ~$305M. The remaining $118M could be:
- Higher implied price than $2,500
- LsETH/staking derivatives
- Externally managed fund (noted as ~15,218 ETH in Dec PR)

**Best estimate:** earnings-data.ts's 122,187 is closest to actual disclosed ETH units. The 140,000 is fabricated, and 170,000 was a bad estimate.

---

## 🔍 UI Verification Findings

Navigated to `http://localhost:3000/company/BTBT`:

### Issues Found
1. **ETH price showing $0** — Market data sidebar shows "ETH $0" — either API issue or stale data
2. **Crypto NAV shows $0** — Because ETH price = $0, the entire crypto NAV calculation is broken
3. **No preferred equity shown** — mNAV formula shows "Market Cap + Debt + 0 - Cash" (missing preferred)
4. **Equity NAV/Share shows $0.09** — This is wrong due to $0 crypto NAV

### What's Working
- Total Debt: $150.0M ✅
- Cash: $179.1M ✅
- ETH Holdings: 155,227 ✅
- Shares: 323.8M ✅

---

## Proposed Fixes Assessment

### Fix 1: Change preferredEquity from $0 to $9,050,000
**CORRECT.** Verified in Q2 and Q3 10-Q balance sheets.

### Fix 2: Change holdings-history totalDebt from $207M to $150M
**CORRECT.** Should be converts only, not converts + leases.

### Fix 3: Update holdings-history Q1-Q3 2025 ETH values
**PARTIALLY CORRECT.** The proposed values need verification:
- Q3: 140,000 → 122,187 ✅ (matches earnings-data)
- Q2: 120,000 → 30,663 ✅ (matches 10-Q balance sheet math)
- Q1: 85,000 → 10,000 ⚠️ (what's the source? needs verification)

Q1 2025 "10,000 ETH" appears to be a placeholder too. BTBT didn't fully pivot to ETH until mid-2025. Q1 may have been nearly 0 ETH (they were still BTC-heavy).

---

## Missing Issues Not Addressed by Previous Reports

### 1. WhiteFiber (WYFI) in mNAV
BTBT holds ~27M shares of WYFI (~$427M at $15.80). This is a **MAJORITY STAKE** (70.4% ownership).

**Question:** Should WYFI be in mNAV?
- The company's investor presentations include it in "combined asset value"
- But it's a consolidated subsidiary, not a passive investment
- Current mNAV calculation ignores it entirely

**My assessment:** For comparability with other DATs, exclude WYFI from mNAV. But this should be clearly disclosed.

### 2. Convertible Note Dilution
$150M converts at $4.16/share = 36,057,692 potential shares.

If in-the-money (stock > $4.16), these should be in dilutive-instruments.ts.

**Current stock: ~$1.76** — converts are OTM. But they should still be tracked.

### 3. Source URL Quality
The provenance file quotes "No preferred stock outstanding" but this quote **doesn't exist in the 10-Q**. Source URLs need verification — linking to the document isn't enough if the quote is fabricated.

---

## Trust Score by Source

| Source | Trust Level | Notes |
|--------|-------------|-------|
| December 2025 Press Release | ⭐⭐⭐⭐⭐ | Holdings verified, shares verified |
| Q3 2025 10-Q Balance Sheet | ⭐⭐⭐⭐⭐ | Preferred equity, total liabilities verified |
| Oct 2025 Press Release | ⭐⭐⭐⭐⭐ | $150M converts verified |
| provenance/btbt.ts | ⭐⭐ | **LIES about preferred stock** |
| earnings-data.ts | ⭐⭐⭐⭐ | Q3/Q4 good, Q1/Q2 questionable |
| holdings-history.ts | ⭐ | **Q1-Q3 2025 values are fabricated** |
| 11-step-report.md | ⭐⭐ | Missed converts, typo in holdings |
| pipeline-check.md | ⭐⭐⭐⭐ | Correctly identified most issues |

---

## Required Actions (Priority Order)

### P0 — Must Fix Immediately
1. **Fix provenance preferredEquity:** $0 → $9,050,000
2. **Fix holdings-history Q2 2025:** 120,000 → 30,663 ETH
3. **Fix holdings-history totalDebt:** $207M → $150M (all 2025 entries)

### P1 — Should Fix
4. **Fix holdings-history Q3 2025:** 140,000 → 122,187 ETH
5. **Fix holdings-history Q1 2025:** 85,000 → actual (need to verify)
6. **Add convertible notes to dilutive-instruments.ts**

### P2 — Track
7. **Verify all provenance quotes actually exist in source documents**
8. **Document WYFI treatment in mNAV methodology**

---

## Conclusion

The BTBT data has **significant integrity issues**:

1. **Provenance file contains a fabricated quote** about preferred stock
2. **Holdings history for Q1-Q3 2025 is completely made up** with no source
3. **11-step report missed $150M in convertible debt**

The pipeline-check.md was the most accurate report — it correctly identified most issues except it didn't catch that the provenance quote was fabricated (it noted the discrepancy but didn't realize the quote doesn't exist).

**Trust nothing. Verify everything against primary SEC documents.**
