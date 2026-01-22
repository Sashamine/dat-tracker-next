# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-01-22
> **Current Phase**: 7b - Testing the Verification Process
> **Status**: IN PROGRESS - testing adversarial verification on remaining discrepancies

---

## RESUME HERE

**Session 2026-01-22:**

### Key Insight: Verification vs Comparison

The comparison engine (Phase 6) finds discrepancies but doesn't determine truth. It just says "these numbers differ."

**Real verification requires:**
1. Where did our value come from? (git history)
2. Does the cited source actually say that? (read primary document)
3. Where did the comparison value come from?
4. Which is correct based on primary sources?

### What We Built

Added mandatory adversarial verification process to CLAUDE.md:
- Must investigate BOTH existing value AND proposed replacement
- Must read primary source documents (not news articles)
- Must answer 5 questions before any data edit
- Two data types: verifiable (need primary source) vs estimated (need methodology)

### Tests Run

| Company | Discrepancy | Process Found | Result |
|---------|-------------|---------------|--------|
| MARA | 378M vs 495M | Previous fix grabbed wrong SEC field | Fixed with methodology |
| MSTR | 725K vs 709K | Our value had no supporting 8-K | Fixed to verified values |
| RIOT | Shares + holdings | Multiple errors found | Fixed both |
| GAME | 98M vs mNAV 447M | mNAV was wrong | Our value correct |
| Metaplanet | Share structure | Complex preferred structure | Documented provenance |

### Next Steps

1. Continue testing process on remaining ~60 discrepancies
2. Track success/failure rate
3. Refine process based on learnings
4. Build UI for estimate provenance (Phase 7c)

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
**Status**: COMPLETE

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

### 4.4b Data Provenance & Cash/Debt Architecture - COMPLETE

**Data Provenance (show where each number comes from):**
- [x] Add source/date tracking for shares: `sharesSource`, `sharesSourceUrl`, `sharesAsOf`
- [x] Add source/date tracking for debt: `debtSource`, `debtSourceUrl`, `debtAsOf`
- [x] Add source/date tracking for cash: `cashSource`, `cashSourceUrl`, `cashAsOf`
- [x] Add source/date tracking for preferred: `preferredSource`, `preferredSourceUrl`, `preferredAsOf`
- [x] Propagate sources through calculation pipeline (use-company-overrides.ts)
- [x] Update mNAV tooltip to show component sources with links

**Cash/Debt Formula:**
- [x] Decide formula: use `freeCash = cashReserves - restrictedCash` (only subtract unencumbered cash)
- [x] Add `restrictedCash` field for companies with encumbered cash
- [x] Document which companies have complex debt structures (convertibles, secured debt, etc.)

**Testing:**
- [ ] Add tests for source propagation through calculation pipeline
- [x] Ensure all tests pass (160 passing)

### 4.5 Apply Fixes Using New Process - COMPLETE
- [x] Update share counts using dashboard data or latest 10-Q
  - PURR: 32M → 127M (Sonnet merger Dec 2025)
  - FWDI: 42M → 85M ($1.65B PIPE Sep 2025)
  - RIOT: 403M → 350M (overstated dilution corrected)
  - DJT: 280M → 278M (minor drift)
  - BTBT: 335M → 324M (overstated dilution corrected)
  - KULR: 49M → 45.67M (internal inconsistency fixed)
- [x] Fix MSTR totalDebt ($10B → $8.2B) - note redemptions
- [x] Research and update debt structures for all companies
- [x] Audit cash treatment per company (free vs restricted)

### 4.6 Documentation - COMPLETE
- [x] Document data source for each company (now self-documenting via debtSource/cashSource fields in code)
- [x] Document update cadence (already in ROADMAP.md Tier 1/2/3 system)
- [x] Document how to add a new company (added to CLAUDE.md)

---

## Phase 5: Delete Old Monitoring System
**Status**: COMPLETE

- [x] Remove `src/lib/monitoring/` directory (moved SEC/LLM files to `src/lib/sec/`)
- [x] Remove related cron jobs (monitoring, realtime, financials crons deleted)
- [x] Drop unused database tables (no database - project uses TypeScript files)
- [x] Remove `/api/monitoring/*` routes
- [x] Remove `/admin/pending` page
- [x] Update imports throughout codebase

---

## Phase 6: Comparison Engine
**Status**: COMPLETE (but incomplete verification)

- [x] Fix comparison engine to use holdings-history.ts (same source as frontend)
- [x] Add Discord webhook notifications for discrepancy alerts
- [x] Add Yahoo Finance fetcher as second source for share validation
- [x] Cron runs twice daily (2pm and 5pm UTC) at `/api/cron/comparison`
- [x] Manual trigger: `?manual=true&dryRun=true` for testing

**Initial Results (2026-01-22):** 66 discrepancies found (49 major, 7 moderate, 10 minor)

**Limitation discovered**: The comparison engine only tells us "these numbers differ." It doesn't:
- Tell us which value is correct
- Investigate where our value came from
- Verify primary sources

This is incomplete verification. Phase 7 completes it.

---

## Phase 7: Complete Verification System
**Status**: IN PROGRESS

### The Problem

The comparison engine finds discrepancies but doesn't determine truth. When we tried to "fix" discrepancies:
- MARA: Grabbed wrong SEC field (basic instead of diluted) → 378M instead of 470M
- MSTR: Entered 725K with no supporting 8-K → should have been 687K

Both errors were made confidently by a single agent. The comparison engine couldn't catch them because it only compares numbers, it doesn't verify sources.

### The Solution: Adversarial Verification

Verification isn't just "do the numbers match?" It's:
1. **Where did our value come from?** (check git history, find cited source)
2. **Does the cited source actually say that?** (read the primary document)
3. **Where did the comparison value come from?** (is it also verified?)
4. **Which is correct?** (weigh evidence from primary sources)

This is now documented in CLAUDE.md as a mandatory process before any data edit.

### Phase 7a: Establish the Process
**Status**: COMPLETE

- [x] Define adversarial verification process (CLAUDE.md)
- [x] Define what "verified" means (primary source document, not news articles)
- [x] Define two data types: verifiable (need primary source) vs estimated (need methodology)
- [x] Document the 5 questions that must be answered before any edit
- [x] Test on real cases: MARA, RIOT, GAME, Metaplanet, MSTR

### Phase 7b: Test the Process
**Status**: IN PROGRESS

The process exists but we need to verify it actually catches errors.

**Testing approach:**
- [ ] Run adversarial review on remaining ~60 discrepancies
- [ ] Track: Did the process catch issues the comparison engine missed?
- [ ] Track: Did the process prevent bad fixes?
- [ ] Track: How often does "our value" turn out to be correct vs wrong?

**Already tested (2026-01-22):**
| Company | Discrepancy | Process caught | Result |
|---------|-------------|----------------|--------|
| MSTR | 725K vs 709K | ✅ Our value had no source | Fixed to verified 8-K values |
| RIOT | Shares + holdings | ✅ Found multiple errors | Fixed shares and BTC count |
| GAME | 98M vs mNAV 447M | ✅ mNAV was wrong | Our value correct, flagged mNAV error |
| Metaplanet | Share structure | ✅ Documented complexity | Added provenance for 1.43B FD |
| MARA | 378M vs 495M | ✅ Previous fix was wrong | Corrected with methodology |

**Remaining to test:**
- [ ] Work through remaining discrepancies using the process
- [ ] Document success/failure rate
- [ ] Refine process based on what we learn

### Phase 7c: Estimates and Provenance
**Status**: PENDING (after 7b)

For data that can't be directly verified (shares between quarters):

**Schema for estimates:**
```typescript
{
  sharesOutstandingDiluted: 495_000_000,
  sharesSource: "ESTIMATE: SEC Q3 diluted + ATM",
  sharesMethodology: "sec-diluted-plus-atm",
  sharesConfidence: "medium",
  sharesConfidenceRange: { floor: 470_000_000, ceiling: 500_000_000 },
}
```

**UI requirements:**
- [ ] Indicate estimates (e.g., "~495M" or "495M (est)")
- [ ] Show methodology on hover/click
- [ ] Show confidence level and range
- [ ] Link to source documentation

### Infrastructure
- [ ] Add DISCORD_WEBHOOK_URL to Vercel production
- [ ] Decide: Exclude foreign companies from mNAV comparisons (currency mismatch)?

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
| 2026-01-21 | Add restrictedCash field for encumbered cash | freeCash = cashReserves - restrictedCash; display shows "Free Cash" when restricted |
| 2026-01-21 | Document debt structures with source tracking | debtSource/debtAsOf fields for 11 major companies; enables user verification |
| 2026-01-21 | Add cash source tracking | cashSource/cashAsOf fields for 17 companies with significant cash reserves |
| 2026-01-21 | Skip redundant documentation tasks | Data sources now self-documenting in code; only added "how to add company" guide to CLAUDE.md |
| 2026-01-21 | Delete old monitoring system | Removed complex untested monitoring; kept SEC auto-update (simpler, git-based); moved reusable SEC/LLM code to src/lib/sec/ |
| 2026-01-22 | Fix comparison engine data source | Changed loadOurValues() to use holdings-history.ts (same as frontend) instead of stale companies.ts |
| 2026-01-22 | Add Discord notifications | Send alerts when discrepancies > 5% found; summarize by severity |
| 2026-01-22 | Add Yahoo Finance fetcher | Second source for share count validation beyond mNAV.com |
| 2026-01-22 | Adversarial review for share counts | Single-agent fixes are error-prone (MARA 378M mistake); need proposer→challenger→resolution flow |
| 2026-01-22 | Split Phase 7 into 7a/7b | Must establish estimation process before applying fixes; "fix process before fixing data" |
| 2026-01-22 | MARA: 470M diluted + 25M ATM = 495M | Previous "fix" to 378M was wrong (used basic not diluted); Q3 2025 was profit quarter |
| 2026-01-22 | Show estimates with provenance in UI | When shares are estimated (not direct SEC), display must indicate estimate, methodology, confidence, and range |
| 2026-01-22 | Adversarial verification is part of verification, not change control | Comparison engine only finds differences; adversarial process determines truth by investigating sources |
| 2026-01-22 | "Verified" means reading primary source document | News articles and web search results are claims, not verification; must read actual SEC filings or company pages |
| 2026-01-22 | Must verify BOTH existing value AND proposed replacement | MSTR had 725K with no source; I almost replaced it with 687K from web search (also unverified) |

---

## Completed Phases

### Phase 0-3: Planning, Schema, Fetchers, Comparison
- All complete, see git history
- 160 tests passing
- Fetchers built for: mNAV, Strategy, SharpLink, SEC XBRL, Metaplanet, LiteStrategy
