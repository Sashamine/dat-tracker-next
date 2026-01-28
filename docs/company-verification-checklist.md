# Company Verification Checklist

## Overview
Systematic verification process for DAT company data quality.

## Future Considerations
- **LsETH / Liquid Staking Tokens**: Currently counted at "as-if redeemed" value (1:1 with ETH). Consider whether to apply haircut for protocol/counterparty risk, or track native vs staked separately. Relevant for SBET (~26% LsETH), potentially others.

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

## Verification Template (Copy for Next Company)

### Company: [TICKER] - Verification Date: YYYY-MM-DD

### 1. Holdings Data
- [ ] **Current holdings**: 
- [ ] **Source**: 
- [ ] **Source URL**: 
- [ ] **Last updated**: 

### 2. SEC Filing Verification
- [ ] **CIK**: 
- [ ] **Recent 8-Ks checked**: 
- [ ] **Latest 10-K**: 
- [ ] **Latest 10-Q**: 

### 3. XBRL Data Extraction
- [ ] **CryptoAssetNumberOfUnits**: 
- [ ] **CommonStockSharesOutstanding**: 
- [ ] **CryptoAssetCost** (if available): 

### 4. Fiscal Year Identification
- [ ] **Fiscal year end**: 
- [ ] **Current quarter**: 

### 5. Earnings Data Backfill
| Quarter | Period End | Holdings | Shares | HPS | Source |
|---------|------------|----------|--------|-----|--------|
| | | | | | |

### 6. Holdings Per Share Growth
- [ ] **QoQ growth calculated**: 
- [ ] **Trend**: (positive/negative/flat)

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
