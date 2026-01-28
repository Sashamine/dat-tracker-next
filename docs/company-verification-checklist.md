# Company Verification Checklist

## Overview
Systematic verification process for DAT company data quality.

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
