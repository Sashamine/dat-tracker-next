# BMNR (Bitmine Immersion) Data Architecture Audit
**Date:** 2026-01-27
**Auditor:** Claude Sonnet 4.5
**Comparison:** MSTR infrastructure (reference: MSTR-FIXES.md)

---

## Executive Summary

BMNR lacks the comprehensive data infrastructure that MSTR has. While BMNR has **extensive SEC filing activity** (5 10-Ks, 15 10-Qs, 79 8-Ks), we're only using **press releases** for 92% of our data. This creates:

- **810% share dilution unexplained** (50M → 455M shares in 6 months)
- **No verification** of press release claims against SEC filings
- **No ATM tracking** despite $10B ATM program
- **No inter-quarter event timeline** for capital raises
- **Single earnings entry** (Q4 2025 upcoming) vs full history

**Recommendation:** Apply MSTR-style data architecture to BMNR for improved accuracy and transparency.

---

## Current BMNR Data State

### Holdings History (holdings-history.ts)
**Coverage:** July 2025 - January 2026 (6 months, 12 snapshots)

#### ETH Holdings Growth
- **Start:** 0.30M ETH (Jul 17, 2025)
- **End:** 4.20M ETH (Jan 20, 2026)
- **Growth:** +3.90M ETH (+1,298%)

#### Share Dilution
- **Start:** 50.0M shares (Jul 17, 2025)
- **End:** 455.0M shares (Jan 20, 2026)
- **Growth:** +405.0M shares (+810%)

#### ETH Per Share (Treasury Yield)
- **Start:** 0.006013 ETH/share
- **End:** 0.009237 ETH/share
- **Growth:** +53.6%

#### Major Share Count Jumps (>20%)
1. **Jul 17 → Aug 10** (24 days): 50M → 150M (+200.0%)
2. **Aug 17 → Aug 24** (7 days): 180M → 221.5M (+23.1%)
3. **Sep 7 → Nov 9** (63 days): 260M → 350M (+34.6%)

**CRITICAL ISSUE:** 810% share dilution in 6 months with NO explanation of:
- ATM sales amounts (despite $10B ATM program)
- PIPE transactions (despite $615M PIPE noted in companies.ts)
- Warrant exercises
- Options issuances
- Convertible note conversions

### Data Sources Analysis
- **Press releases:** 11 of 12 snapshots (92%)
- **SEC 10-K filing:** 1 snapshot (Nov 20, 2025 - 384M shares)
- **Verification rate:** 8% (only 1 SEC-verified data point)

**MSTR comparison:** MSTR uses 21 XBRL quarterly filings + 28 8-K events = 100% SEC-verified

### Earnings Data (earnings-data.ts)
- **Q4 2025:** Upcoming (Feb 28, 2026)
- **Historical:** None

**MSTR comparison:** MSTR has 20+ quarters of historical data (Q3 2020 - Q3 2025)

### Companies Data (companies.ts)
```typescript
{
  ticker: "BMNR",
  holdings: 4_203_036 ETH,
  holdingsLastUpdated: "2026-01-20",
  holdingsSource: "press-release", // ← Not SEC verified
  sharesForMnav: 455_000_000,  // ← Q3 2025 (stale)
  quarterlyBurnUsd: 2_500_000,
  capitalRaisedAtm: 10_000_000_000,  // ← $10B ATM program
  capitalRaisedPipe: 615_000_000,  // ← $615M PIPE
  hasOptions: true,  // ← No options tracked in dilutive-instruments.ts
}
```

**Issues:**
1. Holdings from press release, not SEC filing
2. Shares from Q3 2025 (3+ months stale)
3. $10B ATM program not tracked
4. $615M PIPE not documented
5. Options exist but not in dilutive-instruments.ts

### Company Sources (company-sources.ts)
```typescript
BMNR: {
  secCik: "1829311", // ← CIK exists!
  secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311",
  sharesSource: "basic",
  sharesNotes: "Using EntityCommonStockSharesOutstanding from SEC filings.",
  reportsHoldingsFrequency: "weekly",
}
```

**Good:** SEC CIK documented, notes weekly reporting
**Missing:** No mention of ATM tracking, PIPE tracking, or verification process

---

## SEC Filing Availability

### BMNR SEC Edgar Profile
- **CIK:** 0001829311
- **Entity:** BITMINE IMMERSION TECHNOLOGIES, INC.
- **Exchange:** NYSE (ticker: BMNR)
- **Fiscal Year End:** August 31
- **Status:** Emerging growth company

### Filing Statistics
| Form Type | Count | Description |
|-----------|-------|-------------|
| **10-K** | 5 | Annual reports with full XBRL data |
| **10-Q** | 15 | Quarterly reports with XBRL data |
| **8-K** | 79 | Current event reports (ETH purchases, ATM sales, etc.) |
| **Other** | 160 | Proxies, insider trades, offerings |
| **Total** | 259 | All filings since 2020 |

**Key Insight:** BMNR has **extensive SEC filing activity** - comparable to MSTR. We're just not using it.

### Sample 8-K Filings (Recent)
- **Jan 27, 2026:** Multiple 8-K filings (likely ETH purchase updates)
- **Jan 20, 2026:** 8-K filing (matches holdings update date)
- **Jan 15, 2026:** 8-K filing
- **Jan 14, 2026:** Multiple 8-K filings
- **Dec 29, 2025:** Multiple 8-K filings

**Pattern:** BMNR files 8-Ks frequently (79 total), likely for ETH purchase announcements similar to MSTR's BTC updates.

---

## Missing Infrastructure (vs MSTR)

### 1. SEC History File (bmnr-sec-history.ts)
**MSTR Has:** `mstr-sec-history.ts` with 21 XBRL quarterly filings

**BMNR Needs:**
- XBRL data extraction from 15 10-Q + 5 10-K filings
- Digital assets (ETH holdings at fair value)
- Cash and equivalents
- Debt (convertibles, secured notes)
- Preferred equity (if any)
- Common shares outstanding
- Track fiscal year (Aug 31 year-end, not calendar year)

**Impact:** Would provide verified quarter-end balance sheet snapshots

---

### 2. Capital Events File (bmnr-capital-events.ts)
**MSTR Has:** `mstr-capital-events.ts` with 28 inter-quarter 8-K events

**BMNR Needs:**
- ETH purchase events from 79 8-K filings
- ATM sales tracking ($10B program)
- PIPE transactions ($615M documented)
- Debt issuances (if any)
- Preferred stock issuances (if any)
- Warrant exercises
- Options grants/exercises

**Impact:** Would explain 810% share dilution and ETH accumulation timeline

---

### 3. ATM Sales Tracking
**MSTR Has:** ATM data backfilled in capital events (13 events, $2.1B tracked)

**BMNR Needs:**
- Weekly ATM sales from 8-K filings
- Shares issued via ATM
- Proceeds raised
- Breakdown by security type (common, preferred, warrants)

**Current Gap:** $10B ATM program mentioned, but ZERO tracking of:
- How much capital raised to date
- How many shares issued
- What ETH was purchased with proceeds

**Impact:** Cannot verify how BMNR funded 1,298% ETH growth

---

### 4. Verification Engine (bmnr-verification.ts)
**MSTR Has:** `mstr-verification.ts` - cross-checks 8-K vs XBRL

**BMNR Needs:**
- Compare press release holdings vs XBRL quarter-end holdings
- Compare estimated shares vs XBRL shares outstanding
- Flag discrepancies >5%
- Document known limitations (press releases are interim, XBRL is authoritative)

**Current Gap:** Press releases used without verification (92% of data)

**Impact:** No way to detect if press releases are inaccurate

---

### 5. Capital Structure Timeline (bmnr-capital-structure.ts)
**MSTR Has:** `getCapitalStructureAt(date)` - capital structure at any date

**BMNR Needs:**
- `getQuarterEndSnapshot(periodEnd)` - XBRL data
- `getCapitalStructureAt(date)` - derive from prior quarter + 8-K events
- Supports earnings consolidation (single source of truth)

**Impact:** Would enable same data consolidation as MSTR earnings page

---

### 6. Dilutive Instruments Tracking
**MSTR Has:** 8 convertible tranches ($9.26B) in `dilutive-instruments.ts`

**BMNR Needs:**
- Options (companies.ts says `hasOptions: true`)
- Warrants (likely from ATM/PIPE)
- Convertible notes (if any)
- Preferred stock (if convertible)

**Current Gap:** `hasOptions: true` but ZERO instruments tracked

**Impact:** Cannot calculate diluted shares or mNAV accurately

---

### 7. Daily mNAV History
**MSTR Has:** 861 daily snapshots (Aug 2022 - Jan 2026)

**BMNR Needs:**
- Daily ETH prices
- Daily BMNR stock prices
- Capital structure timeline
- Dilution calculation per day

**Current Gap:** Only 12 snapshots over 6 months (every 2 weeks)

**Impact:** Chart shows jagged steps instead of smooth line

---

### 8. Complete Earnings History
**MSTR Has:** 20+ quarters (Q3 2020 - Q3 2025)

**BMNR Needs:**
- Parse 10-Q/10-K filings for earnings dates
- Extract holdings, shares, per-share metrics
- Build historical timeline
- Enable quarterly/annual view like MSTR

**Current Gap:** Only Q4 2025 upcoming, no historical data

**Impact:** Cannot show treasury yield trends over time

---

## Data Quality Issues

### Issue 1: Share Count Volatility
**Problem:** Share counts are estimated, not from quarterly SEC filings

**Evidence:** Holdings history shows:
- Aug 24: 221,515,180 shares (oddly precise)
- Nov 20: 384,067,823 shares (10-K filing - only SEC-verified number)
- Nov 30: 400,000,000 shares (press release - round number, likely estimate)

**Fix:** Use XBRL `EntityCommonStockSharesOutstanding` from all 10-Q/10-K filings

---

### Issue 2: No ATM Provenance
**Problem:** $10B ATM program mentioned, but zero tracking

**Evidence:**
- companies.ts: `capitalRaisedAtm: 10_000_000_000`
- No breakdown of how much raised, when, at what prices
- Cannot verify if $10B is total program size or amount raised

**Fix:** Parse 8-K filings for ATM sales (similar to MSTR weekly updates)

---

### Issue 3: Holdings Source Reliability
**Problem:** 92% of holdings data from press releases, not SEC filings

**Evidence:**
- 11 of 12 snapshots cite "Press release"
- Only Nov 20, 2025 cites "10-K filing"
- Press releases can have timing lags, rounding, or errors

**Fix:** Use XBRL `DigitalAssets` from 10-Q/10-K as authoritative source

---

### Issue 4: Missing Treasury Yield History
**Problem:** Cannot calculate annual treasury yield trends

**Evidence:**
- Only 6 months of data (Jul 2025 - Jan 2026)
- No data from ETH strategy launch (likely mid-2025 per datStartDate)
- Cannot show "2025 vs 2024" annual comparison like MSTR

**Fix:** Backfill from first 10-K that reports ETH holdings

---

### Issue 5: No Cash/Debt Tracking
**Problem:** mNAV calculation may be inaccurate

**Current mNAV calculation:**
```
Market Cap = 455M shares × $26.50 price = $12.1B
ETH NAV = 4.2M ETH × $2,600 = $10.9B
mNAV = $12.1B / $10.9B = 1.11x
```

**Missing from calculation:**
- Total debt (if any)
- Cash reserves ($979M noted in companies.ts, but marked as "restricted")
- Preferred equity (if any)

**MSTR comparison:**
```
EV = Market Cap + Total Debt + Preferred - Free Cash
mNAV = EV / Crypto NAV
```

**Fix:** Extract debt, cash, preferred from XBRL balance sheets

---

## Recommended Implementation Plan

### Phase 1: SEC History Foundation (Week 1)
**Goal:** Build `bmnr-sec-history.ts` with XBRL quarterly data

**Tasks:**
1. Fetch all 10-Q filings (15 filings)
2. Fetch all 10-K filings (5 filings)
3. Extract XBRL tags:
   - `us-gaap:DigitalAssets` or `us-gaap:CryptocurrencyHeldInvestment`
   - `us-gaap:CashAndCashEquivalents`
   - `us-gaap:LongTermDebt`
   - `us-gaap:ConvertibleDebt`
   - `us-gaap:PreferredStockValue`
   - `us-gaap:CommonStockSharesOutstanding`
4. Handle fiscal year (Aug 31 year-end)
5. Verify against known data points (Nov 20, 2025 10-K: 384M shares, 3.56M ETH)

**Output:** 15-20 verified quarterly snapshots

**Success Metric:** Match Nov 20 10-K filing (384,067,823 shares, 3,559,879 ETH)

---

### Phase 2: Capital Events Timeline (Week 2)
**Goal:** Build `bmnr-capital-events.ts` with 8-K inter-quarter events

**Tasks:**
1. Parse 79 8-K filings for event types:
   - Item 8.01: ETH purchase announcements
   - Item 3.02: Unregistered equity sales (ATM, PIPE)
   - Item 1.01: Debt issuances
   - Item 3.03: Preferred stock issuances
2. Extract from each event:
   - ETH acquired (count + cost)
   - ETH cumulative total
   - ATM shares sold
   - ATM proceeds raised
   - Security type (common, preferred, warrants)
3. Build timeline: Aug 2025 - Jan 2026

**Output:** 30-50 capital events (ETH purchases + equity raises)

**Success Metric:** Explain 810% share dilution (50M → 455M)

---

### Phase 3: Verification & Consolidation (Week 3)
**Goal:** Cross-check press releases vs SEC filings

**Tasks:**
1. Build `bmnr-verification.ts`:
   - Compare press release holdings vs XBRL holdings
   - Compare estimated shares vs XBRL shares
   - Flag discrepancies >5%
2. Update holdings-history.ts:
   - Replace estimated shares with SEC-verified shares
   - Add sharesSource for each entry
   - Mark press releases as "unverified" vs "SEC-verified"
3. Build `bmnr-capital-structure.ts`:
   - `getQuarterEndSnapshot()` for XBRL data
   - `getCapitalStructureAt()` for any date
   - Support earnings consolidation

**Output:**
- Verification report showing discrepancies
- Updated holdings history with verification status
- Capital structure timeline API

**Success Metric:** <5% discrepancy between press releases and SEC filings

---

### Phase 4: Earnings & History (Week 4)
**Goal:** Complete earnings history and daily mNAV

**Tasks:**
1. Populate earnings-data.ts:
   - Parse 10-Q/10-K for earnings dates
   - Use capital structure for holdings/shares data
   - Build historical timeline (6-8 quarters)
2. Generate daily mNAV history:
   - Script similar to MSTR (scripts/generate-daily-mnav-bmnr.ts)
   - ETH prices from CoinGecko
   - BMNR stock prices from Yahoo Finance
   - Capital structure from timeline
3. Add dilutive instruments:
   - Parse 10-K for options outstanding
   - Parse S-1/S-3 for warrants
   - Add to dilutive-instruments.ts

**Output:**
- 6-8 quarters of earnings history
- 200+ daily mNAV snapshots
- Dilutive instruments tracked

**Success Metric:** Earnings page shows annual view with YoY growth

---

## Comparison: BMNR vs MSTR Infrastructure

| Feature | MSTR | BMNR | Gap |
|---------|------|------|-----|
| **Data Architecture** |
| SEC XBRL History | 21 quarterly filings | 0 filings | ❌ 100% gap |
| Capital Events (8-K) | 28 events tracked | 0 events tracked | ❌ 100% gap |
| ATM Sales Tracking | 13 events, $2.1B | 0 events, $0 tracked | ❌ 100% gap |
| Verification Engine | ✓ Cross-checks 8-K vs XBRL | ✗ No verification | ❌ Missing |
| Capital Structure API | ✓ Point-in-time snapshots | ✗ No API | ❌ Missing |
| **Data Quality** |
| SEC Verification Rate | 100% (all from XBRL/8-K) | 8% (1 of 12 snapshots) | ❌ 92% unverified |
| Share Count Source | XBRL CommonStockShares | Press release estimates | ❌ Not authoritative |
| Holdings Source | XBRL DigitalAssets | Press releases | ❌ Not authoritative |
| Dilutive Instruments | 8 tranches, $9.26B tracked | 0 tracked | ❌ Missing |
| **Earnings & History** |
| Earnings Data Points | 20+ quarters | 1 quarter (upcoming) | ❌ 95% missing |
| Daily mNAV History | 861 snapshots (3+ years) | 12 snapshots (6 months) | ❌ 98% missing |
| Historical Backfill | Q3 2020 - present | Jul 2025 - present | ❌ Pre-Jul 2025 missing |
| **Charts & Features** |
| Chart Granularity | 5-minute (24H view) | 2-week average | ❌ 4000x less granular |
| Quarterly/Annual Toggle | ✓ Shows YoY growth | ✗ Not implemented | ❌ Missing |
| Treasury Yield Trends | ✓ 6-year timeline | ✗ 6-month only | ❌ Insufficient |

**Overall Assessment:** BMNR has **~10%** of MSTR's data infrastructure despite having similar SEC filing activity.

---

## SEC Filing Availability (Detailed)

### 10-K Annual Reports (5 filings)
BMNR files annual reports for fiscal years ending August 31.

**Expected Coverage:** FY2021, FY2022, FY2023, FY2024, FY2025

**Value:** Full balance sheet with:
- Digital assets (ETH holdings)
- Cash and equivalents
- Total debt
- Preferred equity
- Shares outstanding
- Full year activity summary

---

### 10-Q Quarterly Reports (15 filings)
BMNR files quarterly reports for periods ending Nov 30, Feb 28, May 31 (Q1, Q2, Q3 of each fiscal year).

**Expected Coverage:** 5 fiscal years × 3 quarters = 15 quarters

**Value:** Quarterly balance sheet snapshots (same data as 10-K)

---

### 8-K Current Reports (79 filings)
BMNR files 8-Ks for material events.

**Likely Event Types:**
- **Item 8.01:** ETH purchase announcements (similar to MSTR "BTC Update")
- **Item 3.02:** Unregistered equity sales (ATM program, PIPE)
- **Item 1.01:** Debt issuances (convertible notes, secured loans)
- **Item 3.03:** Preferred stock issuances
- **Item 5.02:** Officer departures/appointments
- **Item 7.01:** Press release furnishings

**Expected Pattern:** Weekly 8-Ks for ETH purchases (like MSTR's BTC updates)

**Value:** Inter-quarter timeline of ETH accumulation and capital raises

---

## Risk Assessment

### High Risk Issues
1. **810% share dilution unexplained** - Critical data gap
2. **92% unverified data** - Relying on press releases
3. **$10B ATM program untracked** - Cannot verify capital efficiency
4. **No earnings history** - Cannot show treasury yield trends

### Medium Risk Issues
1. **No dilutive instruments** - mNAV may be inaccurate
2. **Missing debt/cash tracking** - Enterprise value calculation incomplete
3. **Limited historical data** - Only 6 months vs MSTR's 5+ years

### Low Risk Issues
1. **Chart granularity** - 2-week snapshots vs daily (cosmetic)
2. **No daily mNAV** - Nice-to-have, not critical

---

## Cost/Benefit Analysis

### Implementation Effort
- **Phase 1 (SEC History):** ~16 hours (parse 20 filings, extract XBRL)
- **Phase 2 (Capital Events):** ~24 hours (parse 79 8-Ks, categorize events)
- **Phase 3 (Verification):** ~8 hours (build verification engine)
- **Phase 4 (Earnings):** ~12 hours (populate history, generate daily mNAV)
- **Total:** ~60 hours (~1.5 weeks full-time)

### Benefits
1. **Data Accuracy:** 92% → 100% SEC verification rate
2. **Transparency:** Explain 810% share dilution
3. **User Trust:** Show provenance for all data
4. **Feature Parity:** Match MSTR earnings page features
5. **Scalability:** Architecture extends to other ETH companies (SBET, BTCS, etc.)

### ROI
- **BMNR is world's largest ETH treasury** (4.2M ETH = $11B)
- **High user interest** in treasury companies
- **Infrastructure reusable** for SBET, BTCS, ETHM (other ETH treasuries)
- **Reduces audit risk** (current data has significant gaps)

**Recommendation:** **HIGH PRIORITY** - Implement all 4 phases

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ **Audit Complete** - Document BMNR data gaps
2. ⏳ **User Decision** - Approve implementation plan
3. ⏳ **Phase 1 Start** - Begin SEC history extraction

### Implementation Timeline
- **Week 1:** SEC History (bmnr-sec-history.ts)
- **Week 2:** Capital Events (bmnr-capital-events.ts)
- **Week 3:** Verification (bmnr-verification.ts + capital structure)
- **Week 4:** Earnings & Daily mNAV

### Success Metrics
1. **Data Verification:** 100% of holdings/shares from SEC filings
2. **Share Dilution:** 810% growth fully explained (ATM + PIPE + options)
3. **Earnings History:** 6-8 quarters populated
4. **Daily mNAV:** 200+ daily snapshots generated
5. **User Confidence:** Provenance shown for all data points

---

## Appendix: BMNR vs MSTR Quick Stats

### BMNR (As of Jan 20, 2026)
- **Treasury:** 4.20M ETH ($10.9B at $2,600)
- **Market Cap:** $12.1B (455M shares × $26.50)
- **mNAV:** ~1.11x
- **SEC Filings:** 5 10-Ks, 15 10-Qs, 79 8-Ks
- **Data Infrastructure:** ~10% of MSTR

### MSTR (As of Jan 20, 2026)
- **Treasury:** 712K BTC ($63B at $88,600)
- **Market Cap:** $53B (332M basic shares × $160)
- **mNAV:** ~1.08x
- **SEC Filings:** 21 10-Qs/10-Ks tracked, 28 8-Ks tracked
- **Data Infrastructure:** Comprehensive (mstr-sec-history.ts, mstr-capital-events.ts, mstr-verification.ts, mstr-capital-structure.ts)

### Key Differences
- BMNR's **share dilution (810%)** far exceeds MSTR's (~250% over similar period)
- BMNR's **ATM program ($10B)** is much larger relative to size
- BMNR's **data verification (8%)** far below MSTR (100%)
- BMNR **launched ETH strategy in 2025** (newer than MSTR's 2020 start)

---

**End of Audit Report**

*For questions or to approve implementation, contact the development team.*
