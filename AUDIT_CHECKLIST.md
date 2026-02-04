# DAT Tracker - Company Audit Checklist

Use this checklist when reviewing each company's data for accuracy.

---

## Audit Categories

### 1. Core Data Accuracy
- [ ] Holdings count matches latest SEC/press release
- [ ] `holdingsLastUpdated` is current
- [ ] `holdingsSource` and `holdingsSourceUrl` are set
- [ ] `sharesForMnav` is accurate and sourced
- [ ] `costBasisAvg` calculated correctly

### 2. Financial Data
- [ ] `stakingPct` verified (not assumed/outdated)
- [ ] `stakingMethod` describes current approach
- [ ] `quarterlyBurnUsd` verified from 10-Q (add `burnEstimated: true` if not)
- [ ] `cashReserves` current
- [ ] `restrictedCash` set if applicable
- [ ] `totalDebt` accurate
- [ ] `preferredEquity` / `preferredDividendAnnual` correct
- [ ] All financial fields have `*AsOf` dates and `*Source` citations

### 3. Company Info
- [ ] `website` URL
- [ ] `twitter` handle (without @)
- [ ] `leader` name
- [ ] `strategy` description current
- [ ] `notes` reflect current state
- [ ] `description` for longer overview (optional)

### 4. SEC / Regulatory
- [ ] `secCik` present (US companies)
- [ ] `sedarProfile` present (Canadian companies)
- [ ] Filing type behavior correct (US vs FPI)

### 5. Data Warnings
- [ ] `pendingMerger` flagged if applicable
- [ ] `lowLiquidity` flagged if applicable
- [ ] `dataWarnings` array for pending events
- [ ] `burnEstimated` for unverified burn figures

---

## Company Audit Progress

| Ticker | Core | Financial | Info | Regulatory | Warnings | Status |
|--------|------|-----------|------|------------|----------|--------|
| BMNR | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| MARA | ✅ | ⬜ | ✅ | ✅ | ⬜ | Partial (stale data) |
| XXI | ✅ | ✅ | ✅ | ✅ | ✅ | **Done** |
| MSTR | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| SBET | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| BTCS | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| KULR | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| MARA | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| RIOT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| CLSK | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| COIN | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| HOOD | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| CIFR | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| WULF | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| HIVE | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| BITF | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| HUT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| IREN | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| CORZ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| BTDR | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| SMLR | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| CBIT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Pending |
| ... | | | | | | |

---

## Common Issues Found

### BMNR (Feb 4, 2026)
- Staking was listed as 85%, actual is ~47% (ramping via MAVAN)
- Added `burnEstimated: true` for $2.5M/qtr figure
- Added website and Twitter

### MARA (Feb 4, 2026)
- Holdings corrected from 53,250 to 52,850 BTC (matches Q3 10-Q)
- Data is stale (Sep 30, 2025 - 4 months old)
- No monthly production updates published since Sep 2025
- 10-K for FY2025 expected late Feb/early March 2026

### XXI (Feb 4, 2026)
- Added website (xxi.money) and twitter (xxicapital)
- Added stakingPct: 0 (BTC not staked)
- Added burnEstimated: true (new company, estimate only)
- Updated holdingsSourceUrl to specific 8-K filing
- Verified holdings breakdown: Tether 24.5K + Bitfinex 7K + PIPE ~11.5K = ~43K BTC

---

## Notes

- **Priority**: Start with Tier 1 companies, then work through Tier 2/3
- **Sources**: Always cite SEC filings over press releases when available
- **FPIs**: Foreign Private Issuers (Metaplanet, etc.) have less frequent filings
- **Miners**: Need `btcMinedAnnual` and mining-specific fields
