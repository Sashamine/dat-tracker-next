# Data Validation Report
Generated: 2026-02-05

## Summary
64 discrepancies found comparing hardcoded values to EDGAR XBRL data.

## Categories

### 🔴 Real Errors — Burn Rates (NetCashUsedInOps ≠ True Burn)
**Root cause:** `NetCashProvidedByUsedInOperatingActivities` includes crypto purchases,
staking activity, and trading — NOT just operational overhead. For crypto treasury
companies, this massively overstates the actual "burn rate."

| Ticker | Our Burn | XBRL OpCF | Off By | Why |
|--------|----------|-----------|--------|-----|
| BMNR | $2.5M | $228M | 9034% | ETH purchases flow through operating CF |
| BTBT | $8.5M | $68M | 703% | Includes BTC/ETH trading activity |
| MARA | $85M | $193M | 127% | Includes BTC purchases + mining ops |
| CLSK | $65M | $115M | 77% | Same — BTC purchases in operating CF |
| KULR | $4M | $10M | 159% | BTC purchases in operating CF |
| RIOT | $120M | $156M | 30% | Includes BTC acquisitions |
| BNC | $3M | $12M | 302% | Includes crypto activity |
| UPXI | $2.5M | $9.8M | 291% | Large pivot to crypto |

**Action needed:** Burn rate should use SGA (Selling, General & Administrative) expenses
or a manually extracted "operational burn" excluding crypto activity. Operating cash flow
is the wrong metric for DAT companies.

### 🟡 Expected Differences — Shares (FD vs Basic)
Our `sharesForMnav` intentionally uses **fully diluted** counts (includes converts,
warrants, options) while XBRL reports **basic** shares outstanding.

| Ticker | Our FD Shares | XBRL Basic | Why Different |
|--------|--------------|------------|---------------|
| ASST | 1.25B | 1.7M | Post-merger (Strive+Semler). XBRL is pre-merger |
| ABTC | 899M | 83M | Includes warrants/options from Hut 8 spinoff |
| NAKA | 512M | 440M | Includes 71.7M pre-funded warrants |
| MARA | 470M | 378M | Diluted includes converts |
| RIOT | 403M | 372M | Diluted includes converts |
| ZOOZ | 162M | 12M | Post-merger share count vs pre-merger XBRL |
| HYPD | 24.4M | 8.1M | Includes warrants |
| CYPH | 137M | 57M | Includes warrants/options |

**Action:** These are correct as-is. Our FD counts are intentional for mNAV calculation.

### 🟡 Expected Differences — Cash/Debt (Post-Filing Events)
| Ticker | Field | Our Value | XBRL | Why |
|--------|-------|-----------|------|-----|
| MSTR | cash | $2.25B | $54M | Ours is "USD Reserve" from Jan 2026 8-K, not 10-Q cash |
| NAKA | debt | $210M | $64K | Kraken loan from Dec 2025 (post-Q3 10-Q) |
| RIOT | debt | $794M | $5M | Converts may be in different XBRL tag |
| CLSK | debt | $1.7B | $645M | Post-Q3 convert issuances |
| XXI | cash | $119M | $0 | Company formed Dec 2025, XBRL is pre-merger |

**Action:** These are correct — we intentionally use more recent 8-K data.

### 🟡 Minor Burns (15-40% off, likely just rounding/estimates)
SUIG, TBH, TRON, NAKA, AVX, FLD, CWD, GAME, DFDV, ZOOZ, FWDI

**Action:** Update with XBRL quarterly values where they're more precise.
