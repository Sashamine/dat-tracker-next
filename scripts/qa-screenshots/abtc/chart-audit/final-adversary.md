# ABTC Final Adversary Report
**Date:** 2026-02-14  
**Auditor:** Final Adversary Subagent (Opus)

---

## Executive Summary

**I found errors in ALL THREE previous agents' work, plus a NEW bug introduced by the "fix".**

| Agent | Errors Found |
|-------|--------------|
| Source Verifier (Ground Truth) | 2 errors |
| UI Checker | 3 errors |
| Chart Auditor | 2 errors |
| The "Fix" Itself | 1 NEW bug introduced |

---

## 🔴 CRITICAL: NEW BUG INTRODUCED BY THE FIX

**The SPS baseline was changed from 380 to 368, but 368 is ALSO WRONG.**

### Evidence (verified in live UI):

| Location | Q3 SPS Value | Source |
|----------|--------------|--------|
| **Main page SPS Growth card** | 368 sats | Hardcoded in ABTCCompanyView.tsx line 501 |
| **Earnings page Q3 row** | 0.0000037 = **371 sats** | Derived from earnings-data.ts |
| **earnings-data.ts** | 0.00000371 = **371 sats** | Uses 920,684,912 shares |
| **holdings-history.ts** | 0.00000371 = **371 sats** | Uses 920,684,912 shares |

### The Math:

```
Q3 Holdings: 3,418 BTC
Q3 Shares (balance sheet Sep 30): 920,684,912

HPS = 3,418 / 920,684,912 = 0.00000371... = 371.3 sats

NOT 368 sats.
```

### Where 368 came from (incorrect):

```
3,418 / 927,604,994 = 0.00000368... = 368.4 sats
```

This uses the **Nov 13 cover page** share count (927.6M), not the **Sep 30 period-end** count (920.7M).

### Impact:

The main page now shows:
> "SPS Growth: +49% since Q3 2025 (368 → 550 sats)"

But the Earnings page shows:
> Q4: 0.0000055 (549 sats) | QoQ Growth: **+48.0%**

**Users see DIFFERENT numbers on the same site.** The main page says +49%, earnings page says +48.0%.

### Fix Required:

In `ABTCCompanyView.tsx`, change:
```typescript
// Line ~501
<p className="text-xs text-amber-500">since Q3 2025 (368 → {Math.round(metrics.satsPerShare)} sats)</p>
```

To:
```typescript
<p className="text-xs text-amber-500">since Q3 2025 (371 → {Math.round(metrics.satsPerShare)} sats)</p>
```

And update the percentage calculation accordingly:
```typescript
+${((metrics.satsPerShare - 371) / 371 * 100).toFixed(0)}%
```

---

## 🟠 ERRORS IN SOURCE VERIFIER (Ground Truth Report)

### Error 1: Failed to Actually Verify BTC Count

The report says:
> "3,418 BTC figure **needs verification from footnote** (Note 6) or XBRL data"

But then concludes the audit without actually verifying it. The report marks this as TODO but treats it as verified elsewhere. This is sloppy — either verify it or mark the whole metric as unverified.

**Verdict:** Incomplete work passed off as complete.

### Error 2: Missed Share Count Discrepancy Significance

The report documents BOTH share counts:
- Balance sheet (Sep 30): 920,684,912
- Cover page (Nov 13): 927,604,994

But doesn't flag that **using the wrong one for Q3 HPS calculations would be a bug**. The methodology question — which share count to use for which purpose — was left unexplored.

**Why This Matters:**
- For **Q3 period-end HPS**: Use balance sheet (920.7M) — that's the shares outstanding *at* Q3 end
- For **mNAV/current calculations**: Use cover page (927.6M) — that's the most recent known count
- For **Q4 period-end HPS**: Should probably use Dec share count (not yet disclosed)

The ground truth should have explicitly stated which count to use when.

---

## 🟠 ERRORS IN UI CHECKER

### Error 1: Claimed "All Match" — FALSE

The report's summary table says:
> "Overall Status: ✅ ALL METRICS MATCH"

This is FALSE. The HPS Q3 2025 row says:
> "HPS Q3 2025 | 0.00000368 | ✅ | ✅ | MATCH"

But earnings-data.ts actually has `0.00000371`, not `0.00000368`. The UI Checker used the **wrong** value to verify.

**Evidence from current earnings-data.ts (line 1095):**
```typescript
holdingsPerShare: 0.00000371,  // 3,418 / 920,684,912 = ~371 sats/share
```

The UI Checker checked 368, but the code says 371.

### Error 2: Did NOT Verify UI Visually

The report claims to check "UI Match" but shows no evidence of actually viewing the UI. It compared code to code (provenance → companies.ts → earnings-data.ts), not code to rendered output.

A proper UI check would have noticed:
- The SPS Growth card shows "368 → 550"
- The Earnings page shows Q3 as "0.0000037" (which rounds from 0.00000371 = 371 sats)

These don't match! The UI Checker missed this because they didn't actually look at the UI.

### Error 3: Share Count Methodology Analysis is Backwards

The UI Checker wrote:
> "Using cover page share count is correct methodology."

This is correct **for mNAV**, but **WRONG for Q3 period-end HPS**.

For period-end HPS, you should use the shares outstanding *at that period's end*. That's 920.7M (balance sheet Sep 30), not 927.6M (cover page Nov 13).

The ~7M share increase between Sep 30 and Nov 13 represents new issuances. Using the Nov 13 count to calculate Sep 30 HPS artificially deflates the historical HPS.

---

## 🟠 ERRORS IN CHART AUDITOR

### Error 1: Recommended Wrong Fix

The Chart Auditor correctly identified the 380→368 discrepancy, but recommended:
> "Ensure Q3 2025 SPS shows consistent value across all UI elements. Recommend using 370-371 sats"

This is correct! But then someone implemented 368, not 370-371. The fix that was applied didn't follow the auditor's own recommendation.

If the Chart Auditor verified the fix, they should have caught that 368 was applied instead of 371.

### Error 2: Incomplete Holdings-History Check

The Chart Auditor noted that Oct/Nov/Dec entries in holdings-history.ts use 927.6M shares. But didn't question whether this is correct.

**Current holdings-history.ts:**
```typescript
{ date: "2025-09-30", holdings: 3_418, sharesOutstandingDiluted: 920_684_912, ... }
{ date: "2025-10-24", holdings: 3_865, sharesOutstandingDiluted: 927_604_994, ... }
{ date: "2025-11-05", holdings: 4_004, sharesOutstandingDiluted: 927_604_994, ... }
{ date: "2025-12-08", holdings: 4_783, sharesOutstandingDiluted: 927_604_994, ... }
{ date: "2025-12-14", holdings: 5_098, sharesOutstandingDiluted: 927_604_994, ... }
```

The jump from 920.7M to 927.6M happens between Sep 30 and Oct 24. This is plausible (ATM issuances), but the Chart Auditor should have flagged:

1. **Do we have any Dec share counts?** The Dec 14 PR doesn't disclose shares. Using Nov 13's count for Dec is an approximation.
2. **Should Q4 earnings use 927.6M?** The Q4 10-K will likely have a new count.

---

## 🟠 METHODOLOGY ISSUE: HPS Share Count Philosophy

The agents disagreed (implicitly) on methodology but never resolved it:

| Use Case | Correct Shares | Why |
|----------|----------------|-----|
| Q3 period-end HPS | 920,684,912 (Sep 30 balance sheet) | HPS for a quarter should use shares at quarter end |
| Current mNAV | 927,604,994 (Nov 13 cover page) | Most recent known shares for market cap calc |
| Q4 period-end HPS | Unknown (Q4 10-K not filed) | Should wait for actual Q4 disclosure |
| Holdings-history Oct-Dec | 927,604,994 (Nov 13) | Best approximation, but flag as estimated |

**The root cause:** No documented methodology on which share count to use when.

---

## 🟡 OTHER ISSUES FOUND

### Issue 1: earnings-data.ts Q3 Comment is Misleading

Current comment:
```typescript
sharesAtQuarterEnd: 920_684_912,  // 10-Q balance sheet (Sep 30): Class A 188,460,009 + Class B 732,224,903
```

This is correct now, but the Q4 entry still says:
```typescript
sharesAtQuarterEnd: 927_604_994,  // 10-Q cover page: Class A 195,380,091 + Class B 732,224,903
```

Using Q3's cover page share count for Q4's "sharesAtQuarterEnd" is methodologically inconsistent. Q4 won't end until Dec 31, 2025, and the actual Q4 share count will be disclosed in the Q4 10-K (not filed yet).

### Issue 2: holdings-history.ts has Q3 Correct, But ABTCCompanyView.tsx is Hardcoded

The holdings-history correctly shows:
- Sep 30: 920.7M shares → 371 sats

But ABTCCompanyView.tsx hardcodes 368 sats for the growth comparison. This means:
- The Holdings History table (if expanded) shows 371 sats
- The SPS Growth card shows 368 sats

This will confuse users.

### Issue 3: equityNavPerSharePv Comment is Wrong

In ABTCCompanyView.tsx line ~137:
```typescript
), "Uses 899M total shares (all classes, post-merger).");
```

This is stale/wrong. The actual shares are 927.6M (or 920.7M for Q3). The 899M was the old incorrect diluted weighted average.

---

## Summary of Required Fixes

### Critical (Fix Now)

1. **ABTCCompanyView.tsx**: Change hardcoded 368 → 371 for Q3 SPS baseline
   - Line ~500: `since Q3 2025 (368 → ...` → `since Q3 2025 (371 → ...`
   - Line ~500: `(metrics.satsPerShare - 368)` → `(metrics.satsPerShare - 371)`

### Important (Fix Soon)

2. **ABTCCompanyView.tsx**: Fix the equityNavPerSharePv comment (line ~137)
   - Change "899M" to "927.6M"

3. **Document methodology**: Create a standard for which share count to use when:
   - Period-end HPS: Use balance sheet shares at period end
   - Current mNAV: Use most recent cover page shares
   - Intermediate holdings: Use most recent known shares, flagged as estimated

### Minor

4. **Q4 earnings-data.ts**: Add comment noting Q4 shares are estimated pending 10-K filing

---

## Verification Commands

To verify the inconsistency yourself:

1. Navigate to http://localhost:3000/company/ABTC
2. Look at SPS Growth card: Shows "368 → 550 sats" with +49%
3. Click Earnings link
4. Look at Q3 row: Shows "0.0000037" (371 sats) with +48.0% QoQ

These should match, but they don't.

---

## Final Verdict

| Finding | Severity | Status |
|---------|----------|--------|
| SPS baseline 368 should be 371 | 🔴 CRITICAL | OPEN |
| Main page vs Earnings page inconsistency | 🔴 CRITICAL | OPEN |
| Ground Truth incomplete verification | 🟠 MEDIUM | NOTED |
| UI Checker false positive | 🟠 MEDIUM | NOTED |
| Chart Auditor fix not followed | 🟡 LOW | NOTED |
| Share count methodology undocumented | 🟡 LOW | NOTED |

**The previous agents did incomplete work. The "fix" introduced a new bug. The product currently shows inconsistent data to users.**

---

*Adversarial audit completed: 2026-02-14*
