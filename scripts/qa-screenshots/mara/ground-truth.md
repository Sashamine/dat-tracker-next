# MARA Holdings — Ground Truth Data
**Ticker:** MARA (NASDAQ)
**CIK:** 0001507605
**Asset:** BTC
**Extraction Date:** 2026-02-14

---

## Step 1: Holdings Data

**Source:** https://ir.mara.com/news-events/press-releases/detail/1410/mara-announces-bitcoin-production-and-mining-operation-updates-forseptember-2025
**Value:** 52,850 BTC (total, including 17,357 BTC loaned/actively managed/pledged as collateral)
**Quote:** "As of September 30, 2025, the Company held a total of 52,850 BTC*. During the month, the Company's digital asset management activities resulted in a net sale of BTC. *Includes bitcoin that is loaned, actively managed or pledged as collateral"
**As-of date:** 2025-09-30
**Notes:** This is from the September 2025 monthly production update press release (filed Oct 3, 2025). The most recent production update available. Breakdown per 10-Q:
- Bitcoin (held directly): 35,493
- Bitcoin - receivable (loaned/managed/collateral): 17,357
- Other digital assets: 7,431 (negligible value)
- Cost basis: $4,645,104,000 (total BTC)
- Fair value: $6,032,190,000 (total digital assets including other)

**Additional Source:** 10-Q for Q3 2025 (filed 2025-11-04)
**Source URL:** https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm
**Quote from 10-Q:** "The Company held a total of 52,850 bitcoin, including 17,357 bitcoin loaned, actively managed or pledged as collateral"

---

## Step 2: SEC Filing Verification

**CIK:** 0001507605
**Company Name:** MARA Holdings, Inc. (formerly Marathon Digital Holdings, Inc.)

### Key Recent Filings:

| Filing | Date Filed | Period | Accession |
|--------|-----------|--------|-----------|
| 10-Q (Q3 2025) | 2025-11-04 | 2025-09-30 | 0001507605-25-000028 |
| 8-K (Q3 Earnings) | 2025-11-04 | 2025-11-04 | 0001507605-25-000026 |
| 8-K (Aug 2032 Notes) | 2025-07-28 | 2025-07-23 | 0000950142-25-002027 |
| 10-Q (Q2 2025) | 2025-07-29 | 2025-06-30 | 0001507605-25-000018 |
| 10-Q (Q1 2025) | 2025-05-08 | 2025-03-31 | 0001507605-25-000009 |
| 10-K (FY 2024) | 2025-03-03 | 2024-12-31 | 0001507605-25-000003 |
| 10-Q (Q3 2024) | 2024-11-12 | 2024-09-30 | 0001628280-24-047148 |

### Recent 8-Ks of Interest:
- **2025-11-04** (Items 2.02, 9.01): Q3 2025 earnings release + shareholder letter
- **2025-08-11** (Items 1.01, 7.01, 9.01): EDF Pulse/Exaion partnership
- **2025-07-28** (Items 1.01, 2.03, 3.02, 7.01, 9.01): **August 2032 Convertible Notes offering** — $950M→$1.025B (with overallotment)
- **2025-02-26** (Items 2.02, 9.01): Q4 2024 / FY2024 earnings release

**Notes:** No production updates filed as 8-Ks after September 2025 through Feb 2026. Production updates are press releases on IR page, not always filed as 8-Ks.

---

## Step 3: XBRL Data Extraction

**Source:** 10-Q for Q3 2025 (period ending 2025-09-30)
**Source URL:** https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm

### Digital Assets (XBRL)
| Metric | Q3 2025 (9/30/2025) | FY 2024 (12/31/2024) |
|--------|---------------------|----------------------|
| Bitcoin (direct) - Quantity | 35,493 | 34,519 |
| Bitcoin - receivable - Quantity | 17,357 | 10,374 |
| **Total BTC holdings** | **52,850** | **44,893** |
| Cost Basis (total BTC, $K) | $4,637,673 | $2,817,297 |
| Fair Value (total BTC, $K) | $6,028,478 | $4,192,425 |
| Other digital assets - Quantity | 7,431 | 34,817,098 (Kaspa) |

### Shares Outstanding (Cover Page)
**EntityCommonStockSharesOutstanding:** 378,184,353
**As-of date:** Per 10-Q cover page (filed 2025-11-04)

### Balance Sheet (from FMP/XBRL, Q3 2025)
| Metric | Value |
|--------|-------|
| Cash & Cash Equivalents | $826,392,000 |
| Total Current Assets | $961,922,000 |
| Total Assets | $9,153,377,000 |
| Long-Term Debt | $3,247,561,000 |
| Short-Term Debt (Line of Credit current) | $350,000,000 |
| **Total Debt** | **$3,642,472,000** |
| Total Stockholders' Equity | $5,158,336,000 |
| Preferred Stock | $0 |
| Minority Interest | $16,676,000 |

### Income Statement (Q3 2025)
| Metric | Value |
|--------|-------|
| Revenue | $252,410,000 |
| Cost of Revenue | $43,080,000 |
| **G&A Expenses** | **$85,296,000** |
| Net Income | $123,134,000 |
| Weighted Avg Shares (Basic) | 372,073,173 |
| Weighted Avg Shares (Diluted) | 470,126,290 |
| EPS (Basic) | $0.33 |
| EPS (Diluted) | $0.27 |

---

## Step 4: Fiscal Year Identification

**FY End Date:** December 31
**Current Fiscal Year:** FY 2025
**Most Recent Reported Quarter:** Q3 2025 (period ending September 30, 2025)
**10-Q Filed:** November 4, 2025
**Next Expected Filing:** Q4 2025 / FY 2025 10-K (expected late Feb / early Mar 2026)
**Notes:** FY 2024 10-K was filed March 3, 2025. Q4 2025 10-K not yet filed as of 2026-02-14.

---

## Step 5: Earnings Data & Backfill

### Quarterly Holdings, Shares, and HPS

| Quarter | Period End | BTC Holdings | Shares Outstanding (Basic) | HPS | Source |
|---------|-----------|-------------|---------------------------|-----|--------|
| Q3 2024 | 2024-09-30 | 26,747 | 321,831,487 | 0.00008311 | 10-Q (0001628280-24-047148) |
| Q4 2024 | 2024-12-31 | 44,893 | 345,816,827 | 0.00012981 | 10-K (0001507605-25-000003) |
| Q1 2025 | 2025-03-31 | 47,531 | 351,927,748 | 0.00013508 | 10-Q (0001507605-25-000009) |
| Q2 2025 | 2025-06-30 | 49,951 | 370,457,880 | 0.00013484 | 10-Q (0001507605-25-000018) |
| Q3 2025 | 2025-09-30 | 52,850 | 378,184,353 | 0.00013975 | 10-Q (0001507605-25-000028) |

### Holdings Breakdown by Quarter

| Quarter | BTC (direct) | BTC (receivable) | Total BTC |
|---------|-------------|------------------|-----------|
| Q3 2024 | 26,747 | N/A (pre-lending) | 26,747 |
| Q4 2024 | 34,519 | 10,374 | 44,893 |
| Q1 2025 | 33,263 | 14,269 | 47,531 |
| Q2 2025 | 34,401 | 15,550 | 49,951 |
| Q3 2025 | 35,493 | 17,357 | 52,850 |

### Shares Source Notes:
- All shares are from **EntityCommonStockSharesOutstanding** on 10-Q/10-K cover page (BASIC shares)
- Weighted average basic shares (for EPS): Q3'24=294,943K, Q4'24=388,689K, Q1'25=344,098K, Q2'25=352,902K, Q3'25=372,073K
- For sharesForMnav, use the cover page shares (point-in-time), NOT weighted average

### G&A (Quarterly Burn)
| Quarter | G&A ($) | Source |
|---------|---------|--------|
| Q3 2024 | $63,725,000 | 10-Q |
| Q4 2024 | $77,924,000 | 10-K |
| Q1 2025 | $85,865,000 | 10-Q |
| Q2 2025 | $92,948,000 | 10-Q |
| Q3 2025 | $85,296,000 | 10-Q |

**Notes:** Burn = G&A only (excludes mining COGS per methodology). G&A includes stock-based compensation.

---

## Step 6: Holdings Per Share Growth

### QoQ HPS Growth

| Quarter | HPS | QoQ Change | QoQ % |
|---------|-----|------------|-------|
| Q3 2024 | 0.00008311 | — | — |
| Q4 2024 | 0.00012981 | +0.00004670 | +56.2% |
| Q1 2025 | 0.00013508 | +0.00000527 | +4.1% |
| Q2 2025 | 0.00013484 | -0.00000024 | -0.2% |
| Q3 2025 | 0.00013975 | +0.00000491 | +3.6% |

**Trend Analysis:**
- Massive jump in Q4 2024 (+56%) driven by aggressive BTC purchases (used convertible note proceeds from Nov/Dec 2024 offerings)
- Q1-Q3 2025: Relatively flat HPS growth despite continued BTC accumulation, because share dilution from ATM offerings (~35M shares sold via ATM through Q3 2025) largely offset BTC gains
- Q2 2025 was slightly negative HPS growth: share issuance via ATM outpaced BTC accumulation that quarter
- Overall trend: BTC holdings growing faster than dilution, but only marginally

---

## Step 7: Non-Crypto Investments

**Source:** 10-Q Q3 2025 balance sheet
**Long-Term Investments:** $137,137,000 (as of 9/30/2025)
**Other Non-Current Assets:** $6,394,846,000 (includes digital assets at fair value reclassified here)

**Key Non-Crypto Assets:**
1. **Property, Plant & Equipment:** $1,575,925,000 (mining infrastructure)
2. **Goodwill:** $82,776,000 (from acquisitions)
3. **ADGM Entity (equity method investee):** MARA has an equity method investment in an Abu Dhabi entity
4. **Kaspa (KAS):** 7,431 units as of Q3 2025 (negligible, $3,712 cost basis); previously held 34.8M Kaspa at end of 2024

**Treatment in mNAV:**
- Mining infrastructure (PP&E) is NOT included in CryptoNAV — it's the operational business
- Only BTC holdings count toward CryptoNAV
- Kaspa is immaterial and can be ignored
- The ADGM entity's BTC (11 BTC pending) is excluded from MARA's stated holdings

---

## Step 8: Company Metadata

**Company Name:** MARA Holdings, Inc. (formerly Marathon Digital Holdings, Inc.)
**Headquarters:** 1010 South Federal Highway, Suite 2700, Hallandale Beach, FL 33009
**CEO:** Frederick G. Thiel (Chairman & CEO)
**Employees:** ~171 (per FMP profile)
**Exchange:** NASDAQ Capital Market
**SIC Code:** 6199

### Strategy Description:
MARA is a Bitcoin miner with a HODL strategy that also acquires BTC via market purchases funded by convertible note proceeds. Key pillars:
1. **Bitcoin Mining:** Operate global fleet converting energy to BTC; 60.4 EH/s energized hashrate (Q3 2025)
2. **BTC Treasury:** Hold BTC on balance sheet as store of value; 52,850 BTC as of 9/30/2025
3. **Digital Asset Management:** Loan/manage portion of BTC holdings for yield (17,357 BTC in receivable/managed)
4. **AI/HPC Expansion:** Planning to leverage energy infrastructure for AI inference data centers
5. **Convertible Note Strategy:** Issue zero-coupon convertible notes to fund BTC purchases

### Operational Metrics (Q3 2025):
- Energized Hashrate: 60.4 EH/s
- BTC Produced (Q3): 2,144 BTC (mined) + 2,257 BTC (purchased)
- Blocks Won (Q3): 633
- Cost per BTC mined (purchased energy): $39,235
- Cost per kWh: $0.04
- Monthly Production (Sep 2025): 736 BTC mined, 218 blocks won

### Staking/Lending:
- 17,357 BTC loaned, actively managed, or pledged as collateral (as of 9/30/2025)
- Earns investment income from SMA (separately managed account)
- 5,077 BTC in SMA under active management
- Bitcoin lending/management activities contribute to revenue

---

## Step 9: Dilutive Instruments

**Source:** 10-Q Q3 2025, Note 14 (Debt section)
**Source URL:** https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm

### Convertible Senior Notes (5 tranches):

| Note | Issuance Date | Maturity | Principal Outstanding | Interest Rate | Conversion Price | Conversion Rate (per $1,000) |
|------|---------------|----------|----------------------|---------------|-----------------|------------------------------|
| December 2026 Notes | Nov 2021 | Dec 1, 2026 | $48,077,000 | 1.0% | $76.17 | 13.1277 |
| September 2031 Notes | Aug 2024 | Sep 1, 2031 | $300,000,000 | 2.125% | $18.89 | 52.9451 |
| March 2030 Notes | Nov 2024 | Mar 1, 2030 | $1,000,000,000 | 0.0% | $25.91 | 38.5902 |
| June 2031 Notes | Dec 2024 | Jun 1, 2031 | $925,000,000 | 0.0% | $34.58 | 28.9159 |
| August 2032 Notes | Jul 2025 | Aug 1, 2032 | $1,025,000,000 | 0.0% | $20.26 | 49.3619 |

**Total Convertible Notes Outstanding:** ~$3,298,077,000

### Dilutive Shares from Convertibles (if all converted):

| Note | Principal ($K) | Conv Rate | Potential Shares |
|------|---------------|-----------|-----------------|
| Dec 2026 | $48,077 | 13.1277 | 631,265 |
| Sep 2031 | $300,000 | 52.9451 | 15,883,530 |
| Mar 2030 | $1,000,000 | 38.5902 | 38,590,200 |
| Jun 2031 | $925,000 | 28.9159 | 26,747,208 |
| Aug 2032 | $1,025,000 | 49.3619 | 50,596,048 |
| **Total** | | | **132,448,251** |

### Line of Credit:
- $350,000,000 outstanding (current portion, due within 12 months)
- This is NOT convertible — pure debt

### ATM (At-the-Market) Programs:
- **2025 ATM:** Up to $2.0 billion aggregate offering price
- **2024 ATM:** Was up to $1.5 billion (replaced by 2025 ATM)
- As of 9/30/2025: Sold 35,339,308 shares via ATM for $571M

### Stock-Based Compensation:
- Dilutive shares from convertible notes: 20,224,952 (per dilutive shares table in 10-Q)
- Performance-based RSUs: up to 324,375 shares (anti-dilutive as of Q3 2025)

### Summary for DAT Tracker:
For dilutive-instruments.ts, key entries:
1. **Sep 2031 Converts:** 15,883,530 shares at $18.89 strike, exp Sep 2031
2. **Mar 2030 Converts:** 38,590,200 shares at $25.91 strike, exp Mar 2030
3. **Jun 2031 Converts:** 26,747,208 shares at $34.58 strike, exp Jun 2031
4. **Aug 2032 Converts:** 50,596,048 shares at $20.26 strike, exp Aug 2032
5. **Dec 2026 Converts:** 631,265 shares at $76.17 strike, exp Dec 2026 (far OTM at current $7.92)

**Capped Call:** MARA entered capped call transactions on the August 2032 Notes (~$36.9M cost), which partially offsets dilution. The capped call details (cap price) not fully disclosed in the 8-K but typically set at a premium above conversion price.

---

## Step 10: Company Links

- **Website:** https://www.mara.com
- **Investor Relations:** https://ir.mara.com
- **SEC Filings:** https://ir.mara.com/sec-filings/all-sec-filings
- **Press Releases:** https://ir.mara.com/news-events/press-releases
- **Twitter/X:** https://x.com/MAaboratoryHQ (Note: MARA Holdings uses @MARAHoldings on X — verify handle)
- **10-Q (latest):** https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm
- **10-K (FY 2024):** https://www.sec.gov/Archives/edgar/data/1507605/000150760525000003/mara-20241231.htm

---

## Step 11: mNAV Calculation

### Current Market Data (as of 2026-02-14):
- **Stock Price:** $7.92 (from FMP profile)
- **Shares Outstanding:** 378,184,353 (cover page Q3 2025 10-Q)
- **Market Cap:** $2,995,220,076 (from FMP; = $7.92 × 378,184,353)
- **BTC Price:** Need current BTC price for live calculation

### Inputs:
| Component | Value | Source |
|-----------|-------|--------|
| Shares Outstanding | 378,184,353 | 10-Q cover page |
| Stock Price | $7.92 | FMP (2026-02-14) |
| Market Cap | $2,995,220,076 | Price × Shares |
| Total Debt | $3,642,472,000 | FMP balance sheet Q3 2025 |
| Preferred Equity | $0 | Balance sheet |
| Cash & Equivalents | $826,392,000 | Balance sheet Q3 2025 |
| BTC Holdings | 52,850 | 10-Q / production update |

### Cash Treatment:
MARA's cash ($826M) is substantial. Treatment:
- MARA uses cash for mining operations, debt service, and BTC purchases
- Not "excess cash" — MARA actively deploys cash for BTC acquisition
- **Conservative approach:** Treat as neutral (don't subtract from EV, don't add to CryptoNAV)
- **Note:** $350M of cash effectively offsets the $350M line of credit (current portion)

### Calculation (using live BTC price $69,540 as of 2026-02-14):
```
EV = marketCap + totalDebt + preferredEquity - excessCash
EV = $2,995,220,076 + $3,642,472,000 + $0 - $0
EV = $6,637,692,076

CryptoNAV = holdings × BTCprice
CryptoNAV = 52,850 × $69,540 = $3,676,179,000

mNAV = EV / CryptoNAV
mNAV = $6,637,692,076 / $3,676,179,000 = 1.806
```

### Important Notes on mNAV:
1. **Debt is massive** ($3.6B) — this is the key difference from pure treasury companies. MARA's EV is nearly double its market cap due to convertible debt.
2. **Most debt is zero-coupon convertibles** — if BTC price rises, converts become ITM and dilute shares (already reflected in dilutive instruments)
3. **The "double counting" issue:** Convertible notes both add to EV (as debt) AND dilute shares (if ITM). For mNAV, we use basic shares + add debt. When converts are ITM, the diluted share approach would be: more shares but less debt (net settles). The current approach (basic shares + full debt) is conservative.
4. **Cash treatment matters:** If we subtract excess cash, mNAV drops. But MARA's cash isn't truly "excess" — it's working capital + deployment capital.
5. **At current price ($7.92):** ALL converts are OTM (lowest strike is $18.89 for Sep 2031 Notes, vs stock at $7.92). This means the debt overhang is real — converts won't be exercised at $7.92. The convertibles function purely as debt at current prices.

### mNAV Sensitivity:
| BTC Price | CryptoNAV | mNAV |
|-----------|-----------|------|
| $60,000 | $3,171,000,000 | 2.09 |
| $69,540 | $3,676,179,000 | **1.81** |
| $80,000 | $4,228,000,000 | 1.57 |
| $90,000 | $4,756,500,000 | 1.40 |
| $100,000 | $5,285,000,000 | 1.26 |
| $110,000 | $5,813,500,000 | 1.14 |

---

## Summary

| Metric | Value | Source | As-Of |
|--------|-------|--------|-------|
| BTC Holdings | 52,850 | 10-Q + Production Update | 2025-09-30 |
| Shares Outstanding | 378,184,353 | 10-Q Cover Page | 2025-09-30 |
| Total Debt | $3,642,472,000 | FMP Balance Sheet / 10-Q | 2025-09-30 |
| Cash & Equivalents | $826,392,000 | FMP Balance Sheet / 10-Q | 2025-09-30 |
| Cost Basis (avg per BTC) | ~$87,826 ($4,637,673K / 52,850) | 10-Q | 2025-09-30 |
| Quarterly Burn (G&A) | $85,296,000 | 10-Q Income Statement | Q3 2025 |
| Preferred Equity | $0 | Balance Sheet | 2025-09-30 |
| Dilutive Instruments | 132,448,251 potential shares (5 convertible tranches) | 10-Q Note 14 | 2025-09-30 |
| mNAV (calculated @ $69,540 BTC) | ~1.81 | Calculated | 2026-02-14 |

### Key Filing URLs:
| Document | URL |
|----------|-----|
| 10-Q Q3 2025 | https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm |
| 10-K FY 2024 | https://www.sec.gov/Archives/edgar/data/1507605/000150760525000003/mara-20241231.htm |
| Q3 2025 Shareholder Letter | https://www.sec.gov/Archives/edgar/data/1507605/000150760525000026/q325shareholderletter.htm |
| Aug 2032 Notes 8-K | https://www.sec.gov/Archives/edgar/data/1507605/000095014225002027/eh250659491_8k.htm |
| Sep 2025 Production Update | https://ir.mara.com/news-events/press-releases/detail/1410/mara-announces-bitcoin-production-and-mining-operation-updates-forseptember-2025 |
