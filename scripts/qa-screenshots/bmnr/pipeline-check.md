# BMNR Pipeline Check Report

**Agent C — Pipeline Checker**
**Date:** February 14, 2026
**Scope:** Ground truth → Code files → Cross-file consistency → UI

---

## 1. PROVENANCE FILE: `provenance/bmnr.ts`

### Holdings
| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| ETH Holdings | 4,325,738 | 4,325,738 (`LATEST_HOLDINGS`) | ✅ MATCH |
| Holdings Date | 2026-02-08 | "2026-02-08" (`LATEST_HOLDINGS_DATE`) | ✅ MATCH |
| Holdings Accession | 0001493152-26-005707 | "0001493152-26-005707" | ✅ MATCH |
| Holdings Document | ex99-1.htm | "ex99-1.htm" | ✅ MATCH |
| Staked ETH | 2,897,459 | 2,897,459 (`LATEST_STAKED`) | ✅ MATCH |
| Staking % | 67.0% | 0.670 (`STAKING_PCT`) | ✅ MATCH |

### Shares
| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| Shares (10-Q cover) | 454,862,451 | 454,862,451 (`SHARES_OUTSTANDING`) | ✅ MATCH |
| Shares Date | 2026-01-12 | "2026-01-12" (`SHARES_DATE`) | ✅ MATCH |
| Shares Accession | 0001493152-26-002084 | "0001493152-26-002084" | ✅ MATCH |

### Cash, Debt, Preferred, Burn
| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| Cash | $595,000,000 | 595,000,000 | ✅ MATCH |
| Total Debt | $0 | 0 | ✅ MATCH |
| Preferred Equity | $0 | 0 | ✅ MATCH |
| Quarterly Burn | ~$1M (based on $959K baseline) | 1,000,000 | ✅ MATCH |

### Cost Basis
| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| Cost basis (avg) | $14,953,824K / 3,737,140 = $4,002 | 4,002 | ✅ MATCH |
| Cost basis period | Nov 30, 2025 | "2025-11-30" | ✅ MATCH |
| Staleness note | Yes (stale since Nov 30) | Present in code comments | ✅ MATCH |

### Staking Provenance
| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| Annualized staking revenue | $202M (Feb 9, 2026) | $188M (from Feb 2, 2026 8-K) | ⚠️ STALE |

**Note:** The provenance file uses the Feb 2 8-K ($188M) while the ground truth uses the Feb 9 8-K ($202M). The code should be updated to $202M to match the latest filing.

---

## 2. COMPANIES.TS: `companies.ts`

| Field | Ground Truth | Code Value | Status |
|-------|-------------|------------|--------|
| holdings | 4,325,738 | `BMNR_PROVENANCE.holdings?.value \|\| 4_325_738` → 4,325,738 | ✅ MATCH |
| sharesForMnav | ~524.4M (estimated) | `estimateBMNRShares().totalEstimated` → **524,424,033** | ✅ MATCH (uses estimation) |
| cashReserves | $595,000,000 | `BMNR_PROVENANCE.cashReserves?.value \|\| 595_000_000` → 595,000,000 | ✅ MATCH |
| totalDebt | $0 | `BMNR_PROVENANCE.totalDebt?.value \|\| 0` → 0 | ✅ MATCH |
| preferredEquity | (not in Company type) | N/A (not a field) | N/A |
| quarterlyBurnUsd | ~$1M | 1,000,000 | ✅ MATCH |
| otherInvestments | $219M ($200M Beast + $19M ORBS) | 219,000,000 | ✅ MATCH |
| stakingPct | 67.0% | 0.670 | ✅ MATCH |
| costBasisAvg | $4,002 | `BMNR_PROVENANCE.costBasisAvg?.value \|\| 4_002` → 4,002 | ✅ MATCH |
| secCik | 0001829311 | "0001829311" | ✅ MATCH |
| website | bitminetech.io | "https://www.bitminetech.io/" | ✅ MATCH |
| twitter | BitMNR | "BitMNR" | ✅ MATCH |
| datStartDate | Jul 2025 | "2025-07-01" | ✅ MATCH |

### Cash Treatment
| Field | Code Value | Status |
|-------|------------|--------|
| restrictedCash | 595,000,000 (= cashReserves) | ✅ CORRECT — all cash treated as operational, not excess |

---

## 3. EARNINGS-DATA.TS

### Quarter Structure
Uses `getBMNRQuarterEndData()` from `bmnr-holdings-history.ts` — **SINGLE SOURCE OF TRUTH pattern** ✅

| Quarter | Holdings | Shares | HPS | Source | Status |
|---------|----------|--------|-----|--------|--------|
| CY2025 Q2 (pre-ETH) | 0 | 25,000,000 | 0 | Hardcoded | ✅ MATCH (pre-strategy) |
| CY2025 Q3 (Jul-Sep) | 2,650,900 | 240,000,000 | 0.01105 | getBMNRQuarterEndData('2025-09-30') | ⚠️ SEE BELOW |
| CY2025 Q4 (Oct-Dec) | 4,066,062 | 410,000,000 | 0.00992 | getBMNRQuarterEndData('2025-12-31') | ⚠️ SEE BELOW |
| CY2026 Q1 | upcoming | — | — | — | ✅ N/A |

### Q3 2025 Data Check (Sep 30)
- **Closest 8-K snapshot before Sep 30:** Sep 28, 2025 entry (2,650,900 ETH, 240M shares)
- **Ground Truth:** Sep 7 8-K = 2,069,443; Sep 28 8-K = ~2,650,900 
- **HPS Arithmetic:** 2,650,900 / 240,000,000 = **0.011045** ✅ CORRECT
- **Share count:** 240M is interpolated between Sep 22 anchor (224.1M) and Nov 20 anchor (384.1M) — **reasonable**

### Q4 2025 Data Check (Dec 31)
- **Closest 8-K snapshot before Dec 31:** Dec 21, 2025 entry (4,066,062 ETH, 410M shares)
- **HPS Arithmetic:** 4,066,062 / 410,000,000 = **0.009917** ✅ CORRECT
- **Share count:** 410M is interpolated between Nov 20 anchor (384M) and Jan 12 anchor (454.9M) — **reasonable**

### Fiscal vs Calendar Year Mapping
Ground truth uses BMNR's **fiscal year** (Aug 31 FY end): Q4 FY2025 = Jun-Aug, Q1 FY2026 = Sep-Nov.
Code uses **calendar year** for earnings display: CY2025 Q3 = Jul-Sep, CY2025 Q4 = Oct-Dec.
**This is intentional** (earnings-data.ts comment: "Calendar year company - data already normalized to calendar quarters").

⚠️ **CONCERN:** The ground truth Q1 FY2026 data (Nov 30, 2025: 3,737,140 ETH, 408,578,823 shares from 10-Q) doesn't map cleanly to any calendar quarter in the code. The CY2025 Q4 entry uses the Dec 21 snapshot (4,066,062 ETH, 410M shares), not the Nov 30 10-Q XBRL data. This is acceptable for calendar-quarter display but means the **SEC-verified 10-Q data is not directly used** — it's the 8-K data near quarter-end instead.

---

## 4. HOLDINGS-HISTORY.TS & BMNR-HOLDINGS-HISTORY.TS

There are **TWO** holdings history files for BMNR:
1. `holdings-history.ts` — inline `BMNR_HISTORY` array (used for chart)
2. `bmnr-holdings-history.ts` — standalone module with `getBMNRQuarterEndData()` (used for earnings)

### Cross-check: Are they consistent?

| Date | holdings-history.ts | bmnr-holdings-history.ts | Match? |
|------|-------------------|-------------------------|--------|
| 2025-07-17 | 300,657 / 112.3M | 300,657 / 112.3M | ✅ |
| 2025-08-24 | 1,713,899 / 218.9M | 1,713,899 / 218.9M | ✅ |
| 2025-09-28 | 2,650,900 / 240M | 2,650,900 / 240M | ✅ |
| 2025-11-30 | 3,726,499 / 384.1M | 3,726,499 / 384.1M | ✅ |
| 2026-01-19 | 4,203,036 / 454.9M | 4,203,036 / 454.9M | ✅ |
| 2026-02-08 | 4,325,738 / 480M | 4,325,738 / 480M | ✅ |

**Both files contain identical data.** ✅

### Ground Truth vs Holdings History — Key Snapshots
| Date | GT (from 8-K) | Holdings History | Match? |
|------|---------------|-----------------|--------|
| Jul 14, 2025: 163,142 ETH | ✅ | Not in history (Jul 17 = 300,657 is next entry) | ⚠️ First entry date mismatch |
| Aug 24, 2025: 1,713,899 | ✅ | 1,713,899 | ✅ |
| Sep 7, 2025: 2,069,443 | ✅ | 2,069,443 | ✅ |
| Nov 30, 2025: 3,726,499 (8-K) | ✅ | 3,726,499 | ✅ |
| Feb 8, 2026: 4,325,738 | ✅ | 4,325,738 | ✅ |

### Share Anchors Verification
| Anchor Date | GT Source | Code SHARE_ANCHORS | Match? |
|-------------|----------|--------------------|--------|
| 2025-07-23 | 424B5 | 112,311,382 | ✅ (GT doesn't provide exact 424B5 figure but code is reasonable) |
| 2025-08-11 | 424B5 | 218,888,720 | ✅ |
| 2025-09-22 | 424B5 | 224,106,435 | ✅ |
| 2025-11-20 | 10-K XBRL: 384,067,823 | 384,067,823 | ✅ MATCH |
| 2026-01-12 | 10-Q XBRL: 454,862,451 | 454,862,451 | ✅ MATCH |

### Nov 30 Shares Issue
Ground truth 10-Q balance sheet says 408,578,823 shares at Nov 30, 2025. Holdings history uses 384,067,823 (the Nov 20 10-K anchor) for the Nov 30 entry. **This is a ~6% undercount** (24.5M shares difference).

The bmnr-holdings-history.ts SHARE_ANCHORS doesn't include a Nov 30 anchor from the 10-Q balance sheet. It should add:
```
'2025-11-30': { shares: 408_578_823, source: '10-Q balance sheet', accession: '0001493152-26-002084' }
```

**Severity: MEDIUM** — The Nov 30 HPS is computed as 3,726,499 / 384,067,823 = 0.009703 but should be 3,726,499 / 408,578,823 = **0.009121**. This is a ~6% overstatement of HPS at that date.

---

## 5. DILUTIVE-INSTRUMENTS.TS

### Ground Truth vs Code
| Instrument | GT Shares | GT Strike | Code Shares | Code Strike | Match? |
|-----------|-----------|-----------|-------------|-------------|--------|
| C-3 Warrants | 1,280 | unknown (legacy) | **129,375** | **$10.00** | ❌ MISMATCH |
| Strategic Advisor + Rep | 3,043,654 | $5.40 | 1,231,945 | $5.40 | ❌ MISMATCH (count) |
| CVI Warrants | 10,435,430 | $87.50 | **MISSING** | — | ❌ MISSING |
| RSUs | 26,954 | N/A ($0) | 3,043,654 | $0 | ❌ MISMATCH |

### Detailed Issues:

1. **C-3 Warrants:** GT says 1,280 at unknown strike. Code has 129,375 at $10.00 (labeled "ClassOfWarrantOrRightOutstanding @ $10 exercise price"). These might be different warrants entirely — the 129,375 could be an older warrant class. **Needs verification.**

2. **Placement Agent Warrants (ThinkEquity):** Code has 1,231,945 at $5.40 ✅ — this matches GT's description of ThinkEquity placement agent warrants from the PIPE deal. But GT says total Strategic Advisor + Rep warrants = 3,043,654 at $5.40, which includes both strategic advisor AND placement agent warrants. **Code only has the placement agent portion.**

3. **Strategic Advisor Warrants:** The GT says the 3,043,654 figure is the TOTAL remaining (after 63,460 exercised), and the 1,231,945 ThinkEquity warrants are included in this total. So the remaining ~1,811,709 Strategic Advisor warrants at $5.40 are **MISSING** from the code.

4. **CVI Warrants (10,435,430 at $87.50, expires Mar 22, 2027):** **COMPLETELY MISSING** from dilutive-instruments.ts. These are liability-classified and currently OTM, but they should still be tracked for dynamic ITM calculation.

5. **RSUs:** Code labels 3,043,654 shares as "RSUs/restricted stock (NonOptionEquityInstrumentsOutstanding)" at $0 strike. But GT says RSUs = 26,954 and 3,043,654 is the strategic advisor + rep warrant count. **The code is using the wrong XBRL field mapping** — NonOptionEquityInstrumentsOutstanding likely represents the total warrants (3,043,654), not RSUs. The actual RSUs (26,954) are not tracked separately.

**Severity: HIGH** — Dilutive instruments are materially wrong. Missing CVI warrants (10.4M shares), incorrect classification of strategic advisor warrants as RSUs, and incomplete warrant coverage.

---

## 6. BMNRCompanyView.tsx — HARDCODED VALUES CHECK

### Hardcoded Values Found:
- **None for core financial data** — all values sourced from `BMNR_PROVENANCE` and `estimateBMNRShares()` ✅
- `hasDilutiveInstruments={false}` in MnavCalculationCard — **INCORRECT**, BMNR has dilutive instruments (~13.5M potentially dilutive shares)
- `itmDebtAdjustment={0}` — correct (no convertible debt)
- All metric labels and formatting are data-driven ✅

### Share Estimation Display:
- Uses `estimateBMNRShares().totalEstimated` (~524.4M) for mNAV calculation ✅
- Displays methodology details in expandable section ✅
- Shows "ESTIMATED" badge ✅

### StalenessNote:
- Passes `holdingsLastUpdated`, `debtAsOf`, `cashAsOf`, `sharesAsOf` ✅
- Missing `burnAsOf` — but burn is estimated, so this is minor

---

## 7. ADVERSARY FLAGS — SPECIFIC CHECKS

### 7.1: Is codebase using 454.9M (stale) or ~524.4M for sharesForMnav?
- **companies.ts:** Uses `estimateBMNRShares().totalEstimated` = **524,424,033** ✅
- **BMNRCompanyView.tsx:** Uses estimated shares for mNAV and equity NAV/share ✅
- **holdings-history.ts:** Feb 8 entry uses 480M (rounded estimate) for chart display
- **Verdict:** The codebase correctly estimates ~524.4M for mNAV, NOT the stale 454.9M ✅

### 7.2: How is the consulting fee ($40-50M/yr to Ethereum Tower LLC) treated?
- **quarterlyBurn = $1M** in companies.ts (based on pre-pivot Q1 FY2025 baseline G&A of $959K)
- **burnMethodology** explicitly says Q1 FY2026 G&A of $223M excluded as "mostly one-time capital raising costs"
- The $40-50M annual consulting fee (Ethereum Tower LLC) is **NOT factored into the burn rate**
- **This is a methodology choice:** The burn is meant to capture operational overhead, not AUM management fees. The consulting fee (0.25-1.0% of AUM) is arguably a cost of the ETH strategy, not operational burn.
- **Verdict:** ⚠️ MEDIUM — The burn rate significantly understates ongoing costs. $1M/qtr vs what should be ~$10-12.5M/qtr if consulting fees are included.

### 7.3: Is Beast Industries $200M included in mNAV?
- **companies.ts:** `otherInvestments: 219_000_000` (Beast + Eightco)
- **provenance/bmnr.ts:** Comment says "Excluded from mNAV (not crypto-correlated equity investments)"
- **BMNRCompanyView.tsx mNAV calculation:** `cryptoNav = holdings * ethPrice` — does **NOT** include otherInvestments
- **EV calculation:** `ev = estimatedMarketCap + totalDebt + preferredEquity - cashReserves` — does NOT add otherInvestments to CryptoNAV
- **Verdict:** Beast Industries $200M + Eightco $19M are **EXCLUDED** from both CryptoNAV and EV in the mNAV calc. This is conservative but means mNAV is slightly overstated (EV includes the market cap portion attributable to these investments, but CryptoNAV doesn't include their value).

### 7.4: Hardcoded values in BMNRCompanyView.tsx?
- No hardcoded financial values found ✅
- All metrics flow from provenance or estimation functions ✅
- One hardcoded UI element: `hasDilutiveInstruments={false}` (incorrect — see §5)

---

## 8. CROSS-FILE CONSISTENCY

### companies.ts sharesForMnav matches provenance share count?
- **provenance/bmnr.ts:** `SHARES_OUTSTANDING` = 454,862,451 (10-Q baseline)
- **companies.ts:** `sharesForMnav` = `estimateBMNRShares().totalEstimated` = 524,424,033 (estimated current)
- **Consistent:** Both reference the same baseline; companies.ts adds ATM estimate ✅

### Holdings history quarter-end entries match earnings data?
- **earnings-data.ts** calls `getBMNRQuarterEndData()` from `bmnr-holdings-history.ts` — **same source** ✅

### HPS = holdings / shares (arithmetic verified)
| Date | Holdings | Shares | Expected HPS | Code HPS | Match? |
|------|----------|--------|-------------|----------|--------|
| Jul 17 | 300,657 | 112,311,382 | 0.002677 | 0.002677 | ✅ |
| Aug 24 | 1,713,899 | 218,888,720 | 0.007829 | 0.007829 | ✅ |
| Sep 21 | 2,416,054 | 224,106,435 | 0.010781 | 0.010781 | ✅ |
| Nov 30 | 3,726,499 | 384,067,823 | 0.009703 | 0.009703 | ✅ (but shares stale — see §4) |
| Jan 19 | 4,203,036 | 454,862,451 | 0.009241 | 0.009241 | ✅ |
| Feb 8 | 4,325,738 | 480,000,000 | 0.009012 | 0.009012 | ✅ |

### Two Holdings History Files
Both `holdings-history.ts` (inline BMNR_HISTORY) and `bmnr-holdings-history.ts` (standalone) contain identical snapshot data. This is **code duplication** — changes to one may not be reflected in the other.

---

## 9. UI VERIFICATION

**⚠️ UNABLE TO FULLY VERIFY** — Browser automation timed out (browser control server unreachable). Dev server was running on port 3000 but automated screenshots/snapshots failed.

Based on code review of BMNRCompanyView.tsx:
- mNAV uses `estimateBMNRShares().totalEstimated` (524.4M) — should match overview page IF overview also uses `company.sharesForMnav` (which equals the same value) ✅
- StalenessNote is rendered with `holdingsLastUpdated`, `debtAsOf`, `cashAsOf`, `sharesAsOf` ✅
- HPS chart uses `HoldingsPerShareChart` component with estimated shares ✅
- Holdings history table uses `HoldingsHistoryTable` component ✅

---

## Summary

**Status:** Complete
**Output file:** `C:\Users\edwin\dat-tracker-next\scripts\qa-screenshots\bmnr\pipeline-check.md`

### Mismatches Found
| # | Location | Field | Ground Truth | Code Value | Severity |
|---|----------|-------|-------------|------------|----------|
| 1 | dilutive-instruments.ts | CVI Warrants | 10,435,430 @ $87.50 | MISSING | HIGH |
| 2 | dilutive-instruments.ts | Strategic Advisor warrants | 3,043,654 @ $5.40 (total) | 1,231,945 @ $5.40 (placement only) | HIGH |
| 3 | dilutive-instruments.ts | RSU classification | 26,954 RSUs | 3,043,654 labeled as RSUs | HIGH |
| 4 | dilutive-instruments.ts | C-3 Warrants | 1,280 @ unknown | 129,375 @ $10 | MEDIUM |
| 5 | bmnr-holdings-history.ts | Nov 30 share count | 408,578,823 (10-Q BS) | 384,067,823 (10-K cover) | MEDIUM |
| 6 | provenance/bmnr.ts | Staking revenue | $202M (Feb 9 8-K) | $188M (Feb 2 8-K) | LOW |
| 7 | companies.ts | quarterlyBurn | $40-50M/yr consulting fee not included | $1M/qtr | MEDIUM |
| 8 | BMNRCompanyView.tsx | hasDilutiveInstruments | Should be true | false | LOW |

### Matches Confirmed
- ✅ ETH holdings: 4,325,738 (provenance, companies.ts, holdings-history — all consistent)
- ✅ Shares baseline: 454,862,451 from 10-Q cover (Jan 12, 2026)
- ✅ Share estimation: ~524.4M used for mNAV (not stale 454.9M)
- ✅ Cash: $595M in all files
- ✅ Total Debt: $0 in all files
- ✅ Preferred Equity: $0 (all converted, confirmed)
- ✅ Other investments: $219M (Beast $200M + Eightco $19M), excluded from mNAV
- ✅ Cash treatment: $595M as restricted (operational), not subtracted from EV as "excess"
- ✅ All HPS arithmetic verified correct in both holdings history files
- ✅ Holdings history: Both files contain identical data
- ✅ Earnings data uses single source of truth pattern via getBMNRQuarterEndData()
- ✅ SEC source URLs verified in provenance file
- ✅ CIK, website, twitter, datStartDate all match
- ✅ Cost basis ($4,002) matches ground truth derivation
- ✅ Staking: 2,897,459 ETH (67%) matches

### Cross-File Issues
- **Duplicate holdings history:** `holdings-history.ts` BMNR_HISTORY and `bmnr-holdings-history.ts` BMNR_HISTORY contain the same data. Risk of divergence if only one is updated.
- **Nov 30 share anchor missing:** `bmnr-holdings-history.ts` SHARE_ANCHORS doesn't include Nov 30 = 408,578,823 from 10-Q balance sheet, causing ~6% HPS overstatement at that date.
- **Consulting fee omission:** $40-50M/yr Ethereum Tower LLC consulting fee not reflected in burn rate ($1M/qtr). This is a methodology choice but materially understates ongoing costs.
- **Beast Industries in mNAV:** $200M excluded from CryptoNAV but included implicitly in market cap/EV — creates asymmetry in mNAV calc.

### Next Phase Needs
1. **Dilutive instruments are the top priority fix:** CVI warrants (10.4M @ $87.50), proper classification of strategic advisor warrants (3,043,654 total @ $5.40 vs 1,231,945 placement only), and RSU count correction (26,954 not 3,043,654).
2. **Add Nov 30 share anchor** to SHARE_ANCHORS (408,578,823 from 10-Q BS) to fix ~6% HPS error.
3. **Update staking revenue** from $188M to $202M (use Feb 9 8-K, not Feb 2).
4. **Decide on consulting fee treatment** — should $40-50M/yr be reflected in burn or treated as AUM cost?
5. **Decide on Beast Industries** — should $200M + $19M ORBS be added to CryptoNAV or tracked separately?
6. **Set `hasDilutiveInstruments={true}`** in BMNRCompanyView.tsx.
7. **Consider deduplicating** holdings history (holdings-history.ts inline → import from bmnr-holdings-history.ts).
8. **UI verification** needs to be done manually — browser automation failed.
