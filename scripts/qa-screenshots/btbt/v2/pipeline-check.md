# BTBT Pipeline Check — Agent C
**Check Date:** 2026-02-14
**Reviewing:** Ground truth vs all code files and UI

---

## Executive Summary

| Category | Status | Issues |
|----------|--------|--------|
| **Ground Truth vs Code** | ⚠️ STALE | Using Dec 31, 2025 data; ground truth has Jan 31, 2026 |
| **Cross-File Consistency** | ✅ MATCH | All files internally consistent |
| **Formula Parity** | ✅ MATCH | Company page and overview use same logic |
| **UI Verification** | ✅ MATCH | mNAV matches across pages |

---

## 1. File-by-File Comparison Against Ground Truth

### 1.1 Holdings (ETH)

| Source | Value | As-of Date | Status |
|--------|-------|------------|--------|
| **Ground Truth** | 155,239.4 ETH | Jan 31, 2026 | NEWEST |
| provenance/btbt.ts | 155,227 ETH | Dec 31, 2025 | **STALE** |
| companies.ts | 155,227 ETH | Dec 31, 2025 | **STALE** |
| earnings-data.ts Q4 | 155,227 ETH | Dec 31, 2025 | **STALE** |
| holdings-history.ts | 155,227 ETH | Dec 31, 2025 | **STALE** |

**Verdict:** ⚠️ **STALE** — Code uses Dec 31, 2025 PR (155,227 ETH). Ground truth uses Feb 6, 2026 PR with Jan 31, 2026 data (155,239.4 ETH). Delta: +12.4 ETH (trivial, but stale).

### 1.2 Shares Outstanding

| Source | Value | As-of Date | Status |
|--------|-------|------------|--------|
| **Ground Truth** | 324,202,059 | Jan 31, 2026 | NEWEST |
| provenance/btbt.ts | 323,792,059 | Dec 31, 2025 | **STALE** |
| companies.ts (sharesForMnav) | 323,792,059 | Dec 31, 2025 | **STALE** |
| earnings-data.ts Q4 | 323,792,059 | Dec 31, 2025 | **STALE** |
| holdings-history.ts Q4 | 323,792,059 | Dec 31, 2025 | **STALE** |

**Verdict:** ⚠️ **STALE** — Code uses Dec 31, 2025 PR. Ground truth has Jan 31, 2026 (324,202,059). Delta: +410,000 shares (ATM dilution).

### 1.3 Convertible Notes

| Source | Value | Status |
|--------|-------|--------|
| **Ground Truth** | $150,000,000 | |
| provenance/btbt.ts (TOTAL_DEBT) | $150,000,000 | ✅ MATCH |
| companies.ts (totalDebt) | $150,000,000 | ✅ MATCH |
| holdings-history.ts Q4 (totalDebt) | $150,000,000 | ✅ MATCH |

**Verdict:** ✅ **MATCH** — All sources agree on $150M convertible notes.

### 1.4 Preferred Equity

| Source | Value | Status |
|--------|-------|--------|
| **Ground Truth** | $9,050,000 | |
| provenance/btbt.ts (preferredEquity) | $9,050,000 | ✅ MATCH |
| companies.ts (preferredEquity) | $9,050,000 | ✅ MATCH |
| holdings-history.ts Q4 | $9,050,000 | ✅ MATCH |

**Verdict:** ✅ **MATCH** — All sources agree on $9.05M preferred equity.

### 1.5 Cash Reserves

| Source | Value | As-of Date | Status |
|--------|-------|------------|--------|
| **Ground Truth** | $179,118,182 | Sep 30, 2025 (Q3) | |
| provenance/btbt.ts | $179,100,000 | Sep 30, 2025 | ✅ MATCH (rounded) |
| companies.ts | $179,100,000 | Sep 30, 2025 | ✅ MATCH (rounded) |

**Verdict:** ✅ **MATCH** — $179.1M cash from Q3 2025. Minor rounding ($179.118M → $179.1M). No newer quarterly data available yet.

---

## 2. Cross-File Consistency

### 2.1 Quarter-End Anchors

| Quarter | earnings-data.ts | holdings-history.ts | Match? |
|---------|------------------|---------------------|--------|
| Q4 2025 (Dec 31) | 155,227 / 323,792,059 / 0.000479 | 155,227 / 323,792,059 / 0.000479 | ✅ MATCH |
| Q3 2025 (Sep 30) | 122,187 / 323,674,831 / 0.000378 | 122,187 / 323,674,831 / 0.000378 | ✅ MATCH |
| Q2 2025 (Jun 30) | 30,663 / 321,432,722 / 0.000095 | 30,663 / 321,432,722 / 0.000095 | ✅ MATCH |
| Q1 2025 (Mar 31) | 10,000 / 207,780,871 / 0.000048 | 10,000 / 207,780,871 / 0.000048 | ✅ MATCH |

**Verdict:** ✅ **MATCH** — Every quarter-end in earnings-data has matching holdings-history entry with identical values.

### 2.2 companies.ts sharesForMnav vs provenance sharesOutstanding

| Source | Value |
|--------|-------|
| companies.ts (sharesForMnav) | 323,792,059 |
| provenance/btbt.ts (SHARES_OUTSTANDING) | 323,792,059 |

**Verdict:** ✅ **MATCH**

### 2.3 HPS Arithmetic Check

**Q4 2025:**
- Holdings: 155,227
- Shares: 323,792,059
- HPS: 155,227 / 323,792,059 = 0.000479314...
- Code says: 0.000479

**Verdict:** ✅ **MATCH** (rounded appropriately)

---

## 3. Formula Parity (CRITICAL)

### 3.1 Overview Page Formula (mnav-calculation.ts → getCompanyMNAV → calculateMNAV)

```typescript
// From calculateMNAV():
baseCryptoNav = (holdings * assetPrice) + secondaryCryptoValue;
otherInvestmentsMaterial = otherInvestments / baseCryptoNav > 0.05;
totalNav = baseCryptoNav + restrictedCash + (otherInvestmentsMaterial ? otherInvestments : 0);
freeCash = cashReserves - restrictedCash;
enterpriseValue = marketCap + totalDebt + preferredEquity - freeCash;
mNAV = enterpriseValue / totalNav;
```

**BTBT-specific inputs from companies.ts:**
- `cashReserves` = 179,100,000
- `restrictedCash` = 179,100,000 (all cash is operational, not excess)
- `otherInvestments` = 427,300,000 (WYFI stake)
- `totalDebt` = 150,000,000
- `preferredEquity` = 9,050,000

**Calculation:**
- `freeCash` = 179.1M - 179.1M = **$0**
- `baseCryptoNav` = 155,227 × $2,085 = ~$323.6M
- WYFI ratio = $427.3M / $323.6M = 132% > 5% → **MATERIAL, included**
- `totalNav` = $323.6M + $179.1M (restrictedCash) + $427.3M (WYFI) = ~$930M
- `EV` = MarketCap + $150M + $9.05M - $0 = MarketCap + $159.05M

### 3.2 Company Page Formula (BTBTCompanyView.tsx)

```typescript
// From BTBTCompanyView useMemo:
const rc = company.restrictedCash || 0;    // 179,100,000
const fc = c - rc;                          // freeCash = 179.1M - 179.1M = 0
const baseCryptoNav = h * ethP;             // 155,227 × ETH price
const oi = company.otherInvestments || 0;  // 427,300,000
const oiMaterial = baseCryptoNav > 0 && (oi / baseCryptoNav) > 0.05;  // TRUE
const nav = baseCryptoNav + rc + (oiMaterial ? oi : 0);  // includes WYFI + restrictedCash
const ev = mc + d + pf - fc;                // marketCap + debt + preferred - freeCash
const mn = nav > 0 ? ev / nav : null;
```

### 3.3 Line-by-Line Comparison

| Component | Overview (`calculateMNAV`) | Company Page (`BTBTCompanyView`) | Match? |
|-----------|---------------------------|----------------------------------|--------|
| **Free Cash** | `cashReserves - restrictedCash` | `c - rc` | ✅ MATCH |
| **Base Crypto NAV** | `holdings * assetPrice` | `h * ethP` | ✅ MATCH |
| **OI Materiality** | `otherInvestments / baseCryptoNav > 0.05` | `(oi / baseCryptoNav) > 0.05` | ✅ MATCH |
| **Total NAV** | `baseCryptoNav + restrictedCash + OI` | `baseCryptoNav + rc + (oiMaterial ? oi : 0)` | ✅ MATCH |
| **EV** | `marketCap + debt + preferred - freeCash` | `mc + d + pf - fc` | ✅ MATCH |
| **mNAV** | `EV / totalNav` | `ev / nav` | ✅ MATCH |
| **preferredEquity** | Included in EV | Included in EV (`pf`) | ✅ MATCH |

**Verdict:** ✅ **MATCH** — Both pages use identical logic:
- Cash treated as `freeCash = cash - restrictedCash` (for BTBT: $0 free cash)
- WYFI included in NAV (material: 132% > 5% threshold)
- preferredEquity included in EV
- No ITM debt adjustments (convertible at $4.16, stock at $1.76 = OTM)

---

## 4. UI Verification

### 4.1 mNAV Comparison

| Page | mNAV | Match? |
|------|------|--------|
| Overview (`/`) | **0.78x** | |
| Company Page (`/company/BTBT`) | **0.78x** | ✅ MATCH |

**Verdict:** ✅ **MATCH**

### 4.2 Key Metrics from Company Page

| Metric | UI Value | Code Value | Match? |
|--------|----------|------------|--------|
| ETH Holdings | 155,227 | 155,227 | ✅ MATCH |
| Shares | 323.8M | 323,792,059 | ✅ MATCH |
| Cash | $179.1M | $179,100,000 | ✅ MATCH |
| Total Debt | $150.0M | $150,000,000 | ✅ MATCH |
| Equity NAV | $950.03M | Calculated | ✅ CONSISTENT |
| ETH/Share | 0.0005 | 0.000479 | ✅ MATCH (rounded) |
| Leverage | 0.00x | NetDebt/CryptoNAV | ✅ MATCH (debt < cash) |
| Equity NAV/Share | $2.934 | Calculated | ✅ CONSISTENT |

### 4.3 HPS Chart Data Points

**Checked earnings-data.ts quarterly entries:**
- Q4 2025: HPS = 0.000479 → matches earnings table
- Q3 2025: HPS = 0.000378 → matches earnings table
- Q2 2025: HPS = 0.000095 → matches earnings table
- Q1 2025: HPS = 0.000048 → matches earnings table

**Verdict:** ✅ **MATCH** — HPS chart should have data points at quarter-end dates matching earnings table values.

---

## 5. Issues Found

### 5.1 Staleness (Non-Critical)

Code uses **Dec 31, 2025** PR data:
- Holdings: 155,227 ETH
- Shares: 323,792,059

Ground truth has **Jan 31, 2026** PR data:
- Holdings: 155,239.4 ETH (+12.4 ETH)
- Shares: 324,202,059 (+410,000 shares)

**Impact:** Minimal. HPS delta: 0.000479 → 0.000478 (negligible). mNAV impact <0.1%.

**Recommendation:** Update to Jan 2026 data when doing next refresh, but not blocking.

### 5.2 No Issues with Formula Parity

Both pages correctly:
- Set `restrictedCash = cashReserves` for BTBT (all operational cash)
- Include WYFI ($427.3M) in NAV when material
- Include preferredEquity ($9.05M) in EV
- Treat OTM convertibles as debt (not dilutive at current price)

---

## 6. Artifacts Checked

| File | Location | Checked |
|------|----------|---------|
| ground-truth.md | scripts/qa-screenshots/btbt/v2/ | ✅ |
| extraction-adversary.md | scripts/qa-screenshots/btbt/v2/ | ✅ |
| provenance/btbt.ts | src/lib/data/provenance/ | ✅ |
| companies.ts | src/lib/data/ | ✅ |
| earnings-data.ts | src/lib/data/ | ✅ |
| holdings-history.ts | src/lib/data/ | ✅ |
| mnav-calculation.ts | src/lib/utils/ | ✅ |
| BTBTCompanyView.tsx | src/components/ | ✅ |
| Overview UI | http://localhost:3000 | ✅ |
| Company Page UI | http://localhost:3000/company/BTBT | ✅ |

---

## 7. Conclusion

**BTBT data is INTERNALLY CONSISTENT across all code files and UI.**

The only issue is **staleness**: code uses Dec 31, 2025 PR while ground truth has Jan 31, 2026 PR. This is a minor delta (+12.4 ETH, +410K shares) with negligible mNAV impact.

**Formula parity is CONFIRMED** — both overview and company pages use identical mNAV calculation logic with correct treatment of:
- Cash (all operational for BTBT, no free cash subtracted)
- WYFI stake (included in NAV, >5% materiality)
- Preferred equity (included in EV)
- Convertibles (OTM at current price, treated as debt not dilutive)

**Ready for Phase 4 Final Adversary review.**
