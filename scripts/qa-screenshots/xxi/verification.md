# XXI (Twenty One Capital) — Full Verification
**Date:** 2026-02-14
**Verifier:** Automated (Claude subagent)

---

## Part 1: Ground Truth (11-Step)

### Step 1: Holdings
**BTC Holdings: 43,514 BTC** (as of merger close Dec 9, 2025)

**Breakdown (from 8-K Dec 12, 2025, EX-99.4 proforma):**
| Source | BTC | Notes |
|--------|-----|-------|
| Tether Contribution | 24,500 | For 208 Class A + 208 Class B interests |
| Bitfinex Contribution | 7,000 | For Class A + Class B interests |
| Initial PIPE BTC (Tether) | 4,812.22 | $458.7M from convertible notes proceeds |
| Option PIPE BTC (Tether) | 917.47 | $99.5M from option notes proceeds |
| June PIPE BTC (Tether) | 1,381.16 | $147.5M from June PIPE proceeds |
| Additional PIPE BTC (Tether) | 4,422.69 | Top-up to reach 10,500 BTC PIPE target |
| April In-Kind PIPE | 259.24 | BTC from equity PIPE investors (in-kind) |
| June In-Kind PIPE | 132.95 | BTC from June equity PIPE investors |
| Tether Difference (clerical fix) | 88.38 | Tether contributed extra to fix clerical error |
| **Total** | **~43,514** | |

**Source:** SEC 8-K filed Dec 12, 2025 (CIK 0002070457, accession 0001213900-25-121293)
- Main 8-K: `ea0269460-8k_twenty.htm`
- Proforma financials: `ea026946001ex99-4_twenty.htm`

**Post-merger BTC purchases:** No 8-K filings indicate additional BTC purchases since merger close.

### Step 2: SEC Filings
**Post-merger filings (CIK 0002070457):**

| Date Filed | Form | Items | Description |
|-----------|------|-------|-------------|
| 2025-12-08 | 8-A12B | — | Securities registration |
| 2025-12-09 | 8-K | 8.01, 9.01 | Merger close announcement + press release |
| 2025-12-11 | 8-K | 1.01, 9.01 | Convertible notes indenture |
| 2025-12-12 | 8-K | 1.01, 2.01, 2.03, 3.02, 3.03, 5.01-5.06, 9.01 | **SUPER 8-K** — Complete merger details, all agreements |
| 2025-12-19 | 10-Q | — | Stub-period 10-Q (Mar 7 - Sep 30, 2025, pre-merger private entity) |
| 2026-01-05 | S-1 | — | Registration statement (resale shelf) |
| 2026-01-06 | 8-K | 5.02, 9.01 | CFO appointment (Will Meehan) |
| 2026-02-09 | S-1/A | — | Amendment to S-1 |
| 2026-02-12 | 424B3 | — | Prospectus supplement |
| 2026-02-12 | EFFECT | — | S-1 effectiveness |

**No 10-Q/10-K with post-merger balance sheet yet filed.** The Dec 19 10-Q covers the pre-merger private entity only.

### Step 3: XBRL / Balance Sheet

**XBRL Data (CIK 0002070457, 10-Q filed Dec 19, 2025):**
This is the PRE-MERGER private company (inception Mar 7, 2025 to Sep 30, 2025):
- `CryptoAssetNumberOfUnits`: 10,500 BTC (the PIPE Bitcoin held pre-close)
- `Cash`: $0
- `Liabilities`: $65,554
- `WeightedAverageNumberOfShares`: 1 (single share, pre-merger LLC)
- `GeneralAndAdministrativeExpense`: $65,554 (inception to Sep 30)

**POST-MERGER balance sheet (from 8-K EX-99.4 proforma, Dec 8, 2025):**
- Total BTC: ~43,514 BTC valued at $90,560.40/BTC = ~$3.94B
- Shares: 346,548,153 Class A + 304,842,759 Class B = **651,390,912 total**
- Total Debt: $486,500,000 (1% convertible senior secured notes due 2030)
- Cash: ~$119.3M (from S-1 Jan 2026, net cash post-closing)
- No preferred equity

**Note:** FMP balance sheet data under XXI ticker shows pre-merger Cantor SPAC (CIK 0001865602) financials, NOT post-merger XXI. FMP market cap ($65.9M) is incorrect — uses SPAC share count instead of 651M merged shares.

### Step 4: Fiscal Year
- **FY End:** December 31
- **First post-merger 10-Q:** Expected March 2026 (Q4 2025, stub Dec 9-31 only)
- **First full-quarter 10-Q:** Expected May 2026 (Q1 2026)
- **First 10-K:** Expected March 2027 (FY 2026)

### Step 5: Earnings Data
- No quarterly earnings data yet (merged Dec 9, 2025)
- Pre-merger private entity 10-Q: G&A of $65,554 for inception-to-Sep 30 period
- First earnings expected: Q4 2025 stub period (Mar 2026 filing)

### Step 6-7: HPS & Non-Crypto Investments
**HPS:** 43,514 / 651,390,912 = 0.0000668 BTC/share

**Non-BTC assets:**
- Cash: ~$119.3M (from S-1)
- No other known investments

### Step 8: Metadata
- **CEO:** Jack Mallers
- **CFO:** Will Meehan (appointed per 8-K Jan 6, 2026)
- **Strategy:** BTC treasury + Bitcoin-native financial services
- **Backers:** Tether, SoftBank, Cantor (via SPAC sponsor)
- **BTC Collateral:** 16,116.32 BTC collateralizes the $486.5M converts (~3:1 ratio at close)
- **Location:** Austin, TX

### Step 9: Dilutive Instruments

**From 8-K Dec 12, 2025:**

| Instrument | Shares | Strike | Source |
|-----------|--------|--------|--------|
| $486.5M 1% Converts due 2030 | 35,068,912 | $13.87 | Indenture (72.0841 shares/$1K) |
| CEO Options (Jack Mallers) | 12,179,268 | $14.43 | Employment Agreement |
| CEO RSUs | 3,215,732 | $0 (vest) | Employment Agreement |
| CFO Options (Will Meehan) | 941,620 | $14.43 | Employment Agreement |
| CFO RSUs | 248,619 | $0 (vest) | Employment Agreement |

**Missing from code:** CEO options, CEO RSUs, CFO options, CFO RSUs are NOT in `dilutive-instruments.ts`!

**SPAC warrants:** The pre-merger SPAC (Cantor Equity Partners) had warrants, but the 8-K does not mention surviving SPAC warrants post-merger. The 25-NSE (Dec 8) and 15-12G (Dec 18) suggest delisting of old SPAC instruments.

### Step 10: Links
- **Website:** https://xxi.money (minimal — just logo + cookie notice)
- **Twitter:** @xxicapital
- **IR:** No dedicated IR page found

### Step 11: mNAV Calculation (Manual)

Using live data at time of check (Feb 14, 2026):
- BTC Price: ~$69,440 (Alpaca real-time)
- Stock Price: $6.40 (FMP)
- Shares: 651,390,912
- Market Cap: 651,390,912 × $6.40 = **$4,168,901,837** (~$4.17B)
- Converts ITM ($13.87 strike vs $6.40 stock): **NO** — converts are OUT of the money
- Total Debt: $486,500,000
- Cash: $119,300,000
- Preferred: $0

**EV = MarketCap + TotalDebt + Preferred - Cash**
EV = $4,168,901,837 + $486,500,000 + $0 - $119,300,000 = **$4,536,101,837**

**CryptoNAV = Holdings × BTC Price**
CryptoNAV = 43,514 × $69,440 = **$3,022,012,160**

**mNAV = EV / CryptoNAV = $4,536,101,837 / $3,022,012,160 = ~1.50x**

---

## Part 2: Pipeline Cross-Check

### provenance/xxi.ts
| Field | Ground Truth | Code | Status |
|-------|-------------|------|--------|
| Holdings | 43,514 | 43,514 | ✅ MATCH |
| Cost Basis | $90,560.40 (closing FV) | $91,509 | ⚠️ MINOR — code uses blended avg including post-close purchases |
| Class A Shares | 346,548,153 | 346,548,153 | ✅ MATCH |
| Class B Shares | 304,842,759 | 304,842,759 | ✅ MATCH |
| Total Shares | 651,390,912 | 651,390,912 | ✅ MATCH |
| Total Debt | $486,500,000 | $486,500,000 | ✅ MATCH |
| Cash | $119,300,000 | $119,300,000 | ✅ MATCH |
| Preferred | $0 | $0 | ✅ MATCH |
| Holdings Date | 2025-12-09 | 2025-12-09 | ✅ MATCH |

### companies.ts (XXI entry)
| Field | Ground Truth | Code | Status |
|-------|-------------|------|--------|
| ticker | XXI | XXI | ✅ |
| secCik | 0002070457 | 0002070457 | ✅ |
| holdings | 43,514 | 43,514 | ✅ |
| holdingsLastUpdated | 2025-12-09 | 2025-12-09 | ✅ |
| sharesForMnav | 651,390,912 | 651,390,912 | ✅ |
| totalDebt | $486,500,000 | $486,500,000 | ✅ |
| cashReserves | $119,300,000 | $119,300,000 | ✅ |
| costBasisAvg | ~$90,560 (closing FV) | $91,509 | ⚠️ Blended (see above) |
| debtInterestAnnual | $4,865,000 | $4,865,000 | ✅ |
| website | xxi.money | xxi.money | ✅ |
| twitter | xxicapital | xxicapital | ✅ |
| leader | Jack Mallers | Jack Mallers (CEO) | ✅ |

### dilutive-instruments.ts (XXI section)
| Instrument | Ground Truth | Code | Status |
|-----------|-------------|------|--------|
| $486.5M converts | 35,068,912 shares @ $13.87, due 2030 | 35,068,912 @ $13.87, exp 2030-12-01 | ✅ MATCH |
| CEO Options (Mallers) | 12,179,268 @ $14.43 | ❌ NOT TRACKED | ❌ MISSING |
| CEO RSUs (Mallers) | 3,215,732 @ $0 | ❌ NOT TRACKED | ❌ MISSING |
| CFO Options (Meehan) | 941,620 @ $14.43 | ❌ NOT TRACKED | ❌ MISSING |
| CFO RSUs (Meehan) | 248,619 @ $0 | ❌ NOT TRACKED | ❌ MISSING |

**Total missing dilution: 16,585,239 shares (12,179,268 + 3,215,732 + 941,620 + 248,619)**

### earnings-data.ts (XXI entries)
- Q4 2025 (partial): holdingsAtQuarterEnd=43,514, sharesAtQuarterEnd=651,390,912, HPS=0.0000668 ✅
- Q1 2026: upcoming, earningsDate=2026-05-15 ✅
- Status: ✅ Reasonable for new company

### holdings-history.ts (XXI entries)
- 2025-12-09: 43,514 BTC, 651,390,912 shares, debt=$486.5M, cash=$119.3M ✅
- 2026-01-05: 43,514 BTC, 651,390,912 shares (S-1 filing date) ✅
- Source URLs present ✅

### XXICompanyView.tsx
- Uses provenance data throughout ✅
- Calculates mNAV from provenance values ✅
- Handles ITM convertible adjustment ✅
- No hardcoded values — all from provenance/xxi.ts ✅
- Market cap line shows "651.4M basic0" — minor display quirk (trailing "0") ⚠️

---

## Part 3: UI Check

### Company Page (localhost:3000/company/XXI)
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| Page loads | Yes | Yes | ✅ |
| Stock Price | $6.40 | $6.40 | ✅ |
| mNAV | ~1.50x | 1.50x | ✅ |
| Leverage | ~0.12x | 0.12x | ✅ |
| Equity NAV/Share | ~$4.08 | $4.075 | ✅ |
| BTC Holdings | 43,514 | 43,514 BTC | ✅ |
| Cost Basis | ~$92K | $92K | ✅ |
| Crypto NAV | ~$3.02B | $3.02B | ✅ |
| Cash | $119.3M | $119.3M | ✅ |
| Total Debt | $486.5M | $486.5M | ✅ |
| Shares | 651.4M | 651.4M (Class A + Class B) | ✅ |
| BTC Collateral | 16,116 | 16,116 | ✅ |
| Share Classes | 347M A / 305M B | 347M A / 305M B | ✅ |
| Staleness warning | Shows | "68 days old (as of Dec 8, 2025)" | ✅ |

### mNAV Card Click
- Expanded successfully ✅
- Shows full calculation breakdown ✅
- SEC source links present (8-K for debt/holdings, S-1 for cash) ✅
- Adjusted Debt shown ($486.50M - ITM converts $0.00 = $486.50M) ✅
- **No crash** ✅

### Overview Page (localhost:3000)
| Element | Expected | Actual | Status |
|---------|----------|--------|--------|
| XXI listed | Yes, row #4 | Row 4 | ✅ |
| mNAV | ~1.50x | 1.48x | ✅ (minor diff from live price changes) |
| Price | $6.40 | $6.40 | ✅ |
| Market Cap | ~$4.17B | $4.17B | ✅ |
| Crypto | ~$3.02B | $3.02B, Dec 8, 2025, 43.5K BTC | ✅ |
| Other (cash) | $119.3M | 119.30M | ✅ |

---

## Derived Metric Vintage Check

| Metric | Input 1 | Input 2 | Same Vintage? |
|--------|---------|---------|---------------|
| HPS | Holdings (Dec 9) | Shares (Dec 9) | ✅ Same |
| mNAV | Holdings (Dec 9) | Debt (Dec 9) | ✅ Same |
| mNAV | Cash (Dec 9*) | Shares (Dec 9) | ✅ Same (*from S-1 Jan 5 but describing Dec 9 close) |
| Cost Basis | S-1 (Jan 5) | — | ⚠️ Blended with post-close data, but code notes this |

All core inputs aligned to Dec 9, 2025 merger close date. ✅

---

## Summary
**Status:** FAIL (missing dilutive instruments)

### Ground Truth
| Metric | Value | Source | As-Of |
|--------|-------|--------|-------|
| BTC Holdings | 43,514 | 8-K Dec 12, 2025 (EX-99.4) | 2025-12-09 |
| Shares (Class A) | 346,548,153 | 8-K Dec 12, 2025 | 2025-12-09 |
| Shares (Class B) | 304,842,759 | 8-K Dec 12, 2025 | 2025-12-09 |
| Shares (Total) | 651,390,912 | 8-K Dec 12, 2025 | 2025-12-09 |
| Total Debt | $486,500,000 | 8-K Dec 12, 2025 | 2025-12-09 |
| Cash | $119,300,000 | S-1 Jan 5, 2026 | 2025-12-09 |
| Cost Basis | $90,560.40/BTC (closing FV) | 8-K EX-99.4 proforma | 2025-12-08 |
| Dilutive instruments | Converts + CEO/CFO options/RSUs | 8-K Dec 12, 2025 | 2025-12-09 |
| mNAV (calculated) | ~1.50x | Manual calc @ $69.4K BTC, $6.40 stock | 2026-02-14 |

### Pipeline Check
| File | Status | Issues |
|------|--------|--------|
| provenance/xxi.ts | ✅ | Cost basis minor discrepancy (blended $91,509 vs closing FV $90,560) |
| companies.ts | ✅ | All core fields match |
| dilutive-instruments.ts | ❌ | Missing CEO options (12.2M@$14.43), CEO RSUs (3.2M), CFO options (942K@$14.43), CFO RSUs (249K) |
| earnings-data.ts | ✅ | Appropriate for new company |
| holdings-history.ts | ✅ | Two entries, both correct |
| XXICompanyView.tsx | ✅ | Uses provenance, no hardcoded values |

### UI Check
| Check | Status |
|-------|--------|
| Page loads | ✅ |
| mNAV card click | ✅ (no crash, full calculation shown) |
| Overview match | ✅ (1.48x overview vs 1.50x company — live price diff, acceptable) |

### Issues Found
1. **❌ Missing dilutive instruments:** CEO options (12,179,268 @ $14.43), CEO RSUs (3,215,732), CFO options (941,620 @ $14.43), CFO RSUs (248,619) — total 16.6M potential shares not tracked. Source: 8-K Dec 12, 2025 Employment Agreements.
2. **⚠️ Cost basis:** Code uses $91,509 (blended) vs $90,560.40 (closing date FV). Acceptable if intentionally includes post-close PIPE purchases at higher avg prices.
3. **⚠️ FMP data issue:** FMP API returns Cantor SPAC data (CIK 0001865602) for XXI ticker. Market cap ($65.9M) and balance sheet are wrong. Any pipeline using FMP for XXI will get incorrect data.
4. **⚠️ Minor UI:** Market cap line shows "651.4M basic0" (trailing "0" display quirk).
5. **ℹ️ No post-merger 10-Q:** First real balance sheet (Q4 2025 stub) expected ~March 2026.

**Company mNAV:** 1.50x
**Overview mNAV:** 1.48x
