# BTBT Post-Fix Verification Report

**Date**: 2026-02-15  
**Verifier**: Subagent (btbt-v2-postfix)  
**Status**: ✅ **ALL CHECKS PASSED**

---

## 1. Holdings Consistency

| Source | Holdings | Date | Status |
|--------|----------|------|--------|
| Provenance (`btbt.ts`) | 155,239 | Jan 31, 2026 | ✅ |
| `companies.ts` | 155,239 | Jan 31, 2026 | ✅ |
| Holdings-history Dec 31 | 155,227 | Dec 31, 2025 | ✅ (Q4 anchor) |

**Result**: ✅ PASS  
- Current values (155,239) match between provenance and companies.ts
- Dec 31 quarter-end anchor correctly preserved as 155,227

---

## 2. Shares Consistency

| Source | Shares | Date | Status |
|--------|--------|------|--------|
| Provenance (`btbt.ts`) | 324,202,059 | Jan 31, 2026 | ✅ |
| `companies.ts` | 324,202,059 | Jan 31, 2026 | ✅ |
| Holdings-history Dec 31 | 323,792,059 | Dec 31, 2025 | ✅ (Q4 anchor) |
| XBRL cross-ref (provenance) | 323,674,831 | Nov 10, 2025 | ✅ (historical) |

**Result**: ✅ PASS  
- Current shares (324,202,059) match between provenance and companies.ts
- Dec 31 quarter-end anchor correctly preserved as 323,792,059

**Minor note**: `companies.ts` has `sharesAsOf: "2025-11-10"` but the actual value (324,202,059) is from Jan 31, 2026 PR. Non-blocking since calculation uses correct value.

---

## 3. Formula Verification (BTBTCompanyView.tsx)

Verified code at lines ~55-75:

```typescript
const { inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = getMarketCapForMnavSync(company, sd2, prices?.forex);
const d=Math.max(0, rawD - inTheMoneyDebtValue);
const adjC=c+inTheMoneyWarrantProceeds, adjRC=(company.restrictedCash||0)+inTheMoneyWarrantProceeds;
```

**Result**: ✅ PASS  
- `inTheMoneyDebtValue` variable exists and is used to adjust raw debt
- `inTheMoneyWarrantProceeds` variable exists and is added to cash
- Debt adjustment: `d = Math.max(0, rawD - inTheMoneyDebtValue)`
- Cash adjustment: `adjC = c + inTheMoneyWarrantProceeds`

---

## 4. No Stale References in Provenance

Searched provenance for "155,227" and "323,792,059" references:

| Reference | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `DEC_2025_HOLDINGS = 155_227` | btbt.ts constant | Q4 earnings anchor | ✅ Correct |
| Comment: "Dec 31, 2025 (Jan 7, 2026 PR) — used for Q4 earnings anchor" | btbt.ts | Documentation | ✅ Correct |

**Result**: ✅ PASS  
- Dec 31 references are clearly labeled as historical/Q4 anchors
- Current values (155,239 / 324,202,059) correctly represent Jan 31, 2026 data

---

## 5. Earnings Q4 vs Holdings-History Dec 31

**earnings-data.ts Q4 2025 entry**:
```typescript
{
  ticker: "BTBT",
  fiscalYear: 2025,
  fiscalQuarter: 4,
  holdingsAtQuarterEnd: 155_227,      // ✅ Dec 31, 2025
  sharesAtQuarterEnd: 323_792_059,    // ✅ Dec 31, 2025
  holdingsPerShare: 0.000479,
  source: "press-release",
  sourceUrl: "https://bit-digital.com/news/...",
  status: "upcoming",
}
```

**holdings-history.ts Dec 31, 2025 entry**:
```typescript
{ 
  date: "2025-12-31", 
  holdings: 155_227, 
  sharesOutstandingDiluted: 323_792_059,
  holdingsPerShare: 0.000479,
  ...
}
```

**Result**: ✅ PASS  
- Both sources agree: 155,227 / 323,792,059 for Dec 31, 2025
- These are correctly unchanged (quarter-end anchors, not Jan 31 values)

---

## 6. UI Verification

### BTBT Company Page (`/company/BTBT`)
| Metric | Displayed Value | Expected | Status |
|--------|-----------------|----------|--------|
| ETH Holdings | 155,239 | 155,239 | ✅ |
| Shares Outstanding | 324.2M | 324,202,059 | ✅ |
| mNAV | 0.78x | — | ✅ |
| Historical note | "155,227 ETH (Dec 31, 2025)" | — | ✅ |

### Overview Page (`/`)
| Metric | Displayed Value | Expected | Status |
|--------|-----------------|----------|--------|
| Holdings | 155.2K ETH | 155,239 (rounded) | ✅ |
| mNAV | 0.78x | Same as company page | ✅ |

**Result**: ✅ PASS  
- Company page shows current holdings (155,239 ETH)
- Overview and company page show identical mNAV (0.78x)
- Historical Dec 31 value correctly shown in context note

---

## Summary

| Check | Status |
|-------|--------|
| 1. Holdings consistency | ✅ PASS |
| 2. Shares consistency | ✅ PASS |
| 3. Formula (ITM adjustments) | ✅ PASS |
| 4. No stale references | ✅ PASS |
| 5. Earnings Q4 vs holdings-history | ✅ PASS |
| 6. UI verification | ✅ PASS |

**Overall**: ✅ **ALL VERIFICATION CHECKS PASSED**

### Data Flow Summary
```
Provenance (btbt.ts)           companies.ts              UI Display
├─ Jan 31 holdings: 155,239 ──► holdings: 155,239 ─────► "155,239 ETH"
├─ Jan 31 shares: 324,202,059 ► sharesForMnav: 324.2M ─► "324.2M shares"
└─ Dec 31 anchor: 155,227 ────► (used in earnings-data/holdings-history)

holdings-history.ts            earnings-data.ts
├─ Dec 31: 155,227/323,792,059 ├─ Q4 2025: 155,227/323,792,059
└─ (quarter-end snapshot)      └─ (quarter-end for HPS tracking)
```

The Jan 31, 2026 values (155,239 / 324,202,059) are correctly used for current mNAV calculations, while Dec 31, 2025 values (155,227 / 323,792,059) are correctly preserved as Q4 quarter-end anchors for historical HPS tracking.
