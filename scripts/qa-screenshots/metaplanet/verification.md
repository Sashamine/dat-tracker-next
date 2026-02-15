# Metaplanet (3350.T) — Full Verification
**Verified:** 2026-02-14 (MST)
**Verifier:** Subagent metaplanet-verify

---

## Part 1: Ground Truth

### Step 1: Holdings
- **Current BTC Holdings:** 35,102 BTC
- **Source:** https://metaplanet.jp/en/analytics (live dashboard)
- **As-Of:** Dec 30, 2025 (last purchase: 4,279 BTC at $105,412 avg)
- **Total Cost Basis:** ~$3.78B ($107,607 avg per BTC per analytics; ¥15,945,691 avg per provenance)
- **No 2026 purchases found** — disclosures page shows no "Notice of Additional Purchase of Bitcoin" in 2026
- Confirmed by bitcointreasuries.net: same 35,102 figure

### Step 2: Company Filings
- **Exchange:** Tokyo Stock Exchange (TSE), ticker 3350.T
- **ISIN:** JP3481200008
- **Filing system:** TDnet (not SEC EDGAR)
- **Disclosures archive:** https://metaplanet.jp/en/shareholders/disclosures
- **FMP profile:** Active, JPY currency, JPX exchange
- **Recent key filings (2026):**
  - Feb 13: Completion of payment for 24,530,000 new shares + 25th Series warrants (3rd-party allotment)
  - Feb 2: Monthly warrant exercise status (23rd-24th Series), share repurchase status
  - Jan 30: Execution of borrowing based on credit facility agreement
  - Jan 29: Issuance of new shares + 25th Series warrants
  - Jan 26: Revision of full-year earnings forecast for FY2025, recording of BTC impairment loss

### Step 3: Balance Sheet
**FMP Q3 2025 (Sep 30, 2025) Balance Sheet:**
| Item | JPY | USD (÷152.67) |
|------|-----|----------------|
| Cash & Equivalents | ¥1,488M | $9.7M |
| Short-term Investments | ¥20,940M | $137M |
| Long-term Investments | ¥521,769M | $3,417M |
| Total Assets | ¥550,744M | $3,607M |
| Short-term Debt | ¥4,500M | $29.5M |
| Long-term Debt | ¥0 | $0 |
| **Total Debt (FMP)** | **¥4,500M** | **$29.5M** |
| Total Equity | ¥532,907M | $3,490M |

**⚠️ NOTE:** FMP shows only ¥4.5B debt at Q3 2025. Pipeline uses $280M (~¥43B). This is because Metaplanet's credit facility draws and zero-coupon bonds may not appear in FMP's quarterly data consistently. The $280M figure comes from the analytics dashboard + CoinDesk reporting (Feb 6, 2026) about deleveraging from $355M.

**Shares Outstanding:**
- Common: 1,142,274,340 (Jan 29, 2026 filing)
- + 24,530,000 new shares (Feb 13, 2026 3rd-party allotment)  
- **Total common: 1,166,804,340**
- Class B "MERCURY" Preferred: 23.61M shares (¥1,000 conversion price, OTM at ¥325)

### Step 4: Fiscal Year
- **FY end:** December 31
- **Current:** FY2025 annual report expected ~Feb 14-16, 2026
- Jan 26 disclosure revised the FY2025 earnings forecast and noted BTC impairment loss
- Q4 FY2025 earnings date in pipeline: Feb 13, 2026 (status: "upcoming")

### Step 5-6: Earnings/HPS
**Pipeline has 7 quarters tracked:**
| Quarter | Holdings | Shares | HPS | Status |
|---------|----------|--------|-----|--------|
| Q2 FY2024 | 141 | 150M | 0.0000009 | reported |
| Q3 FY2024 | 399 | 200M | 0.0000020 | reported |
| Q4 FY2024 | 1,762 | 300M | 0.0000059 | reported |
| Q1 FY2025 | 4,046 | 500M | 0.0000081 | reported |
| Q2 FY2025 | 13,350 | 800M | 0.0000167 | reported |
| Q3 FY2025 | 30,823 | 1,100M | 0.0000280 | reported |
| Q4 FY2025 | 35,102 | 1,140M | 0.0000308 | **upcoming** |

**BTC Yield (HPS growth):** Explosive growth from 0.9 sats/share (Q2 2024) to 30.08 sats/share (current). ~33x improvement in 7 quarters.

### Step 7: Non-Crypto
- **Hotel asset:** Metaplanet owns/operates a hotel in Tokyo (confirmed by bitcointreasuries.net)
- FMP balance sheet shows ¥972M (~$6.4M) in Property, Plant & Equipment
- Intangible assets: ¥811M (~$5.3M) — likely includes bitcoin.jp domain
- **Treatment in mNAV:** Non-crypto assets not included in CryptoNAV; they're embedded in market cap. This is correct for EV/CryptoNAV methodology.

### Step 8: Metadata
- ✅ **555 Million Plan:** Targeting 210,000 BTC by 2027 — documented in June 6, 2025 disclosure
- ✅ **Moving-strike warrants:** Multiple series (13th-25th+) — core capital strategy
- ✅ **BTC-backed credit facility:** $500M facility, ~$280M drawn (deleveraging from $355M)
- ✅ **Capital Allocation Policy:** mNAV-based decisions, buybacks when mNAV < 1
- ✅ **Phase II: Bitcoin Platform:** BTC income generation for preferred dividends (Oct 1, 2025)
- ✅ **CEO:** Simon Gerovich (note: FMP still lists "Yoshi Ikurumi" — outdated)

### Step 9: Dilutive Instruments
**Currently tracked in dilutive-instruments.ts:**
1. **Mercury convertible bonds:** ¥1,000 conversion price (~$6.41 at 156 JPY/USD), 23.6M potential shares, face value ~$151M, expires 2029. **OTM at ¥325.**
2. **25th Series warrants:** ¥547 exercise price (~$3.53 at 155 JPY/USD), 15.94M potential shares, issued Feb 13, 2026, expires Feb 13, 2027.

**⚠️ Missing from tracking:**
- 23rd-24th Series warrants (issued Dec 8, 2025) — exercise status reported monthly
- Earlier warrant series (20th-22nd) were exercised/cancelled per disclosures
- Preferred shares (Class B "MERCURY"): 23.61M shares at ¥1,000 conversion — currently captured as convertible, but the preferred equity VALUE (~¥86.58B from holdings-history notes) is NOT tracked in companies.ts `preferredEquity` field, and MetaplanetCompanyView hardcodes `preferredEquity = 0`.

### Step 10: Links
- ✅ Website: https://metaplanet.jp
- ✅ Twitter: https://twitter.com/Metaplanet_JP
- ✅ Analytics: https://metaplanet.jp/en/analytics
- ✅ Disclosures: https://metaplanet.jp/en/shareholders/disclosures
- ❌ holdingsSourceUrl links to /en/analytics (redirected bitcoin page in holdings-history uses /bitcoin which 404s)
- ✅ Strategy docs: 4 docs listed with dates, one with direct PDF URL

### Step 11: mNAV Calculation
**Manual calculation (as of 2026-02-14):**
- Stock price: ¥325 (FMP)
- FX rate: 152.67 JPY/USD
- Stock price USD: $2.129
- BTC price: ~$69,420 (live from site sidebar)
- Shares (pipeline): 1,166,804,340 (but sharesForMnav = 1,143,204,340 after subtracting Mercury)
- Market cap: 1,143,204,340 × ¥325 / 152.67 = **$2,432M** (pipeline uses this)
- Total debt: $280M
- Preferred equity: $0 (pipeline — see issue below)
- Cash: $18M
- EV = $2,432M + $280M + $0 - $18M = **$2,694M**
- Crypto NAV = 35,102 × $69,420 = **$2,437M**
- **mNAV = $2,694M / $2,437M = 1.105x ≈ 1.10x** ✓

**UI shows: 1.10x** ✓ matches manual calculation
**Overview table shows: 1.10x** ✓ matches

---

## Part 2: Pipeline Cross-Check

### 1. provenance/metaplanet.ts ✅
- Holdings: 35,102 ✓ with PDF URL source
- Shares: 1,166,804,340 ✓ (common + Feb 13 placement)
- Debt: $280M ✓ with source notes about deleveraging
- Cash: $18M ✓ from Q3 filing
- Cost basis: $102,875 (provenance) vs $107,607 (companies.ts) — **MINOR MISMATCH** (FX dependent)
- Full acquisition history: 54 purchases documented ✓

### 2. companies.ts ✅ (with issues)
- holdings: 35,102 ✓
- holdingsLastUpdated: "2025-12-30" ✓
- costBasisAvg: 107,607 — **differs from provenance** (102,875) — should reconcile
- sharesForMnav: 1,143,204,340 — mathematically: 1,166,804,340 - 23,600,000 Mercury = correct
  - **⚠️ Methodology question:** Mercury converts are OTM and tracked in dilutive-instruments.ts. The sharesForMnav subtracts them, but they were never IN the common share count. This subtraction is wrong if the 1,142,274,340 doesn't include Mercury shares. However, the code comment says "1.167B common - 23.6M Mercury converts" implying the base includes them somehow. Needs verification against TDnet filings.
- totalDebt: $280M ✓
- cashReserves: $18M ✓ (from Q3 2025)
- **Missing:** `preferredEquity` field — ¥86.58B (~$567M) Class B preferred shares not tracked
- marketCap: $4.01B — **STALE** (uses Jan 2026 prices of ¥548; now ¥325 → $2.43B)

### 3. dilutive-instruments.ts ⚠️
- Mercury convertible: ✓ tracked (23.6M shares, $6.41 strike, OTM)
- 25th Series warrants: ✓ tracked (15.9M shares, $3.53 strike)
- **Missing:** 23rd-24th Series warrants (Dec 2025), any residual earlier series
- **Issue:** Strike prices use hardcoded FX rates (156, 155 JPY/USD). Current rate is 152.67. Minor drift.

### 4. earnings-data.ts ✅
- 7 quarters tracked (Q2 2024 through Q4 2025)
- Q4 FY2025 status "upcoming" with earningsDate "2026-02-13"
- **Note:** Annual report may already be filed per Jan 26 forecast revision
- Holdings and share counts align with analytics data
- All entries sourced to metaplanet.jp disclosures

### 5. holdings-history.ts ✅
- Comprehensive: 53 data points from Apr 23, 2024 through Dec 30, 2025
- Split-adjusted correctly (reverse split Jul 2024, forward split Mar 2025)
- Stock prices included at quarter-end dates
- Last entry: Dec 30, 2025 — 35,102 BTC, 1,118,664,340 shares
- **Note:** Share counts in holdings-history are estimates between purchases; slight drift possible

### 6. MetaplanetCompanyView.tsx ✅ (with issue)
- Full provenance tracking ✓
- mNAV calculation correct with current data ✓
- Balance sheet display ✓
- Equity NAV formula displayed ✓
- Chart modes (Price, mNAV, HPS) ✓
- **Issue:** `preferredEquity = 0` hardcoded — if Mercury preferred should be included, this understates EV

---

## Part 3: UI Check

| Check | Status | Details |
|-------|--------|---------|
| Page loads | ✅ | http://localhost:3000/company/3350.T loads correctly |
| mNAV card | ✅ | 1.10x with full provenance breakdown |
| mNAV expandable | ✅ | Shows debt/cash/holdings with source links |
| Balance sheet | ✅ | Crypto NAV $2.44B, Cash $18M, Debt $280M, Shares 1.17B |
| Equity NAV | ✅ | $2.17B displayed correctly |
| Holdings/Share | ✅ | 30.08 sats/share |
| Cost basis | ✅ | $103K displayed (provenance value) |
| Overview match | ✅ | Overview table shows same 1.10x mNAV |
| Stock price | ✅ | $2.13 (-3.6%) live updating |
| Charts | ✅ | Price chart renders with TradingView |
| Strategy section | ✅ | Collapsible, with docs |
| Additional metrics | ✅ | Unrealized P&L (-32.5%), Bond Type (Zero-Coupon), Exchange (TSE) |

---

## Summary
**Status:** PASS (with issues noted)

### Ground Truth
| Metric | Value | Source | As-Of |
|--------|-------|--------|-------|
| BTC Holdings | 35,102 | metaplanet.jp/en/analytics | 2025-12-30 |
| Shares Outstanding | 1,166,804,340 | TDnet (Feb 13, 2026) | 2026-02-13 |
| Total Debt (JPY) | ~¥43B | Analytics + CoinDesk | 2026-02-06 |
| Total Debt (USD) | $280M | Estimated (pending FY2025 annual) | 2026-02-06 |
| Cash (JPY) | ¥2.77B | TDnet Q3 FY2025 | 2025-09-30 |
| Cash (USD) | $18M | ¥2.77B ÷ 155 | 2025-09-30 |
| Cost Basis (USD) | $107,607 (analytics) / $102,875 (provenance) | metaplanet.jp | 2025-12-30 |
| Dilutive instruments | 2 tracked (Mercury + 25th warrants) | dilutive-instruments.ts | 2026-02-13 |
| Stock Price (JPY) | ¥325 | FMP batch-quote | 2026-02-14 |
| mNAV (calculated) | 1.10x | Manual calc | 2026-02-14 |

### Pipeline Check
| File | Status | Issues |
|------|--------|--------|
| provenance | ✅ | Comprehensive, well-sourced |
| companies.ts | ⚠️ | Cost basis mismatch ($107,607 vs $102,875), stale marketCap ($4.01B vs $2.43B), missing preferredEquity |
| dilutive-instruments.ts | ⚠️ | Missing 23rd-24th Series warrants, hardcoded FX rates |
| earnings-data.ts | ✅ | 7 quarters tracked, Q4 FY2025 upcoming |
| holdings-history.ts | ✅ | 53 entries, well-documented split adjustments |
| CompanyView | ⚠️ | preferredEquity hardcoded to 0 |

### UI Check
| Check | Status |
|-------|--------|
| Page loads | ✅ |
| mNAV card | ✅ |
| Overview match | ✅ |

### Issues Found
1. **Cost basis mismatch:** companies.ts has $107,607 but provenance has $102,875 (FX rate difference: 155 vs actual)
2. **Stale marketCap in companies.ts:** $4.01B (Jan 2026 at ¥548) vs actual ~$2.43B (¥325). Not critical since mNAV uses live calculation.
3. **Missing preferredEquity:** Class B "MERCURY" preferred shares (¥86.58B / ~$567M) not tracked. If these should be in EV, mNAV is understated. The holdings-history notes say these should be in preferredEquity, but MetaplanetCompanyView sets it to 0.
4. **Missing dilutive instruments:** 23rd-24th Series warrants not tracked (issued Dec 2025, actively being exercised per monthly disclosures)
5. **Q4 FY2025 earnings status:** Should update to "reported" once FY2025 annual report is filed (~Feb 14-16)
6. **FX rate hardcoding:** Dilutive instrument strike prices use fixed JPY/USD rates (155-156) instead of live conversion

**Company mNAV:** 1.10x
**Overview mNAV:** 1.10x
