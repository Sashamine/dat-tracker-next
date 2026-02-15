# BMNR Post-Fix Verification Report
Generated: 2026-02-14

## Fixes Applied

### Fix 1 — Dilutive Instruments ✅
**File:** `src/lib/data/dilutive-instruments.ts`
- **Added CVI Warrants:** 10,435,430 @ $87.50 strike, expires Mar 22 2027 (liability-classified, currently OTM)
- **Fixed RSU misclassification:** Changed from 3,043,654 @ $0 (was mapping NonOptionEquityInstrumentsOutstanding as RSUs) to actual 26,954 RSUs @ $0
- **Fixed Strategic Advisor warrants:** Changed from 1,231,945 (ThinkEquity only) to 3,043,654 total @ $5.40 (includes strategic advisor + placement agent, per 10-Q Note 8)
- **Fixed C-3 warrants:** Changed from 129,375 @ $10 to 1,280 @ $10 (per 10-Q Note 10)
- **Set `hasDilutiveInstruments={true}`** in BMNRCompanyView.tsx

**New total: 13,507,318 potentially dilutive shares** (was ~4.4M with incorrect classifications)

### Fix 2 — Nov 30 Share Anchor ✅
**Files:** `src/lib/data/bmnr-holdings-history.ts`, `src/lib/data/holdings-history.ts`
- Added `'2025-11-30': { shares: 408_578_823, source: '10-Q balance sheet' }` to SHARE_ANCHORS
- Updated Nov 30 snapshot: shares 384,067,823 → 408,578,823 (10-Q BS vs 10-K cover)
- Recalculated HPS: 0.009703 → 0.009121 (3,726,499 / 408,578,823)
- **Impact:** ~6% HPS overstatement at Nov 30 now corrected
- Updated in both duplicate files (holdings-history.ts and bmnr-holdings-history.ts)

### Fix 3 — mNAV Formula Parity ✅
**File:** `src/components/BMNRCompanyView.tsx`
- **Before:** `ev = mcap + debt + preferred - cashReserves`, `mNAV = ev / cryptoNav`
  - This subtracted $595M from EV and used bare cryptoNav
- **After:** `ev = mcap + debt + preferred - freeCash(=0)`, `mNAV = ev / (cryptoNav + restrictedCash)`
  - Now matches canonical `calculateMNAV()` from calculations.ts
  - freeCash = cashReserves - restrictedCash = $595M - $595M = $0
  - totalNav = cryptoNav + $595M restrictedCash
- **Also fixed:** mNAV chart `companyData.restrictedCash` from 0 to cashReserves
- **Impact:** ~2.4% mNAV discrepancy between overview and company pages eliminated

### Fix 4 — Staking Revenue ✅
**File:** `src/lib/data/provenance/bmnr.ts`
- Updated annualized staking revenue: $188M → $202M
- Updated source: Feb 2 8-K (acc 0001493152-26-004960) → Feb 9 8-K (acc 0001493152-26-005707)
- Updated quote to match Feb 9 filing verbatim

## Compilation
- `npx tsc --noEmit`: **PASS** (no errors after each fix and final)

## Page Load Verification
- `http://localhost:3000/company/BMNR`: **HTTP 200** ✅
- `http://localhost:3000/`: **HTTP 200** ✅
- Note: mNAV values are computed client-side (React hydration with live prices). SSR serves correctly, no runtime errors.

## mNAV Parity Check
Both the company page (BMNRCompanyView.tsx inline formula) and the overview page (via canonical `calculateMNAV()` / `getCompanyMNAV()`) now use equivalent formulas:
- `companies.ts` has `restrictedCash: 595_000_000` (= cashReserves)
- Canonical: `freeCash = cash - restrictedCash = 0`, `EV = mcap`, `totalNav = cryptoNav + 595M`
- BMNRCompanyView: same formula now applied inline
- **Result:** Pages should match ✅

## Items NOT Fixed (by design)
1. **C-3 warrants strike price:** Using $10 estimate. Ground truth says "unknown (legacy)". Low impact (1,280 shares).
2. **Consulting fee disclosure:** Not added. This is a methodology choice per final adversary recommendation. Current $1M/qtr burn is defensible as operational-only.
3. **Holdings history dedup:** Both files still contain identical data. Noted for future code hygiene.
4. **Beast Industries in mNAV:** $219M excluded from CryptoNAV. Correct per canonical formula (2.4% of cryptoNav < 5% materiality threshold).
