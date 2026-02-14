# ABTC Chart Audit Report
**Date:** 2026-02-14
**Auditor:** Adversarial Subagent

---

## Finding 1: 🟢 VERIFIED - Holdings Source (5,098 BTC)
**What:** The mNAV popover claims 5,098 BTC from Dec 14, 2025 PR
**Evidence:** Navigated to PR Newswire source, found: "held approximately 5,098 Bitcoin in its strategic reserve as of December 14, 2025"
**Search Term:** "5,098 Bitcoin" - FOUND ✓
**Screenshot:** `03-holdings-pr-source-verified.jpg`

---

## Finding 2: 🟢 VERIFIED - Shares Outstanding (927.6M)
**What:** The Shares Outstanding popover claims 927,604,994 shares from SEC 10-Q
**Evidence:** 10-Q cover page shows:
- Class A: 195,380,091
- Class B: 732,224,903
- Total: 927,604,994
**Search Term:** "195,380,091" - FOUND ✓
**Screenshot:** `04-shares-popover.jpg`, `05-sec-10q-shares-verified.jpg`

---

## Finding 3: 🟡 WARNING - SPS Value Inconsistency Between UI Elements
**What:** Q3 2025 SPS is shown differently across the app:

| Location | Q3 2025 SPS | Source |
|----------|-------------|--------|
| Key Metrics card | 380 sats | "SPS Growth: +45% since Q3 2025 (380 → 550 sats)" |
| Earnings table | 370 sats | Displayed as "0.0000037" |
| earnings-data.ts | 368 sats | `holdingsPerShare: 0.00000368` |

**Evidence:** 
- Key Metrics shows "380 → 550 sats" 
- Earnings page shows Q3 Per Share as "0.0000037" = 370 sats
- earnings-data.ts has `holdingsPerShare: 0.00000368` = 368 sats

**Root Cause:** Different share counts being used:
- If using 899,489,426 shares (diluted weighted avg EPS): 3,418 / 899.5M = **380 sats** 
- If using 927,604,994 shares (Nov 13 cover page): 3,418 / 927.6M = **368 sats**
- If using 920,684,912 shares (Sep 30 balance sheet): 3,418 / 920.7M = **371 sats**

**Impact:** Users see inconsistent data across different views
**Screenshot:** `07-earnings-page.png` (shows 0.0000037)

---

## Finding 4: 🟡 WARNING - Q3 2025 Shares Count Mismatch
**What:** The earnings-data.ts uses Nov 13, 2025 shares (927,604,994) for Q3 2025 data (Sep 30, 2025 period end)

**Evidence:** 
- Q3 10-Q balance sheet shows **Sep 30, 2025** share counts:
  - Class A: 188,460,009 
  - Class B: 732,224,903
  - **Total: 920,684,912** shares
- But earnings-data.ts uses 927,604,994 (from Nov 13 cover page)

**Code Location:** `src/lib/data/earnings-data.ts` line 1095:
```typescript
sharesAtQuarterEnd: 927_604_994,  // 10-Q cover page (Nov 13): Class A 195,380,091 + Class B 732,224,903
```

**Impact:** Q3 HPS calculation off by ~0.75% (368 sats vs 371 sats correct)

---

## Finding 5: 🟢 VERIFIED - HPS Chart Data Consistency
**What:** HPS chart shows BTC Per Share Growth matching earnings data
**Evidence:**
- Chart shows: Total BTC 5,098, BTC/Share 0.000005496 (549.6 sats)
- Key Metrics SPS: 550 sats (5,098 BTC / 928M shares)
- Calculation: 5,098 / 927,604,994 = 0.0000054958 = 549.58 sats ≈ 550 ✓
**Screenshot:** `06-hps-chart.jpg`

---

## Finding 6: 🟢 VERIFIED - Current mNAV Shares Match HPS Chart
**What:** Main page mNAV uses same shares (927.6M) as HPS chart
**Evidence:** Both use 927,604,994 shares for current calculations
- mNAV: 927.6M shares × $1.13 = $1.05B market cap
- HPS: 5,098 BTC / 927.6M = 550 sats/share
**Cross-check:** PASS

---

## Finding 7: 🟢 VERIFIED - Holdings Consistency
**What:** Current holdings on main page match HPS chart
**Evidence:** Both show 5,098 BTC
- Key Metrics: "BTC Holdings: 5,098 BTC"
- HPS Chart: "TOTAL BTC: 5,098"
**Cross-check:** PASS

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 CRITICAL | 0 |
| 🟡 WARNING | 2 |
| 🟢 VERIFIED | 5 |

### Recommendations

1. **Fix SPS Inconsistency (Finding 3):** Ensure Q3 2025 SPS shows consistent value across all UI elements. Recommend using 370-371 sats (based on Sep 30 actual shares) rather than 380 sats.

2. **Fix Q3 Shares Count (Finding 4):** Update earnings-data.ts to use Sep 30, 2025 share count (920,684,912) instead of Nov 13 cover page count (927,604,994) for Q3 2025 data.

3. **Add Share Count Source Clarification:** The comment in earnings-data.ts says "(Nov 13)" but the quarter end is Sep 30. This should be clarified.

---

## Screenshots Index
1. `01-abtc-page-overview.jpg` - Initial ABTC page
2. `02-mnav-popover.jpg` - mNAV calculation popover
3. `03-holdings-pr-source-verified.jpg` - PR Newswire holdings verification
4. `04-shares-popover.jpg` - Shares Outstanding popover
5. `05-sec-10q-shares-verified.jpg` - SEC 10-Q shares verification
6. `06-hps-chart.jpg` - HPS chart view
7. `07-earnings-page.png` - Earnings page quarterly data
