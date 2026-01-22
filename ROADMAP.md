# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-01-21
> **Current Phase**: 4 - Data Quality & Architecture
> **Status**: Audits complete, planning data acquisition process

---

## RESUME HERE

**Completed Audits (2026-01-21):**
- Holdings: 14 fixes applied
- Shares Outstanding: 6 discrepancies found
- Total Debt: 2 discrepancies found
- Market Cap: 7 discrepancies found (most should be removed, not fixed)

**Key Insight:** Don't fix data before fixing the process that gets the data. Otherwise fixes just drift again.

**The Problem with Share Counts:**
- **PIPE/Merger dilution** → Disclosed in 8-K ✅
- **ATM dilution** → NOT in 8-K, only in quarterly 10-Q/10-K ❌
- This means share counts can drift between quarters even if we watch 8-Ks

**Solution: Hybrid Approach**
1. **Companies with dashboards** → Use real-time dashboard data
2. **Companies without dashboards** → Accept quarterly lag from 10-Q/10-K
3. **Be transparent** → Show data source and freshness for each company

**Next Steps:**
1. Identify which companies have real-time share data (dashboards)
2. Build/verify fetchers for those dashboards
3. For the rest, establish quarterly update process from 10-Q
4. Then apply fixes using the correct process
5. Build verification to catch drift

---

## Data Acquisition Strategy

### Share Counts - Hybrid Approach

**Tier 1: Real-time dashboards with shares**
| Company | Dashboard | Shares? | Holdings? |
|---------|-----------|---------|-----------|
| MSTR | strategy.com | ✅ fdShares in API | ✅ |

**Tier 1b: Dashboards with holdings only (no shares)**
| Company | Dashboard | Shares? | Holdings? |
|---------|-----------|---------|-----------|
| SBET | sharplink.com/eth-dashboard | ❌ | ✅ |
| Metaplanet | metaplanet.jp/analytics | ❌ | ✅ |
| DFDV | defidevcorp.com | ❌ | ✅ |
| LITS | litestrategy.com | ❌ | ✅ |

**Note**: mNAV.com provides shares for 15 companies but is a secondary source (missed XXI Class B shares).

**Tier 2: SEC quarterly (accept lag)**
- All other US companies
- Update shares after each 10-Q/10-K filing
- Show "as of Q3 2025" on company page

#### Quarterly Update Process (Tier 2 companies)

1. **When to update**: After each 10-Q (Q1, Q2, Q3) or 10-K (annual) filing
2. **Where to find shares**: Look for "WeightedAverageNumberOfDilutedSharesOutstanding" in filing
3. **How to update**:
   - Update `holdings-history.ts` with new share count, date, and SEC filing URL
   - The system derives `sharesForMnav` from holdings-history.ts
4. **What to display**: Show "as of Q3 2025" or similar on company page
5. **Dual-class companies**: Sum all share classes (Class A + Class B = total)

**Tier 3: Foreign companies**
- 3350.T, 0434.HK, H100.ST, ALTBG
- Use exchange filings or company announcements
- May have different disclosure schedules

### The ATM Gap

When a company uses ATM to fund BTC purchases:
1. **8-K filed** → "We bought X BTC" ✅
2. **Shares sold** → NOT disclosed until 10-Q ❌

This is unavoidable. Options:
- **Estimate**: If they bought $100M BTC at $10/share, ~10M new shares
- **Wait**: Accept that shares are stale until 10-Q
- **Dashboard**: Some companies (MSTR) publish real-time

**Decision:** Use dashboards where available, accept quarterly lag otherwise, be transparent about freshness.

### Market Cap - Calculate, Don't Override

**For US stocks:** `marketCap = sharesForMnav × liveStockPrice`
- Remove all hardcoded overrides
- Requires accurate share count (see above)
- Requires reliable price API (FMP)

**For foreign stocks only:** Keep override with reason
- 3350.T (Tokyo - need JPY conversion)
- 0434.HK (Hong Kong - need HKD conversion)
- H100.ST (Stockholm - need SEK conversion)
- ALTBG (Paris - need EUR conversion)

---

## Discrepancies Found (for reference)

### Shares Outstanding

| Ticker | Current | Correct | Root Cause |
|--------|---------|---------|------------|
| PURR | 32M | 127M | Sonnet merger (Dec 2025) |
| FWDI | 42M | 85M | $1.65B PIPE (Sep 2025) |
| RIOT | 403M | 350M | Overstated dilution |
| DJT | 288M | 278M | Drift |
| BTBT | 335M | 324M | Drift |
| KULR | 49M | 45.67M | Internal inconsistency |

### Total Debt

| Ticker | Current | Correct | Root Cause |
|--------|---------|---------|------------|
| MSTR | $10B | $8.2B | Note redemptions |

### Market Cap (remove, don't fix)

| Ticker | Current | Action |
|--------|---------|--------|
| NAKA | $1.5B | Remove override, calculate |
| KULR | $600M | Remove override, calculate |
| DJT | $6.4B | Remove override, calculate |
| MSTR | $57.4B | Remove override, calculate |
| XXI | $6.12B | Remove override, calculate |
| CORZ | $4.5B | Remove override, calculate |
| BTDR | $2.8B | Remove override, calculate |

---

## Phase 4: Data Quality & Architecture
**Status**: IN PROGRESS

### 4.1 Holdings Audit - COMPLETE
- [x] Audit all 54 companies
- [x] Fix 14 major discrepancies

### 4.2 mNAV Inputs Audit - COMPLETE
- [x] Audit sharesForMnav (6 discrepancies)
- [x] Audit totalDebt (1 discrepancy)
- [x] Audit marketCap overrides (7 to remove)
- [x] Root cause analysis

### 4.3 Establish Data Acquisition Process - COMPLETE
- [x] Identify companies with real-time share dashboards (only MSTR has shares)
- [x] Update strategy.com fetcher to extract fdShares
- [x] Document quarterly update process for non-dashboard companies
- [x] Decide: estimate ATM dilution or accept lag? → Accept lag, be transparent

### 4.4 Share Architecture - COMPLETE
- [x] Add `sharesOutstandingBasic` and `sharesOutstandingDiluted` to holdings-history.ts
- [x] Add `sharesAsOf` date and `sharesSource` fields
- [x] Derive `sharesForMnav` from holdings-history.ts (single source of truth)
- [x] Remove marketCap overrides for US stocks (7 removed: MSTR, XXI, KULR, NAKA, DJT, CORZ, BTDR)
- [x] Update mNAV calculation to use `shares × price` (already implemented in market-cap.ts)
- [x] Fix broken tests (strategy.test.ts - updated for fdShares extraction)

### 4.4b Data Provenance & Cash/Debt Architecture - NOT STARTED

**Data Provenance (show where each number comes from):**
- [ ] Add source/date tracking for shares: `sharesSource`, `sharesSourceUrl`, `sharesAsOf`
- [ ] Add source/date tracking for debt: `debtSource`, `debtSourceUrl`, `debtAsOf`
- [ ] Add source/date tracking for cash: `cashSource`, `cashSourceUrl`, `cashAsOf`
- [ ] Add source/date tracking for preferred: `preferredSource`, `preferredSourceUrl`, `preferredAsOf`
- [ ] Propagate sources through calculation pipeline (use-company-overrides.ts, market-cap.ts)
- [ ] Update mNAV tooltip to show component sources with links

**Cash/Debt Formula:**
- [ ] Decide formula: use `netDebt` (debt - cash) vs current approach
- [ ] Add `restrictedCash` field if needed for companies with encumbered cash
- [ ] Document which companies have complex debt structures (convertibles, secured debt, etc.)

**Testing:**
- [ ] Add tests for source propagation through calculation pipeline
- [ ] Ensure all tests pass before completing phase

### 4.5 Apply Fixes Using New Process - NOT STARTED
- [ ] Update share counts using dashboard data or latest 10-Q
- [ ] Research and update debt structures for all companies
- [ ] Fix MSTR totalDebt ($10B → $8.2B)
- [ ] Audit cash treatment per company (free vs restricted)

### 4.6 Documentation - NOT STARTED
- [ ] Document data source for each company
- [ ] Document update cadence (real-time vs quarterly)
- [ ] Document how to add a new company

---

## Phase 5: Delete Old Monitoring System
**Status**: NOT STARTED

- [ ] Remove `src/lib/monitoring/` directory
- [ ] Remove related cron jobs
- [ ] Drop unused database tables

---

## Phase 6: Simple Verification System
**Status**: NOT STARTED

Build after data and process are solid:
- [ ] Compare our data vs source data
- [ ] Alert on discrepancies > X%
- [ ] Manual review and update

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-21 | Hybrid approach for shares | Dashboards where available, quarterly 10-Q otherwise |
| 2026-01-21 | Accept ATM lag | Can't know ATM dilution until 10-Q, be transparent |
| 2026-01-21 | Calculate market cap, don't override | Static overrides go stale immediately |
| 2026-01-21 | Fix process before fixing data | Otherwise fixes just drift again |
| 2026-01-21 | Track basic AND diluted shares | Display both, use diluted for mNAV |
| 2026-01-21 | Delete old monitoring system | Untested, complex, doesn't work |
| 2026-01-21 | Audit cash/debt after share architecture | Same SEC data source, don't expand scope mid-phase |
| 2026-01-21 | Add source citations to mNAV components | Users need to verify data, catch errors like XXI Class B |

---

## Completed Phases

### Phase 0-3: Planning, Schema, Fetchers, Comparison
- All complete, see git history
- 160 tests passing
- Fetchers built for: mNAV, Strategy, SharpLink, SEC XBRL, Metaplanet, LiteStrategy
