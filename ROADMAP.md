# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-01-21
> **Current Phase**: 4 - Alert System
> **Status**: Phase 3 cron jobs complete, 112 tests passing

---

## RESUME HERE

**Phase 3 COMPLETE** - Cron jobs configured in Vercel.

**Cron Schedule (vercel.json):**
- `/api/cron/monitoring` - hourly at :00 (existing monitoring system)
- `/api/cron/sec-update` - hourly at :30 (SEC 8-K auto-update to companies.ts)
- `/api/cron/comparison` - twice daily at 9am/12pm ET (comparison engine discrepancies)

**Test Coverage (112 tests):**
- Fetchers: mNAV (15), Strategy (12), SharpLink (12), SEC XBRL (17) = 56 tests
- LLM Extractor: 20 tests
- SEC Auto-Update Adapter: 17 tests
- Comparison Engine: 19 tests

**Next:**
- Phase 4: Email alerts for discrepancies
- Phase 5: Review UI for pending discrepancies

---

## The Problem

Our data lives in too many places with no clear hierarchy:
- TypeScript files (companies.ts, holdings-history.ts, etc.)
- PostgreSQL database
- Google Sheets overrides
- Live APIs (mNAV.com, SharpLink)

Result: Same field can have different values depending on which source is checked.

## The Goal

**Current state** lives in TypeScript files (companies.ts):
- Edited manually (by Claude or human)
- SEC filings auto-update (exception)
- Version controlled in git
- Changes are reviewable via diffs

**Historical data** lives in PostgreSQL:
- Snapshots for charts
- Discrepancy records
- Audit trail
- Populated by automated fetchers

**Comparison engine** compares sources and flags discrepancies:
- SEC: Hourly check → auto-update → immediate notification
- Other sources: Twice daily (9am, 12pm) → flag discrepancy → email digest → human review

---

## Phase 0: Planning
**Status**: COMPLETE

- [x] Map all 50 companies and their available data sources
- [x] Identify companies with official dashboards (18 found)
- [x] Identify third-party trackers (TAO Treasuries, XRP Insights, etc.)
- [x] Document current system architecture
- [x] Decide where current vs historical data lives
- [x] Decide fetch frequency
- [x] Decide alert mechanism
- [x] Decide on review UI
- [x] Define database schema for historical/discrepancy tables
- [x] Define comparison engine logic (see src/lib/comparison/COMPARISON_ENGINE.md)
- [x] Get sign-off on plan before coding

---

## Phase 1: Database Schema
**Status**: COMPLETE

Goal: Create tables for historical data and discrepancies.

- [x] Design snapshots table (already exists: holdings_snapshots, 91 rows)
- [x] Design discrepancies table
- [x] Design fetch_results table
- [x] Run migration (006-discrepancies.sql)
- [x] Backfill: holdings_snapshots has 91 rows of historical data; fetch_results populated by comparison engine

---

## Phase 2: Source Fetchers
**Status**: COMPLETE (6 dashboard fetchers + mNAV aggregator + SEC 8-K auto-update)

Goal: Build modules that can fetch data from each source type.

### Official Dashboards (6 dedicated fetchers built)
- [x] strategy.com (MSTR) - src/lib/fetchers/dashboards/strategy.ts
- [x] sharplink.com (SBET) - src/lib/fetchers/dashboards/sharplink.ts
- [x] defidevcorp.com (DFDV) - src/lib/fetchers/dashboards/defidevcorp.ts
- [x] xxi.mempool.space (XXI) - src/lib/fetchers/dashboards/xxi-mempool.ts (on-chain proof)
- [x] metaplanet.jp (3350.T) - src/lib/fetchers/dashboards/metaplanet.ts (HTML parse)
- [x] litestrategy.com (LITS) - src/lib/fetchers/dashboards/litestrategy.ts (HTML parse)
- [~] FWDI - no dashboard API found (use SEC)
- [~] ASST - treasury.strive.com redirects to third-party tracker (use SEC)
- [~] NAKA - covered by mNAV fetcher (no separate dashboard)
- [~] H100.ST - covered by mNAV fetcher (treasury.h100.group is third-party StrategyTracker)
- [~] HSDT - no dashboard API (use SEC)
- [~] UPXI - no dashboard API (use SEC)

### Aggregators
- [x] mNAV.com API - src/lib/fetchers/mnav.ts
- [ ] BitcoinTreasuries.net

### SEC EDGAR
- [x] XBRL API fetcher (balance sheet: debt, cash, preferred, shares) - src/lib/fetchers/sec-xbrl.ts
- [x] 8-K parser (holdings announcements) - src/lib/sec-auto-update/index.ts
- [x] Auto-update flow (git commit/push) - integrated in sec-auto-update adapter

---

## Phase 2.5: Testing Infrastructure
**Status**: COMPLETE (95 tests passing)

Goal: Comprehensive test coverage for all implemented features.

### Setup
- [x] Vitest configuration (vitest.config.ts)
- [x] Test setup file (src/test/setup.ts)
- [x] npm test scripts (test, test:run, test:coverage)

### Fetcher Tests
- [x] mNAV fetcher (src/lib/fetchers/mnav.test.ts) - 15 tests
- [x] Strategy.com fetcher (src/lib/fetchers/dashboards/strategy.test.ts) - 12 tests
- [x] SharpLink fetcher (src/lib/fetchers/dashboards/sharplink.test.ts) - 12 tests
- [x] SEC XBRL fetcher (src/lib/fetchers/sec-xbrl.test.ts) - 17 tests

### Core Logic Tests
- [x] LLM extractor (src/lib/monitoring/parsers/llm-extractor.test.ts) - 20 tests
- [x] SEC auto-update adapter (src/lib/sec-auto-update/index.test.ts) - 17 tests
- [x] Comparison engine (src/lib/comparison/engine.test.ts) - 19 tests

### Integration Tests
- [ ] End-to-end fetch → compare flow (deferred - unit tests sufficient for now)
- [ ] SEC filing detection → extraction → update (deferred)

---

## Phase 3: Comparison Engine
**Status**: COMPLETE

- [x] Implement comparison logic (engine.ts)
- [x] Load our values from companies.ts
- [x] Compare against fetched values
- [x] Record in fetch_results table
- [x] Create discrepancy records when values differ
- [x] Fix strategy.com fetcher API field access
- [x] Cron jobs:
  - [x] `/api/cron/sec-update` - hourly SEC 8-K auto-update
  - [x] `/api/cron/comparison` - twice daily comparison (9am, 12pm ET)

---

## Phase 4: Alert System
**Status**: NOT STARTED

- [ ] Email service integration
- [ ] Immediate notification for SEC updates
- [ ] Batched digest for discrepancies (9am, 12pm)

---

## Phase 5: Review UI
**Status**: NOT STARTED

- [ ] List pending discrepancies
- [ ] Show all sources and their values
- [ ] Approve/reject buttons
- [ ] Log resolution

---

## Phase 6: Historical Data & Charts
**Status**: NOT STARTED

- [ ] Backfill historical holdings
- [ ] Backfill historical mNAV
- [ ] Charts using verified data

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-20 | Flag ALL discrepancies | Cant know whats noise vs signal without investigating |
| 2026-01-20 | 18 companies have official dashboards | Systematic search completed |
| 2026-01-20 | mNAV.com is just another aggregator | They made mistakes (XXI Class B shares) |
| 2026-01-20 | TypeScript for current state, DB for history | Simpler, no async bugs, git reviewable |
| 2026-01-21 | No staleness scoring | Just show source + date, users judge |
| 2026-01-21 | Email digest (9am, 12pm) not Discord | Discord too noisy, email easier to review |
| 2026-01-21 | Build simple review UI | Reduces manual work |
| 2026-01-21 | Source config in company-sources.ts | One place per company |
| 2026-01-21 | One file per fetcher source type | Independent, easy to test/fix |
| 2026-01-21 | Start with holdings only | Validate before expanding |
| 2026-01-21 | SEC filings auto-update | SEC is authoritative, auto-update + notify |
| 2026-01-21 | Hourly SEC, twice-daily others (9am, 12pm) | Faster for trusted source, 12pm still actionable |

---

## Tradeoffs Accepted

| Decision | What We Gain | What We Give Up |
|----------|--------------|-----------------|
| TypeScript for current state | Simplicity, git history | Manual updates (except SEC) |
| SEC auto-update | Less manual work | Some automation complexity |
| Twice daily (not real-time) | Simpler | Could miss intraday (acceptable) |
| Simple review UI | Easier review | Dev time to build |

**Running tally:**
- Manual work: LOW (SEC auto-updates)
- Automation: MEDIUM (SEC auto-updates, fetchers, comparison)
- Complexity: MEDIUM (git ops, simple UI)

---

## Source Coverage Reference

- 18 companies with official dashboards
- 4 asset-specific third-party trackers
- 41 US companies with SEC EDGAR
- 15 BTC companies covered by mNAV.com
