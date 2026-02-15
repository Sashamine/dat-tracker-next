# MARA Pipeline Check — Phase 4C Cross-Consistency
**Date:** 2026-02-14
**Checker:** subagent mara-phase4c

---

## 1. provenance/mara.ts

### Holdings
- **Holdings:** expected=52,850, actual=52,850 → ✅ MATCH
- **Holdings breakdown:** expected="35,493 + 17,357", actual="35,493 + 17,357" → ✅ MATCH
- **Holdings date:** expected=2025-09-30, actual=2025-09-30 → ✅ MATCH

### Shares Outstanding
- **Basic shares:** expected=378,184,353, actual=378,184,353 → ✅ MATCH
- **Shares date:** expected=2025-10-28 (cover page), actual=2025-10-28 → ✅ MATCH

### Total Debt
- **Total debt:** expected=$3,642,472,000, actual=$3,248,000,000 → ❌ MISMATCH
  - **NOTE:** Provenance has `TOTAL_DEBT = 3_248_000_000` from XBRL `us-gaap:LongTermDebt`.
  - Ground truth says $3,642,472,000 which is total debt including line of credit ($350M) + convertibles ($3,298,077K).
  - The XBRL LongTermDebt figure ($3,248M) appears to be the BOOK VALUE of the convertible notes only, excluding the $350M credit facility and potentially excluding other adjustments.
  - **This is a significant discrepancy. Ground truth $3,642,472K = $3,298,077K converts (face) + ~$344,395K (likely LOC + adjustments).**

### Cash
- **Cash:** expected=$826,392,000, actual=$826,392,000 → ✅ MATCH

### Cost Basis
- **Cost basis per BTC:** expected=$87,762, actual=$87,760 → ⚠️ MINOR (rounding: $4,637,673K / 52,850 = $87,761.97)
- **Total cost basis:** expected=$4,637,673,000, actual=$4,637,673,000 → ✅ MATCH

### Quarterly Burn (G&A)
- **G&A burn:** expected=$85,296,000, actual=$85,296,000 → ✅ MATCH

### Preferred Equity
- **Preferred:** expected=$0, actual=$0 → ✅ MATCH

### Convertible Notes in Provenance
- Provenance file has only 3 tranches (2026, 2030, 2032) with DIFFERENT values than ground truth:
  - 2026: provenance=$747.5M vs GT=$48,077K → ❌ MISMATCH (provenance has original issuance, GT has remaining balance)
  - 2030: provenance=$850M vs GT=$1,000,000K → ❌ MISMATCH
  - 2031 (Sep): GT=$300,000K → ❌ MISSING from provenance
  - 2031 (Jun): GT=$925,000K → ❌ MISSING from provenance
  - 2032: provenance=$950M vs GT=$1,025,000K → ❌ MISMATCH

### Provenance Summary
**⚠️ Key Issue: Total debt uses XBRL LongTermDebt ($3,248M) rather than total obligations ($3,642M). Convertible note detail in provenance file uses original issuance amounts, not Q3 2025 10-Q balances. Only 3 of 5 tranches listed.**

---

## 2. companies.ts (MARA entry)

### Core Fields (via provenance imports)
- **Holdings:** MARA_PROVENANCE.holdings?.value = 52,850 → ✅ MATCH
- **sharesForMnav:** MARA_PROVENANCE_DEBUG.sharesBasic = 378,184,353 → ✅ MATCH
- **totalDebt:** MARA_PROVENANCE.totalDebt?.value = 3,248,000,000 → ❌ MISMATCH (same issue as provenance — $3,248M vs GT $3,642M)
- **cashReserves:** MARA_PROVENANCE.cashReserves?.value = 826,392,000 → ✅ MATCH
- **restrictedCash:** 12,000,000 → ✅ (matches provenance)
- **costBasisAvg:** MARA_PROVENANCE.costBasisAvg?.value = 87,760 → ⚠️ MINOR ($2 rounding vs GT $87,762)
- **quarterlyBurnUsd:** MARA_PROVENANCE.quarterlyBurn?.value = 85,296,000 → ✅ MATCH
- **isMiner:** true → ✅ CORRECT
- **preferredEquity:** not set (defaults to 0) → ✅ MATCH

### companies.ts Summary
**✅ All values correctly sourced from provenance. Inherits the debt discrepancy.**

---

## 3. earnings-data.ts (MARA entries)

MARA entries use `getMARAQuarterEndDataForEarnings()` from `mara-holdings-history.ts` — NOT hardcoded. ✅ Good pattern.

### Q3 2025 (2025-09-30)
- **holdingsAtQuarterEnd:** from mara-holdings-history → 52,850 → ✅ MATCH
- **sharesAtQuarterEnd:** from mara-holdings-history → 378,184,353 → ✅ MATCH
- **holdingsPerShare:** 52,850 / 378,184,353 = 0.00013973 vs stored 0.0001398 → ✅ MATCH (rounding)

### Q2 2025 (2025-06-30)
- **holdingsAtQuarterEnd:** 49,951 → ✅ (from 10-Q)
- **sharesAtQuarterEnd:** 370,457,880 → ✅ (from 10-Q cover)
- **holdingsPerShare:** 49,951 / 370,457,880 = 0.00013485 vs stored 0.0001348 → ✅ MATCH

### Q1 2025 (2025-03-31)
- **holdingsAtQuarterEnd:** 47,531 → ✅
- **sharesAtQuarterEnd:** 351,927,748 → ✅
- **holdingsPerShare:** 47,531 / 351,927,748 = 0.00013509 vs stored 0.0001351 → ✅ MATCH

### Q4 2024 (2024-12-31)
- **holdingsAtQuarterEnd:** 44,893 → ✅
- **sharesAtQuarterEnd:** 345,816,827 → ✅
- **holdingsPerShare:** 44,893 / 345,816,827 = 0.00012981 vs stored 0.0001298 → ✅ MATCH

### Q3 2024 (2024-09-30)
- **holdingsAtQuarterEnd:** 26,747 → ✅
- **sharesAtQuarterEnd:** 321,831,487 → ✅
- **holdingsPerShare:** 26,747 / 321,831,487 = 0.00008311 vs stored 0.0000831 → ✅ MATCH

### earnings-data.ts Summary
**✅ All quarters use mara-holdings-history.ts as single source of truth. HPS calculations correct.**

---

## 4. holdings-history.ts (MARA entries)

The main `holdings-history.ts` file has MARA_HISTORY with the SAME data as `mara-holdings-history.ts`.

### Q3 2025 anchor
- **date:** 2025-09-30 → ✅
- **holdings:** 52,850 → ✅ MATCH
- **sharesOutstandingDiluted:** 378,184,353 → ✅ MATCH
- **holdingsPerShare:** 0.0001398 → ✅ MATCH
- **totalDebt:** 3,248,000,000 → ❌ (same debt discrepancy)
- **cash:** 826,392,000 → ✅ MATCH
- **source:** "Q3 2025 10-Q (35,493 + 17,357 receivable)" → ✅

### Previous quarters all consistent with mara-holdings-history.ts → ✅

### holdings-history.ts Summary
**✅ Consistent across both files. Same debt discrepancy.**

---

## 5. dilutive-instruments.ts (MARA convertible notes)

### Ground Truth: 5 tranches
| Note | Principal | Conv Rate | Strike | Potential Shares |
|------|-----------|-----------|--------|-----------------|
| Dec 2026 | $48,077K | 13.1277 | $76.17 | 631,265 |
| Sep 2031 | $300,000K | 52.9451 | $18.89 | 15,883,530 |
| Mar 2030 | $1,000,000K | 38.5902 | $25.91 | 38,590,200 |
| Jun 2031 | $925,000K | 28.9159 | $34.58 | 26,747,208 |
| Aug 2032 | $1,025,000K | 49.3619 | $20.26 | 50,596,048 |

### Code: 3 convertible tranches + 1 RSU entry

1. **2026 Notes:** strike=$76.17 ✅, potentialShares=9,812,000 ❌ (GT=631,265), faceValue=$747,500,000 ❌ (GT=$48,077K)
   - **ISSUE:** Code uses ORIGINAL issuance ($747.5M). Ground truth says only $48,077K remains as of Q3 2025 (most has been redeemed/converted).

2. **2032 Notes:** strike=$20.26 ✅, potentialShares=46,890,000 ❌ (GT=50,596,048), faceValue=$950,000,000 ❌ (GT=$1,025,000K)
   - **ISSUE:** Code uses initial $950M. GT shows $1,025M (likely upsized via overallotment).

3. **2030 Notes:** strike=$34.58 ❌ (GT=$25.91), potentialShares=24,580,000 ❌ (GT=38,590,200), faceValue=$850,000,000 ❌ (GT=$1,000,000K)
   - **ISSUE:** Code has $850M at $34.58 strike. GT has $1,000M at $25.91 strike.
   - This looks like the code has the WRONG maturity assigned to these numbers. The $34.58 strike matches the GT's Jun 2031 tranche, not Mar 2030.

4. **Sep 2031 Notes:** ❌ MISSING entirely (GT=$300,000K at $18.89 strike, 15,883,530 shares)

5. **Jun 2031 Notes:** ❌ MISSING as separate tranche (the $34.58 strike appears misassigned to "2030")

6. **RSUs:** 324,375 shares at $0 → ✅ (not part of convertible check)

### dilutive-instruments.ts Summary
**❌ FAIL — Only 3 of 5 convertible tranches present. Principal amounts use original issuance, not Q3 2025 balances. Strike prices appear misassigned between 2030 and 2031 tranches. Total potential shares significantly undercount (81,282,000 coded vs 132,448,251 ground truth).**

---

## 6. MARACompanyView.tsx

### Hardcoded Values Check
- No hardcoded financial values found → ✅
- All metrics sourced from `MARA_PROVENANCE` imports → ✅
- mNAV calculation uses `getEffectiveShares("MARA", ...)` for ITM convert adjustment → ✅
- Balance sheet section displays provenance metrics with click-to-verify → ✅
- "~$3.25B" mentioned in tooltip text (line: `tooltip="~$3.25B in multiple convertible tranches"`) → ⚠️ STALE TEXT (should be ~$3.6B per GT)

### MARACompanyView.tsx Summary
**✅ No hardcoded values. All sourced from provenance. One stale tooltip string.**

---

## Cross-File Consistency

| Check | Status | Notes |
|-------|--------|-------|
| companies.ts holdings == provenance holdings | ✅ | Both 52,850 |
| companies.ts sharesForMnav == provenance shares | ✅ | Both 378,184,353 |
| companies.ts totalDebt == provenance totalDebt | ✅ | Both $3,248M (but both disagree with GT $3,642M) |
| earnings-data HPS = holdings / shares | ✅ | All quarters verified |
| dilutive-instruments: 5 tranches present | ❌ | Only 3 of 5, wrong principals, misassigned strikes |

---

## Derived Metric Vintage Check

### Cost Basis ($87,760/BTC)
- **Total cost ($4,637,673K):** as-of 2025-09-30 (Q3 10-Q) ✅
- **Total holdings (52,850):** as-of 2025-09-30 (Q3 10-Q) ✅
- **Vintage match:** ✅ Same filing, same date

### Holdings Per Share (0.0001398)
- **Holdings (52,850):** as-of 2025-09-30 ✅
- **Shares (378,184,353):** as-of 2025-10-28 (cover page date) ⚠️
- **Vintage note:** Holdings is balance-sheet date (Sep 30), shares is cover page date (Oct 28). 28-day gap. Acceptable for SEC filings but worth noting.

### mNAV (live calculation)
- **Market cap:** live stock price × shares → live
- **Total debt ($3,248M):** as-of 2025-09-30 ⚠️ (and disagrees with GT)
- **Cash ($826M):** as-of 2025-09-30 ✅
- **Holdings (52,850):** as-of 2025-09-30 ✅
- **BTC price:** live ✅
- **Vintage note:** All balance sheet inputs from same Q3 2025 filing ✅

---

## 7. UI Check

### Company Page (localhost:3000/company/MARA)
- **Page loads:** ✅ No errors
- **Stock price:** $7.92 → ✅ MATCH (GT: $7.92)
- **mNAV:** 1.48x → displayed correctly (live calc using BTC=$69,518)
- **Leverage:** 0.66x → displayed
- **Equity NAV/Share:** $3.312 → displayed
- **BTC Holdings:** 52,850 BTC → ✅ MATCH
- **Avg Cost Basis:** $88K (displayed as $88K) → ✅ MATCH ($87,760 rounds to $88K)
- **Cash Reserves:** $826.4M → ✅ MATCH
- **Total Debt:** $3.25B → ❌ MATCHES provenance ($3,248M) but disagrees with GT ($3,642M)
- **Shares Outstanding:** 378.2M → ✅ MATCH
- **Quarterly Burn:** $85.3M → ✅ MATCH
- **Total Cost Basis:** $4.64B → ✅ MATCH
- **ITM Dilution:** +0.3M shares → displayed (from ITM converts at $8)

### mNAV Card Click
- **Expands:** ✅ No crash, full mNAV calculation card shown
- **Shows debt source:** debt = 3,248,000,000 from SEC XBRL (10-Q) → ✅
- **Shows cash source:** cash = 826,392,000 from SEC XBRL (10-Q) → ✅
- **Shows holdings source:** 52,850 from SEC 10-Q → ✅
- **EV calculation:** $5.42B displayed → consistent

### Overview Page (localhost:3000)
- **MARA row found:** Row #3 → ✅
- **mNAV:** 1.47x (vs company page 1.48x — live price fluctuation) → ✅ CONSISTENT
- **Price:** $7.92 → ✅ MATCH
- **Leverage:** 0.66x → ✅ MATCH
- **Holdings:** 52.9K BTC → ✅ (52,850 rounded)
- **Market Cap:** $3.00B → ✅
- **Crypto NAV:** $3.67B → ✅
- **Other (Cash):** 826.39M → ✅ MATCH

### Earnings Page
- **Link available:** ✅ (link to /company/MARA/earnings visible)
- *(Not navigated — earnings data verified via file check above)*

---

## Summary
**Status:** FAIL

### File Checks
| File | Status | Issues |
|------|--------|--------|
| provenance/mara.ts | ⚠️ | Total debt $3,248M vs GT $3,642M; only 3 of 5 convert tranches; wrong principals |
| companies.ts | ⚠️ | Inherits debt issue from provenance |
| earnings-data.ts | ✅ | All quarters correct via mara-holdings-history.ts |
| holdings-history.ts | ✅ | All snapshots match (inherits debt issue) |
| dilutive-instruments.ts | ❌ | Only 3/5 tranches; wrong face values; misassigned 2030/2031 strikes |
| MARACompanyView.tsx | ✅ | No hardcoded values; stale tooltip text only |

### UI Checks
| Check | Status |
|-------|--------|
| Page loads | ✅ |
| mNAV card click | ✅ |
| Overview match | ✅ |
| Earnings page | ✅ (link present) |

### Issues Found
1. **CRITICAL: Total debt undercount.** Provenance uses XBRL `LongTermDebt` = $3,248M. Ground truth = $3,642M (includes $350M line of credit + face value adjustments). Delta = ~$394M.
2. **CRITICAL: dilutive-instruments.ts has only 3 of 5 convertible tranches.** Missing Sep 2031 ($300M) and Jun 2031 ($925M) tranches entirely.
3. **CRITICAL: Convertible face values use ORIGINAL issuance amounts, not Q3 2025 balances.** Dec 2026 notes show $747.5M (original) but GT says $48,077K remaining. Mar 2030 shows $850M but GT says $1,000M. Aug 2032 shows $950M but GT says $1,025M.
4. **CRITICAL: 2030 tranche misassigned.** Code has strike $34.58 for "2030 notes" but this strike actually belongs to the Jun 2031 tranche per GT. The actual Mar 2030 strike should be $25.91.
5. **MINOR: Cost basis $87,760 vs GT $87,762.** $2 rounding difference — acceptable.
6. **MINOR: Tooltip text says "~$3.25B" — should be ~$3.6B per GT.

### Root Cause Analysis
The debt discrepancy stems from using the XBRL `us-gaap:LongTermDebt` field ($3,248M = book value of convertible notes) instead of total obligations. MARA's Q3 2025 10-Q shows:
- Convertible notes (face value): $3,298,077K
- Line of credit: $350,000K  
- Minus: Unamortized costs: ~($5.6M)
- **Total: ~$3,642M**

The XBRL LongTermDebt captures the NET book value (face minus unamortized issuance costs), and may not include the revolving credit facility.

The dilutive instruments issues are more fundamental — the code appears to have been initially populated from issuance 8-Ks rather than the Q3 2025 10-Q Note 7 which shows current balances and all 5 tranches.

### Company mNAV: 1.48x
### Overview mNAV: 1.47x
