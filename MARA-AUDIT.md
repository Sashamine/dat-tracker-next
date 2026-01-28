# MARA (MARA Holdings) Data Architecture Audit

**Date:** 2026-01-27  
**Auditor:** Claude (Clawdbot)  
**Comparison:** MSTR infrastructure (reference: MSTR-FIXES.md)

---

## Executive Summary

MARA is the largest US-listed BTC miner with $5.33B in BTC holdings (53,250 BTC). While we have basic quarterly history, we're missing the comprehensive SEC-backed infrastructure that MSTR has.

**Key Stats:**
- Holdings: 53,250 BTC (~$5.3B)
- Market Cap: ~$3.6B
- SEC CIK: 0001507605
- Filing Activity: 14 10-Ks, 44 10-Qs, 260 8-Ks

---

## Current Data State

### What We Have ✅

**holdings-history.ts:** 8 quarterly snapshots
```
Q4 2023: 15,126 BTC | 310.9M shares
Q1 2024: 17,631 BTC | 328.6M shares
Q2 2024: 18,488 BTC | 356.8M shares
Q3 2024: 26,747 BTC | 397.0M shares
Q4 2024: 44,893 BTC | 430.0M shares
Q1 2025: 46,376 BTC | 445.0M shares
Q2 2025: 49,951 BTC | 458.0M shares
Q3 2025: 53,250 BTC | 470.1M shares
```

**companies.ts:** Basic financials
- Holdings: 53,250 BTC (from press release)
- Shares: 470M diluted
- Cash: $826.4M (SEC 10-Q)
- Quarterly burn: $85M

### What's Missing ❌

| Component | MSTR Has | MARA Has | Gap |
|-----------|----------|----------|-----|
| SEC XBRL History | 21 filings parsed | 0 | 100% |
| Capital Events (8-K) | 28 events tracked | 0 | 100% |
| Verification Engine | Cross-checks | None | 100% |
| Dilutive Instruments | 8 tranches tracked | 0 | 100% |
| Daily mNAV History | 861 snapshots | 0 | 100% |
| Earnings History | 20+ quarters | 1 quarter | 95% |

---

## SEC Filing Inventory

### 10-K Annual Reports (14 total)
Available for deep historical analysis going back to 2012.

### 10-Q Quarterly Reports (44 total)
Recent filings:
- 2025-11-04: Q3 2025 (accession: 0001507605-25-000028)
- 2025-07-29: Q2 2025 (accession: 0001507605-25-000018)
- 2025-05-08: Q1 2025 (accession: 0001507605-25-000009)

### 8-K Current Reports (260 total)
By year:
- 2025: 16 8-Ks
- 2024: 25 8-Ks
- 2023: 24 8-Ks
- 2022: 10 8-Ks

These contain:
- BTC purchases
- ATM sales
- Convertible offerings
- Mining production updates

### XBRL Data Available

Crypto-specific fields found:
- `CryptoAssetCost` - Cost basis of holdings
- `CryptoAssetFairValue` - Fair value of holdings
- `CryptoAssetFairValueCurrent` - Current portion
- `CryptoAssetFairValueNoncurrent` - Non-current portion
- `CryptoAssetMining` - Mining revenue
- `CryptoAssetPurchase` - Purchase activity

---

## Implementation Plan

### Phase 1: SEC XBRL History (Priority: HIGH)
**Goal:** Create `mara-sec-history.ts` with all quarterly XBRL data

Tasks:
1. Parse all 44 10-Q filings for:
   - CryptoAssetFairValue (BTC holdings value)
   - EntityCommonStockSharesOutstanding (basic shares)
   - WeightedAverageNumberOfDilutedSharesOutstanding (diluted shares)
   - CashAndCashEquivalentsAtCarryingValue
   - LongTermDebt / ConvertibleNotesPayable

2. Create structured history file similar to `mstr-sec-history.ts`

**Estimated entries:** 20+ quarterly snapshots (2020-2025)

### Phase 2: Capital Events from 8-Ks (Priority: HIGH)
**Goal:** Create `mara-capital-events.ts` tracking inter-quarter activity

MARA files monthly production updates in 8-Ks containing:
- BTC mined
- BTC purchased
- BTC sold (if any)
- Hash rate updates

Tasks:
1. Parse 2024-2025 8-Ks for BTC activity
2. Track ATM share issuances
3. Track convertible note offerings

**Estimated events:** 40+ capital events

### Phase 3: Dilutive Instruments (Priority: MEDIUM)
**Goal:** Create dilutive instruments tracking

MARA has:
- Convertible notes (multiple tranches)
- ATM program
- Stock options/warrants

Tasks:
1. Identify all dilutive instruments from 10-K/10-Q
2. Track conversion prices vs current stock price
3. Calculate dynamic dilution for mNAV

### Phase 4: Verification & Daily mNAV (Priority: MEDIUM)
**Goal:** Cross-check sources and generate daily history

Tasks:
1. Build verification engine (press releases vs SEC filings)
2. Generate daily mNAV snapshots (like MSTR's 861 days)
3. Add earnings history beyond Q3 2025

---

## Data Quality Issues to Resolve

### 1. Holdings Discrepancy
- Press release (Q3 2025): 53,250 BTC
- SEC 10-Q digital assets field: Shows different value
- Need to reconcile methodology

### 2. Share Count Methodology
- Cover page shows 378M basic shares
- XBRL diluted: 450M shares  
- Our data: 470M shares
- Need to document which to use for mNAV and why

### 3. Mining vs Purchased BTC
- MARA is a miner, so BTC comes from both mining and purchases
- XBRL has separate fields: CryptoAssetMining, CryptoAssetPurchase
- Should track both sources

---

## Files to Create

1. `src/lib/data/mara-sec-history.ts` - XBRL quarterly data
2. `src/lib/data/mara-capital-events.ts` - 8-K capital events
3. `src/lib/data/mara-capital-structure.ts` - Dilutive instruments
4. `src/lib/data/mara-daily-mnav.ts` - Daily mNAV snapshots
5. `src/lib/data/mara-verification.ts` - Source cross-checking

---

## Estimated Effort

| Phase | Task | Hours |
|-------|------|-------|
| 1 | SEC XBRL History | 12-16 |
| 2 | Capital Events (8-K) | 16-20 |
| 3 | Dilutive Instruments | 6-8 |
| 4 | Verification & Daily mNAV | 8-12 |
| **Total** | | **42-56 hours** |

---

## Success Criteria

- [ ] mNAV calculation within 1% of any official dashboard (if exists)
- [ ] All holdings values traceable to SEC filings
- [ ] Share counts documented with methodology
- [ ] 8-K capital events explaining quarter-over-quarter changes
- [ ] Daily mNAV history from DAT start date
