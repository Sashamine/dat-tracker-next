# Company Verification Checklist

## Overview
Systematic verification process for DAT company data quality.

**Key files to check/update:**
- `companies.ts` — holdings, CIK, debt, shares, metadata
- `earnings-data.ts` — quarterly holdings, shares (diluted), HPS
- `holdings-history.ts` — historical snapshots (keep in sync with earnings!)
- `dilutive-instruments.ts` — converts, warrants, options

**Earnings data rule**: Never leave current quarter empty. Use best available source:
1. SEC 10-Q/10-K XBRL (preferred)
2. 8-K filings with holdings updates
3. Press releases / shareholder updates
4. Production reports (miners)
5. Company dashboards/IR pages

## Future Considerations
- **LsETH / Liquid Staking Tokens**: Currently counted at "as-if redeemed" value (1:1 with ETH). Consider whether to apply haircut for protocol/counterparty risk, or track native vs staked separately. Relevant for SBET (~26% LsETH), potentially others.

---

## RIOT (Riot Platforms) - Verified 2026-01-28

### 1. Holdings Data ✅
- [x] **Current holdings**: 18,005 BTC (includes 3,977 restricted)
- [x] **Source**: Dec 2025 Production Update (Jan 6, 2026)
- [x] **Source URL**: https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/
- [x] **Last updated**: 2025-12-31
- [x] **Note**: Sold 1,818 BTC in Dec 2025 (unusual for HODL miner)

### 2. SEC Filing Verification ✅
- [x] **CIK**: 0001167419
- [x] **Recent 8-Ks checked**: Jan 16, Jan 5, Jan 2, Dec 31
- [x] **Latest 10-K**: Filed Feb 28, 2025 (FY2024)
- [x] **Latest 10-Q**: Filed Oct 30, 2025 (Q3 2025)

### 3. XBRL Data Extraction ✅
- [x] **EntityCommonStockSharesOutstanding**: 371,807,186 (Q3 2025 filing)
- [x] **Diluted shares**: ~402M (implied from Q3 EPS: $104.5M ÷ $0.26)
- [x] **Note**: XBRL has limited crypto-specific fields for RIOT

### 4. Fiscal Year Identification ✅
- [x] **Fiscal year end**: December 31 (calendar year)
- [x] **Current quarter**: Q4 2025 (Oct-Dec), 10-K expected ~Feb 2026

### 5. Earnings Data ✅
| Quarter | Period End | Holdings | Net Income | Shares (diluted) | HPS |
|---------|------------|----------|------------|------------------|-----|
| Q1 2024 | Mar 31 | 8,872 | $211.8M | 280M | 0.0000317 |
| Q2 2024 | Jun 30 | 9,334 | $127.3M | 295M | 0.0000316 |
| Q3 2024 | Sep 30 | 10,427 | -$154.4M | 310M | 0.0000336 |
| Q4 2024 | Dec 31 | 17,722 | $166.1M | 325M | 0.0000545 |
| Q1 2025 | Mar 31 | 19,223 | -$296.4M | 335M | 0.0000574 |
| Q2 2025 | Jun 30 | 15,370 | -$247.8M | 350M | 0.0000439 |
| Q3 2025 | Sep 30 | 17,429 | $104.5M | 402M | 0.0000434 |

### 6. Holdings Per Share Growth ✅
- [x] **Q3→Q4 2024**: +70% (big accumulation with $510M convert proceeds)
- [x] **Q2→Q3 2025**: +13% holdings, but dilution kept HPS flat

### 7. Non-Crypto Investments ✅
- [x] **Cash reserves**: $330.7M unrestricted (Q3 2025)
- [x] **Mining infrastructure**: Not included in mNAV

### 8. Company Metadata ✅
- [x] **Strategy accurate**: HODL miner + treasury, converts fund BTC buys
- [x] **Notes accurate**: Adopted DAT playbook Dec 2024
- [x] **Leader**: Jason Les (CEO)

### 9. Dilutive Instruments ⚠️
- [x] **Convertible notes**: $594M 0.75% due 2030 (~49.5M shares at ~$12)
- [ ] **TODO**: Verify exact conversion price from 8-K Dec 2024
- [x] **BTC-backed credit**: $200M Coinbase facility (not dilutive)
- [x] **Added to dilutive-instruments.ts**: Yes (with estimated strike)

---

## SBET (SharpLink Gaming) - Verified 2026-01-28

### 1. Holdings Data ✅
- [x] **Current holdings**: 863,424 ETH
  - Native ETH: 639,241
  - LsETH (liquid staking): 224,183 (as-if redeemed)
- [x] **Source**: SEC 8-K Dec 17, 2025
- [x] **Source URL**: https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/ex99-1.htm
- [x] **Last updated**: 2025-12-14
- [x] **Staking rewards earned**: 9,241 ETH since Jun 2 (3,350 native + 5,891 LsETH)

### 2. SEC Filing Verification ✅
- [x] **CIK**: 0001981535
- [x] **Recent 8-Ks checked**: Dec 17, Oct 28, Oct 21, Oct 17
- [x] **Latest 10-K**: Pending (Q4 2025, expected Mar 2026)
- [x] **Latest 10-Q**: Filed Nov 12, 2025 (Q3 2025)

### 3. XBRL Data Extraction ✅
- [x] **CommonStockSharesOutstanding**: 192,193,183 (Sep 30, 2025)
- [x] **NetIncomeLoss Q3**: $104,270,205 (includes crypto gains)
- [x] **Revenues Q3**: $10,843,567
- [x] **EPS Diluted Q3**: $0.62

### 4. Fiscal Year Identification ✅
- [x] **Fiscal year end**: December 31 (calendar year)
- [x] **Current quarter**: Q4 2025 (Oct-Dec), 10-K pending

### 5. Earnings Data Backfill ✅
| Quarter | Period End | Holdings | Shares | HPS | Source |
|---------|------------|----------|--------|-----|--------|
| Q1 2025 | Mar 31 | 0 | 575K | 0 | 10-Q (pre-ETH) |
| Q2 2025 | Jun 30 | 520K | 66.2M | 0.00786 | 10-Q |
| Q3 2025 | Sep 30 | 861,251 | 192.2M | 0.00448 | 10-Q XBRL |
| Q4 2025 | Dec 31 | 863,424 | 196.7M | 0.00439 | 8-K (holdings only) |

### 6. Holdings Per Share Growth ✅
- [x] **Q2→Q3**: +65.6% holdings, but HPS dropped due to share issuance
- [x] **Q3→Q4**: +0.25% holdings, HPS flat
- [x] **Note**: Heavy dilution from ATM offset by ETH accumulation

### 7. Non-Crypto Investments ✅
- [x] **USDC stablecoins**: $26.7M (Q3 2025)
- [x] **Cash reserves**: $11.1M (operating, restricted)
- [x] **Treatment**: otherInvestments field captures USDC

### 8. Company Metadata ✅
- [x] **Strategy accurate**: Staking, Linea partnership, Superstate tokenization
- [x] **Notes accurate**: #2 ETH treasury, buyback program, mNAV discount
- [x] **Staking info**: 95% staked via Linea/Lido (stakingPct, stakingMethod)
- [x] **Leader**: Joseph Chalom (BlackRock) - updated Dec 15, 2025

### 9. Dilutive Instruments ✅
- [x] **Warrants**: 3,455,019 @ $1.08 (post-split adjusted, ITM)
- [x] **Convertible notes**: None
- [x] **Options**: 9,022 @ $91.06 (deep OTM)
- [x] **RSUs**: 18,116,449 @ $0 (large grant with Chalom leadership)
- [x] **Total potential dilution**: ~21.6M shares (~11% of 192M basic)
- [x] **Added to dilutive-instruments.ts**: Yes

---

## BMNR (Bitmine Immersion) - Verified 2026-01-28

### 1. Holdings Data ✅
- [x] **Current holdings**: 4,243,338 ETH
- [x] **Source**: SEC 8-K Jan 26, 2026
- [x] **Source URL**: https://www.sec.gov/Archives/edgar/data/1829311/000149315226003536/ex99-1.htm
- [x] **Last updated**: 2026-01-25

### 2. SEC Filing Verification ✅
- [x] **CIK**: 0001829311
- [x] **Recent 8-Ks checked**: Jan 26, Jan 20, Jan 15, Jan 14, Jan 12
- [x] **10-K verified**: Filed Nov 21, 2025 (FY2025 ending Aug 31)
- [x] **10-Q verified**: Filed Jan 13, 2026 (Q1 FY2026 ending Nov 30)

### 3. XBRL Data Extraction ✅
- [x] **CryptoAssetNumberOfUnits**: 3,737,333 (Nov 30, 2025)
- [x] **CommonStockSharesOutstanding**: 408,578,823 (Nov 30, 2025)
- [x] **CryptoAssetCost**: $14.975B (Nov 30, 2025)

### 4. Fiscal Year Identification ✅
- [x] **Fiscal year end**: August 31 (not calendar year)
- [x] **Current quarter**: FY2026 Q2 (Dec-Feb)

### 5. Earnings Data Backfill ✅
| Quarter | Period End | Holdings | Shares | HPS | Source |
|---------|------------|----------|--------|-----|--------|
| FY25 Q3 | May 31, 2025 | 0 | 25M | 0 | 10-Q (pre-ETH) |
| FY25 Q4 | Aug 31, 2025 | 2,069,443 | 234.7M | 0.00882 | 10-K + 8-K |
| FY26 Q1 | Nov 30, 2025 | 3,737,333 | 408.6M | 0.00915 | 10-Q XBRL |

### 6. Holdings Per Share Growth ✅
- [x] **Q4→Q1 growth**: +3.7% (positive yield)
- [x] **Calculation verified**: HPS = holdings / shares

### 7. Non-Crypto Investments ✅
- [x] **Other investments**: $219M total
  - $200M Beast Industries (MrBeast)
  - $19M Eightco Holdings (OCTO)
- [x] **Treatment**: Excluded from mNAV (documented in strategy/notes)

### 8. Company Metadata ✅
- [x] **Strategy updated**: Includes non-crypto investments note
- [x] **Notes updated**: Lists Beast Industries + OCTO
- [x] **Staking info**: 85% staked, MAVAN validators

### 9. Dilutive Instruments ✅
- [x] **Warrants**: 129,375 @ $10 + 1,231,945 @ $5.40 (placement agent)
- [x] **Convertible notes**: None
- [x] **RSUs/Options**: 3,043,654 (NonOptionEquityInstrumentsOutstanding)
- [x] **Total potential dilution**: ~4.4M shares
- [x] **Added to dilutive-instruments.ts**: Yes

---

## CLSK (CleanSpark) - Verified 2026-01-28

### 1. Holdings Data ✅
- [x] **Current holdings**: 13,099 BTC
- [x] **Source**: SEC DEF 14A Jan 22, 2026
- [x] **Source URL**: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000827876&type=DEF+14A
- [x] **Last updated**: 2026-01-17

### 2. SEC Filing Verification ✅
- [x] **CIK**: 0000827876 (FIXED - was incorrectly 0001785459)
- [x] **Recent filings checked**: DEF 14A Jan 22, 10-K Nov 25, 8-K Nov 13
- [x] **Latest 10-K**: Filed Nov 25, 2025 (FY2025 ending Sep 30)
- [x] **Latest 10-Q**: Filed Aug 7, 2025 (FY Q3)

### 3. XBRL Data Extraction ✅
- [x] **EntityCommonStockSharesOutstanding**: 255,583,445 (10-K Nov 25, 2025)
- [x] **Note**: No CryptoAssetNumberOfUnits in XBRL - BTC from production updates

### 4. Fiscal Year Identification ✅
- [x] **Fiscal year end**: September 30
- [x] **Fiscal→Calendar mapping**: FY Q1=CY Q4(prior), FY Q2=CY Q1, FY Q3=CY Q2, FY Q4=CY Q3

### 5. Earnings Data ✅
| Calendar Q | Fiscal Q | Holdings | Shares | HPS | Status |
|------------|----------|----------|--------|-----|--------|
| Q2 2024 | FY24 Q3 | 6,154 | 173M | 0.0000356 | reported |
| Q3 2024 | FY24 Q4 | 8,049 | 199M | 0.0000404 | reported |
| Q4 2024 | FY25 Q1 | 6,061 | 243M | 0.0000249 | reported |
| Q1 2025 | FY25 Q2 | 6,100 | 263M | 0.0000232 | reported |
| Q2 2025 | FY25 Q3 | 8,049 | 276M | 0.0000292 | reported |
| Q3 2025 | FY25 Q4 | 10,556 | 310M | 0.0000341 | reported |
| Q4 2025 | FY26 Q1 | — | — | — | upcoming (Feb 5) |

**Note**: Shares in earnings use diluted count for HPS consistency

### 6. Holdings Per Share Growth ✅
- [x] **Q2→Q3 2025**: +17% (10,556 from 8,049 BTC, shares +12%)
- [x] **Trend**: Positive HPS growth despite significant dilution

### 7. Non-Crypto Investments ✅
- [x] **Cash reserves**: $43M (Sep 2025)
- [x] **Treatment**: Marked as restricted (operating capital for miner)

### 8. Company Metadata ✅
- [x] **Strategy accurate**: "Efficient US miner. 50 EH/s. DAM derivatives program."
- [x] **Debt accurate**: $1.7B ($550M 2030 + $1.15B 2032 converts)
- [x] **Leader**: Zach Bradford (CEO)

### 9. Dilutive Instruments ✅
- [x] **$550M 0% Convertible Notes due 2030** (Dec 2024)
  - Strike: ~$18.50 (estimated, needs verification)
  - Potential shares: ~29.7M
- [x] **$1.15B 0% Convertible Notes due 2032** (Nov 2025)
  - Strike: ~$15.50 (estimated, needs verification)
  - Potential shares: ~74.2M
- [x] **$400M BTC-backed credit** (largely undrawn, not dilutive)
- [x] **Added to dilutive-instruments.ts**: Yes

### Outstanding Items ⚠️
- [ ] Verify exact conversion prices from 8-K exhibits
- [ ] Reconcile earnings shares (diluted) vs XBRL basic shares

---

## HSDT (Solana Company) - Pending Verification

### Company Metadata Added 2026-01-29
- [x] **Website**: https://solanacompany.co
- [x] **X/Twitter**: https://x.com/SolanaCompany1
- [ ] **Holdings data**: Verify current SOL holdings (Oct 2025 shows 2.3M)
- [ ] **SEC filings**: Check for recent 8-Ks
- [ ] **Earnings data**: Backfill quarters
- [ ] **Dilutive instruments**: Document warrants/converts

---

## Verification Template (Copy for Next Company)

### Company: [TICKER] - Verification Date: YYYY-MM-DD

### 1. Holdings Data
- [ ] **Current holdings**: 
- [ ] **Source**: 
- [ ] **Source URL**: 
- [ ] **Last updated**: 
- [ ] **Check recent 8-Ks** for production updates / purchase announcements
- [ ] **Ensure current quarter isn't stale** — use 8-K data if more recent than 10-Q 

### 2. SEC Filing Verification
- [ ] **CIK**: 
- [ ] **Recent 8-Ks checked**: (Item 7.01/8.01 for holdings updates)
- [ ] **Latest 10-K**: 
- [ ] **Latest 10-Q**: 
- [ ] **8-K holdings data** pulled for current quarter (if available) 

### 3. XBRL Data Extraction
- [ ] **CryptoAssetNumberOfUnits**: 
- [ ] **CommonStockSharesOutstanding**: 
- [ ] **CryptoAssetCost** (if available): 

### 4. Fiscal Year Identification
- [ ] **Fiscal year end**: 
- [ ] **Current quarter**: 

### 5. Earnings Data Verification & Backfill

**A. Fiscal Year Mapping** (critical for non-calendar FY companies)
- [ ] **Fiscal year end identified**: (e.g., Sep 30, Dec 31)
- [ ] **FY→CY quarter mapping documented**: 
  - Example: FY Q1 (Oct-Dec) = CY Q4, FY Q2 (Jan-Mar) = CY Q1, etc.

**B. Historical Quarters (from SEC filings)**
- [ ] **Verify existing quarters** match SEC XBRL data
- [ ] **Backfill ALL available quarters** with holdings/shares/HPS
- [ ] **Use diluted shares** for HPS calculations (standard methodology)
- [ ] **Fix any discrepancies** between earnings-data.ts and XBRL
- [ ] **Sources**: 10-K (annual), 10-Q (quarterly), with SEC XBRL as primary

**C. Current Quarter (REQUIRED - don't leave empty)**
- [ ] **10-Q filed?** If yes, use XBRL data
- [ ] **If 10-Q not filed**, check for interim data:
  - [ ] 8-K filings (Item 7.01/8.01 for holdings updates)
  - [ ] Press releases / shareholder updates
  - [ ] Production reports (for miners)
  - [ ] Company IR website / dashboards
- [ ] **Add to earnings-data.ts** with status: "upcoming" and source noted
- [ ] **Add to holdings-history.ts** with date and source

**D. Staking Yield Verification** (for staking assets: SOL, ETH, etc.)
- [ ] **stakingPct** set in companies.ts (% of holdings staked)
- [ ] **stakingApy** set in companies.ts (current APY)
- [ ] **Holdings growth** matches expected staking yield:
  - Formula: `holdings × APY × (months/12)` ≈ observed growth
  - If growth significantly differs, investigate (purchases, sales, etc.)

| Quarter | Fiscal Q | Period End | Holdings | Shares (diluted) | HPS | Source |
|---------|----------|------------|----------|------------------|-----|--------|
| CY Q_ | FY Q_ | | | | | |

### 6. Holdings Per Share Growth
- [ ] **QoQ growth calculated**: 
- [ ] **Trend**: (positive/negative/flat)
- [ ] **Growth drivers identified**: (staking, purchases, dilution, etc.)

### 7. Non-Crypto Investments
- [ ] **Other investments**: 
- [ ] **Treatment in mNAV**: 

### 8. Company Metadata
- [ ] **Strategy accurate**: 
- [ ] **Notes accurate**: 
- [ ] **Staking info** (if applicable): 

### 9. Dilutive Instruments
- [ ] **Warrants**: 
- [ ] **Convertible notes**: 
- [ ] **Options**: 
