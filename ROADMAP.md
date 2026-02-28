# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-02-27
> **Current Phase**: 10e-lite → 10b/10c/10d (Provenance + agent-read APIs + ingestion)

---

## AGENTS WORKBOARD (live)

**Legend:**
- **Agent 1** = primary orchestrator (product + core data architecture)
- **Agent 2** = D1 backfills / migration workflows
- **Agent 3** = CI/lint ratchet + repo hygiene (this assistant in the #agent-3 thread)

Update this section whenever you start/stop work so other agents can instantly see what’s in-flight.

### Now (in progress)
- **Phase B: Backfill quarter-end `basic_shares` into D1**
  - **Owner:** Agent 2
  - **PR:** #40 https://github.com/Sashamine/dat-tracker-next/pull/40
  - **Status:** D1 schema mismatch fixed (use `datapoints.as_of` instead of `artifacts.filed_at/period_end`). Needs merge + workflow dry-run + real run.
  - **DoD:** Dry-run summary looks sane; then write mode for 1 ticker/date-range; then expand.

- **10c: 30-minute ingestion + transform**
  - **Owner:** Agent 1
  - **Status:** Next up (after 10b completion): convert inventory/backfill learnings into scheduled ingestion + invariant checks.
  - **DoD:** Cron-triggered ingestion run + alerting/regression checks; no `unknown`/dupes regressions.

- **10d: Verification plumbing (Agent 4)**
  - **Owner:** Agent 4
  - **Status:** Implemented and validated end-to-end in D1 (write mode works).
  - **Merged PRs:**
    - #58 d1-migrate workflow + d1-apply-migration script
    - #59 fix verifier to use schema-native `datapoints.entity_id`
    - #62 join `artifacts.source_url` (datapoints has no source_url)
    - #72 verifier workflow accepts `entity_id` (ticker alias) + new API `GET /api/d1/verifications/latest`
  - **Ops executed:**
    - Applied migration `010-datapoint-verifications.sql` to D1
    - Smoke test: `verify-datapoints (10d)` wrote 5 rows for MSTR
  - **Open gap discovered (10b/10c provenance):**
    - 323 `artifacts` rows with `source_type='sec_filing'` have `source_url` NULL and `accession` NULL, so receipts can’t be reconstructed for those.

- **CI/Lint ratchet (required checks scope expansion)**
  - **Owner:** Agent 3
  - **Status:** Ongoing: gradually expand `lint-app` scope (admin → key API routes) while keeping changes surgical.
  - **Recent:** merged multiple CI hygiene PRs; current open PR: #64 (expand lint-app to api/prices)

### Next (queued)
- **10d: Verification + confidence scoring**
  - Automated checks + DLQ/manual review routing (per CLAUDE.md).
- **UI: Split miner vs treasury sector stats** (from older notes)

### Done (recent)
- **10b: R2 inventory → artifacts backfill (DONE 2026-02-28)**
  - Prefix discovery: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530779754
  - Full bucket dry-run (cap 2000): https://github.com/Sashamine/dat-tracker-next/actions/runs/22530831208
  - Full bucket live run: https://github.com/Sashamine/dat-tracker-next/actions/runs/22530938511
  - Post-run D1 summary (unknown=0, duplicates=[]): https://github.com/Sashamine/dat-tracker-next/actions/runs/22531146011
  - Ops ledger: ops/STATUS.md

- **Phase A: Split-proof treasury yield**
  - Merged PR #38 (normalize shares via `corporate_actions` at read-time)
- **10e-lite: Agent-optimized read APIs (value + receipts)**
  - Merged PR #44 (`/api/company/[ticker]/metrics` + `/api/company/[ticker]/metric/[metric]`)

---

## Phase 10 — Near Real-Time, Correct, Full Provenance (Cloudflare)

**Goal**: Make data updates reliably within **30 minutes**, remain **reproducible/correct**, and expose **full provenance** that is easy for agents to consume.

### 10a — Provenance primitives (DONE)
- ✅ Cloudflare **R2** adopted for immutable raw artifacts (filings, XBRL, companyfacts snapshots, dashboard captures).
- ✅ Cloudflare **D1** database created: `dat-tracker`
- ✅ Core tables created:
  - `artifacts` — immutable raw inputs indexed by hash + R2 key
  - `runs` — every transform/ingestion execution (code SHA + timing)
  - `datapoints` — metric values with lineage (artifact_id + run_id + method + confidence)

### 10b — R2 inventory + artifacts backfill
**Why**: provenance only works if every existing object in R2 is indexed.

Deliverables:
- Define an R2 key convention map (prefixes by ticker/filing-type/batch).
- Backfill `artifacts` rows for existing R2 objects:
  - classify `source_type` (sec_filing/sec_xbrl/companyfacts/dashboard/manual)
  - record `content_hash` (or ETag if we can rely on it), `fetched_at` if available, and `r2_key`

### 10c — 30-minute ingestion + transform
Deliverables:
- Cloudflare **Worker + Cron Trigger** every 30 minutes:
  - pull new SEC items / dashboard updates
  - write raw artifacts to R2
  - insert `artifacts`
  - run deterministic transforms → insert `datapoints`
- Idempotency guarantees:
  - dedupe by content hash
  - safe re-runs without duplicate datapoints

### 10d — Verification + confidence scoring
Deliverables:
- Automated checks (source reachability, sanity ranges, cross-source compare)
- Confidence scoring to route:
  - high confidence → publish as latest
  - low confidence → DLQ/manual review (CLAUDE.md process)

### 10e — Agent-optimized read APIs
Deliverables:
- Minimal endpoints that always return **value + receipts**:
  - `GET /company/:ticker/metrics` (latest datapoints + provenance bundle)
  - `GET /company/:ticker/metric/:metric`
- Each response includes: `as_of`, `reported_at`, `source_url`, `artifact_id`, `run_id`, `method`, `confidence`

---

## RESUME HERE

**Session 2026-02-02:**

### Miner Badge Added
- Added "⛏️ Miner" badge to data table for companies with `isMiner: true`
- Orange color scheme with tooltip explaining miners produce BTC

### Upcoming: Multi-Asset Companies Tab

**Goal**: Add a "Multi-Asset" category for companies holding multiple crypto assets.

**Why**: Companies like Remixpoint (3825.T) hold BTC + ETH + XRP + SOL + DOGE. Can't categorize under single asset.

**Implementation ideas**:
- New `asset: "MULTI"` value or `assets: ["BTC", "ETH", "SOL"]` array
- Multi-asset tab in UI alongside BTC/ETH filters
- Show breakdown of holdings by asset
- mNAV calculation uses total crypto value across all assets

**Candidates**:
- Remixpoint (1,411 BTC + 901 ETH + 1.2M XRP + 13,920 SOL + 2.8M DOGE)
- Others TBD

---

### Upcoming: Split Sector Statistics by Miner vs Treasury

**Goal**: Divide the sector statistics panel to show separate aggregates for:
1. **Pure Treasuries** - Companies that only hold BTC (MSTR, SMLR, etc.)
2. **Miners with HODL** - Companies that mine and hold BTC (MARA, RIOT, CLSK, etc.)

**Why**: Miners have different dynamics:
- They produce BTC continuously, so mNAV premium is justified by mining capacity
- Their holdings grow from operations, not just purchases
- Miner mNAV is still valid/useful, just shouldn't be mixed with treasury mNAV in averages

**Implementation ideas**:
- Add tabs or toggle to sector stats: "All | Treasuries | Miners"
- Show separate totals: total BTC held, total market cap, weighted avg mNAV
- **Separate mNAV benchmarks**: Treasury avg mNAV vs Miner avg mNAV
- Maybe show miner-specific stats: combined hashrate, monthly BTC production

---

**Session 2026-01-25:**

### Dilutive Instruments Complete (Phase 8a-8c)

Created `src/lib/data/dilutive-instruments.ts`:
- Tracks convertibles, options, warrants with strike prices and provenance
- `getEffectiveShares()` calculates dilution based on current stock price
- Integrated into `market-cap.ts` for dynamic mNAV calculation
- BTCS and UPXI instruments populated with SEC filing sources

### AMF API Integration

Created `src/lib/fetchers/amf.ts` for French regulatory filings:
- API: `https://dilaamf.opendatasoft.com/api/v2/` (OpenDataSoft)
- Query by ISIN (Capital B: FR0011053636)
- Parses filing titles to extract BTC holdings
- Returns filing date, holdings, PDF URL

### ALTBG (Capital B) Data Fixed

Major corrections from AMF + mNAV.com verification:
- Holdings: 2,201 → 2,823 BTC (Nov 25, 2025 AMF filing)
- Shares: 50M → 227M basic (mNAV.com Jan 2026)
- Root cause: Sep 2025 EUR58M private placement caused ~4x dilution

### Next Steps

1. Phase 8d: Populate dilutive instruments for remaining ~52 companies
2. ALTBG needs instruments added (~165M shares from convertibles)
3. Continue company verification (user provides ticker)

---

**Session 2026-01-22:**

### Key Decision: Verification Should Be One Coherent System

The comparison engine (Phase 6) only finds discrepancies. The adversarial process (CLAUDE.md) determines truth. These were separate - that's wrong.

**New architecture:**
```
Comparison Engine
       ↓
Verification System (integrated)
    - Check our sourceUrl
    - Verify source still valid
    - Determine confidence
       ↓
  ┌────┴────┐
  ↓         ↓
HIGH conf  LOW conf
  ↓         ↓
Auto-resolve  Manual review (CLAUDE.md)
```

### What Exists Now

- **Comparison engine**: Finds discrepancies ✅
- **Manual review process**: Documented in CLAUDE.md ✅
- **Source tracking**: Partial (some entries have sourceUrl, many don't)
- **Automated verification**: NOT STARTED
- **Confidence scoring**: NOT STARTED

### Manual Review Tests (2026-01-22)

| Company | Finding | Result |
|---------|---------|--------|
| MSTR | 725K had no source | Fixed to verified 8-K values |
| RIOT | Multiple errors | Fixed shares and BTC count |
| GAME | mNAV was wrong | Our value correct |
| Metaplanet | Complex structure | Documented provenance |
| MARA | Previous fix was wrong | Corrected with methodology |

### Next Steps

1. **Phase 7a**: ✅ Schema complete, tests passing. Continue adding sourceUrl/sourceType to more entries.
2. **Phase 7b**: Add automated source verification to comparison engine
3. **Phase 7c**: Add confidence scoring for auto-resolve vs manual review
4. **Phase 7d**: Manual review is already documented (CLAUDE.md)
5. **Phase 7e**: UI for estimates with provenance

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

**Foreign regulatory APIs:**
| Country | Regulator | API | Companies |
|---------|-----------|-----|-----------|
| France | AMF | `dilaamf.opendatasoft.com` | ALTBG (Capital B) |
| Japan | EDINET | TBD | 3350.T (Metaplanet) |
| Hong Kong | HKEX | TBD | 0434.HK (Boyaa) |
| Sweden | FI | TBD | H100.ST |

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

## Phase 7: Integrated Verification System
**Status**: IN PROGRESS

### The Problem

The comparison engine finds discrepancies but doesn't determine truth. Manual fixes are error-prone:
- MARA: Grabbed wrong SEC field (basic instead of diluted) → 378M instead of 470M
- MSTR: Entered 725K with no supporting 8-K → should have been 687K

### The Solution: Single Coherent Verification System

Verification should be integrated into the comparison engine, not a separate manual process.

```
Comparison Engine (finds discrepancy)
         ↓
Verification System (investigates)
    - Check source of our value (sourceUrl field)
    - Verify cited source is still valid (fetch and check)
    - Check source of comparison value
    - Determine confidence level
         ↓
   ┌─────┴─────┐
   ↓           ↓
High confidence   Low confidence
   ↓              ↓
Auto-resolve    Flag for manual review
```

### Phase 7a: Source Tracking
**Status**: COMPLETE

Our data needs provenance so the verification system can check it.

**Completed (2026-01-22):**
- [x] `holdingsSource` and `holdingsSourceUrl` exist in companies.ts
- [x] `source` field exists in holdings-history.ts entries
- [x] Schema updated: `sourceUrl`, `sourceType`, `methodology`, `confidence`, `confidenceRange` fields added
- [x] Test file created: `holdings-history.test.ts` with 13 tests
- [x] Source tracking coverage: 50/311 entries (16.1%) - all recent entries covered
- [x] Recent entries coverage: 50/50 companies have sourceUrl on most recent entry
- [x] Added SEC CIKs for all US companies to company-sources.ts
- [x] Added international filing IDs (EDINET, HKEX, Euronext, NGM, SEDAR)

**Coverage stats:**
| Field | Coverage |
|-------|----------|
| sourceUrl | 50/311 (16.1%) |
| sourceType | 50/311 (16.1%) |
| methodology | 2/311 (0.6%) |

**Tests for 7a:** ✅ All passing (13 tests)

### Phase 7b: Automated Source Verification
**Status**: COMPLETE

Enhance comparison engine to verify sources, not just compare numbers.

**Completed (2026-01-22):**
- [x] Created `source-verifier.ts` module with verification logic
- [x] Extended `OurValue` interface to include `sourceUrl` and `sourceType`
- [x] Added `getLatestSnapshot()` helper to holdings-history.ts
- [x] Integrated verification into comparison engine (calls `verifySource` on discrepancies)
- [x] Updated Discord notifications to show verification status
- [x] When discrepancy found, fetch our sourceUrl
- [x] Check if the source still returns the value we have
- [x] If source changed or value differs, flag as "source_drift"
- [x] If source URL is invalid/404, flag as "source_invalid"
- [x] If no sourceUrl, flag as "unverified"

**Verification statuses:**
| Status | Meaning |
|--------|---------|
| `verified` | Our source confirms our value (within 5% tolerance) |
| `source_drift` | Our source shows different value |
| `source_invalid` | Our sourceUrl is 404/unreachable |
| `source_available` | URL is reachable but we can't parse value |
| `unverified` | No sourceUrl on our data |

**Verification by source type:**
- **SEC EDGAR (shares/debt/cash)**: Uses `sec-xbrl` fetcher to verify
- **SEC EDGAR (holdings)**: URL availability only (holdings not in XBRL)
- **Company dashboards**: Uses existing fetchers (strategy, sharplink, metaplanet, etc.)
- **Other URLs**: URL availability check (HEAD request)

**Tests for 7b:** ✅ All passing (13 tests)
- [x] Test: No sourceUrl → "unverified"
- [x] Test: URL 404 → "source_invalid"
- [x] Test: Source verifies our value → "verified"
- [x] Test: Source shows different value → "source_drift"
- [x] Test: Within 5% tolerance → "verified"
- [x] Test: SEC URL for holdings → "source_available" (XBRL has no holdings)
- [x] Test: Dashboard fetcher integration
- [x] Test: Fetcher error handling

### Phase 7c: Confidence Scoring
**Status**: COMPLETE

Determine when to auto-resolve vs flag for manual review.

**Completed (2026-01-22):**
- [x] Created `confidence-scorer.ts` module with calculateConfidence function
- [x] Integrated confidence scoring into comparison engine
- [x] Updated Discord notifications with confidence levels and action counts
- [x] Added known bad source tracking (mNAV.com for GAME holdings)
- [x] 5% tolerance for "agreement" between our value and external sources

**Confidence levels:**
| Level | Criteria | Action |
|-------|----------|--------|
| HIGH | Our source verifies, external agrees | Auto-confirm |
| HIGH | Our source verifies, external wrong (known bad source) | Auto-confirm, log external error |
| MEDIUM | Our source verifies, external disagrees | Flag for review |
| LOW | Our source invalid or missing | Flag for review |
| LOW | Estimate without methodology | Flag for review |

**Recommended actions:**
| Action | Meaning |
|--------|---------|
| `auto_confirm` | Our value is correct, no action needed |
| `log_external_error` | Our value correct, external source is wrong (logged) |
| `review_conflict` | Sources disagree, needs manual review |
| `review_unverified` | Our source is invalid/missing, needs review |

**Thresholds:**
- Auto-confirm: HIGH confidence
- Flag for review: MEDIUM or LOW confidence
- Block changes: No source verification possible

**Tests for 7c:** ✅ All passing (16 tests)
- [x] Test: Source verifies + external agrees → HIGH confidence
- [x] Test: Source verifies + known bad external → HIGH confidence (log_external_error)
- [x] Test: Source verifies + external disagrees → MEDIUM confidence
- [x] Test: Source invalid → LOW confidence
- [x] Test: Source drift → LOW confidence
- [x] Test: No sourceUrl → LOW confidence
- [x] Test: Source available but external agrees → MEDIUM confidence
- [x] Test: Source available but external disagrees → LOW confidence
- [x] Test: Empty source values → HIGH confidence
- [x] Test: Zero values → HIGH confidence
- [x] Test: formatConfidenceResult formatting

### Phase 7d: Manual Review Process
**Status**: IN PROGRESS

For LOW confidence cases, manual review follows the adversarial process.

**Completed (2026-01-22):**
- [x] Created `/api/discrepancies` endpoint to fetch from database
- [x] Created `/discrepancies` review page with filters (status, severity, time range)
- [x] Simplified Discord alerts to summary + link (no more walls of text)
- [x] Flow: Discord alert → click link → review page → start Claude session to investigate

**Remaining:**
- [ ] Test end-to-end flow with real discrepancies
- [ ] Add ability to mark discrepancies as resolved/dismissed from UI (optional)
- [ ] Track review outcomes (which value was correct)

For LOW confidence cases, manual review follows the adversarial process:

1. Where did our value come from? (git history, cited source)
2. Does the cited source actually say that? (read primary document)
3. Where did the comparison value come from? (is it verified?)
4. Which is correct? (weigh evidence)
5. Is this verifiable data or an estimate? (methodology if estimate)

**Already tested manually (2026-01-22):**
| Company | Discrepancy | Finding | Result |
|---------|-------------|---------|--------|
| MSTR | 725K vs 709K | Our value had no source | Fixed to verified 8-K values |
| RIOT | Shares + holdings | Multiple errors | Fixed shares and BTC count |
| GAME | 98M vs mNAV 447M | mNAV was wrong | Our value correct |
| Metaplanet | Share structure | Complex preferred | Documented provenance |
| MARA | 378M vs 495M | Previous fix was wrong | Corrected with methodology |

**Tests for 7d:**
- [ ] Test: LOW confidence discrepancy → flagged in Discord with review instructions
- [ ] Test: Review outcome recorded (which value was correct, why)
- [ ] Document: Success rate of manual reviews (our value correct vs wrong)

### Phase 7e: Estimates and UI Provenance
**Status**: PENDING

For data that can't be directly verified (shares between quarters):

**Schema:**
```typescript
{
  sharesOutstandingDiluted: 495_000_000,
  sourceType: "estimate",
  sourceUrl: null,
  methodology: "SEC Q3 diluted (470M) + ATM estimate (25M)",
  confidence: "medium",
  confidenceRange: { floor: 470_000_000, ceiling: 500_000_000 },
}
```

**UI requirements:**
- [ ] Indicate estimates (e.g., "~495M" or "495M (est)")
- [ ] Show methodology on hover/click
- [ ] Show confidence level and range
- [ ] Different styling for verified vs estimated data

**Tests for 7e:**
- [ ] Test: Estimate entries have required fields (methodology, confidence, confidenceRange)
- [ ] Test: UI renders estimate indicator for sourceType="estimate"
- [ ] Test: UI shows methodology in tooltip/popover
- [ ] Test: UI shows confidence range when present
- [ ] Test: Verified data renders differently from estimated data

---

## Phase 8: Dilutive Instruments Tracking
**Status**: IN PROGRESS (8a-8c complete, 8d in progress)

### The Problem

Share counts depend on whether dilutive instruments are "in the money":
- BTCS: 47M basic, but options at $2.64 are in-the-money at $2.89 stock → should use 50M
- UPXI: 59M basic, convertibles at $4.25/$2.39 are out-of-money at $2.12 stock → use 59M

Currently we manually decide "use basic" or "use diluted" per company. This:
- Doesn't track WHY we made that choice
- Doesn't update when stock price crosses strike prices
- Has no provenance for the instruments themselves

### The Solution: Track Instruments, Calculate Dynamically

Store dilutive instruments with full provenance. Calculate effective shares based on current price.

**Data structure:** `src/lib/data/dilutive-instruments.ts`
**Calculation:** `getEffectiveShares(ticker, basicShares, stockPrice)` returns basic, diluted, breakdown
**Integration:** `market-cap.ts` calls `getEffectiveShares()` in mNAV calculation

### Phase 8a: Data Structure
**Status**: COMPLETE (2026-01-25)

- [x] Create `dilutive-instruments.ts` with TypeScript interface
- [x] `sharesForMnav` in companies.ts = BASIC shares (dilution calculated dynamically)
- [x] Populate instruments for BTCS and UPXI with full provenance
- [x] Add tests for data structure validation (10 tests)

### Phase 8b: Calculation Function
**Status**: COMPLETE (2026-01-25)

- [x] Create `getEffectiveShares()` function
- [x] Returns: basic shares, effective diluted, breakdown by instrument
- [x] Each instrument shows: type, strike, shares, in/out of money status
- [x] `formatEffectiveShares()` for display
- [x] `getSharesProvenance()` for detailed provenance explanation

### Phase 8c: Integration
**Status**: COMPLETE (2026-01-25)

- [x] Update mNAV calculation to use `getEffectiveShares()` in `getMarketCapForMnavSync()`
- [x] Pass current stock price (USD) to calculation
- [x] Fall back to basic shares if no instruments defined (graceful degradation)
- [ ] Add provenance to mNAV tooltip (UI work - deferred)

### Phase 8d: Populate All Companies
**Status**: IN PROGRESS

- [x] BTCS: 3 instruments (2 convertibles, 1 option) - verified 2026-01-25
- [x] UPXI: 2 instruments (2 convertibles) - verified 2026-01-25
- [ ] Remaining ~52 companies need instrument research
- [ ] Each instrument needs: type, strike, shares, source, sourceUrl
- [ ] Track expiration dates where available
- [ ] Flag companies with complex structures (multiple tranches, variable conversion)

**Companies with known significant dilution (priority):**
- ALTBG: ~165M additional shares from convertibles (basic 227M → diluted 392M)
- Others TBD during verification process

### Phase 8e: Monitoring
**Status**: NOT STARTED

- [ ] Add check to filing-check cron: flag 8-Ks with "convertible", "warrant", "securities purchase"
- [ ] When stock price crosses a strike price, log the change in effective shares
- [ ] Optional: Discord alert when dilution status changes materially

### The Provenance Story

After this phase, we can answer:

> "Why does BTCS show 50.3M shares?"

> "Basic shares: 47,075,189 (10-Q Q3 2025)
> + Options at $2.64: 3,223,012 (IN money at $2.89 stock)
> - Convertible at $5.85: 1,709,402 (OUT of money)
> - Convertible at $13.00: 769,231 (OUT of money)
> = Effective diluted: 50,298,201
> Sources: SEC 10-Q Q3 2025, 8-K Jul 2024, 8-K Dec 2024"

---

## Phase 9: Burn Rate & mNAV Chart Fixes
**Status**: NOT STARTED
**Added**: 2026-01-29

### The Problem

1. **Burn rate data is unreliable** — XBRL `NetCashProvidedByUsedInOperatingActivities` includes non-cash items (stock-based comp, depreciation) that distort true cash burn
2. **mNAV charts need fixing** — Related to accurate burn projections and runway calculations

### What We Built (2026-01-29)

- `src/lib/fetchers/sec-xbrl.ts` — Extended with burn rate extraction + quality metrics (SG&A, stock comp, D&A, net income)
- `src/lib/verification/burn-quality.ts` — Calculates adjusted burn rate and quality score (0-100)
- `src/lib/verification/burn-staleness.ts` — Flags companies with stale burn data
- `src/lib/sec/filing-monitor.ts` — Detects new financial filings

### Quality Score Results (Top 26 companies)

| Score | Count | Action |
|-------|-------|--------|
| 80+ (High) | 4 | Reliable XBRL burn |
| 50-79 (Medium) | 11 | Acceptable |
| <50 (Low) | 8 | Need manual review |
| Miners | 3 | Use SG&A instead of OCF |

**Notable issues:**
- DJT: Score 0 (1746% stock comp ratio)
- MSTR: Score 20 (94% stock comp ratio)
- Miners (MARA/RIOT/CLSK): Using SG&A proxy instead of distorted OCF

### Phase 9a: Review Low-Quality Companies
**Status**: NOT STARTED

- [ ] Review 8 companies with quality score <50
- [ ] Manually determine appropriate burn rate for each
- [ ] Update `quarterlyBurnUsd` in companies.ts with verified values
- [ ] Add `burnSource` and `burnAsOf` fields where missing

### Phase 9b: Fix mNAV Charts
**Status**: NOT STARTED

- [ ] Identify specific chart issues
- [ ] Fix calculation/display bugs
- [ ] Ensure burn rate flows into runway projections correctly

### Phase 9c: Automate Burn Updates
**Status**: NOT STARTED

- [ ] Integrate burn-staleness checker into comparison cron
- [ ] Alert when burn data >6 months old (US) or >12 months (FPI)
- [ ] Alert when new financial filing detected for company with stale burn

---

## Future Work (Post-Phase 8)

### Historical Data Backfill
**Status**: NOT STARTED
**Priority**: LOW (site value, not verification system)

Historical entries (2020-2025) currently lack sourceUrl. This doesn't block the verification system (which only checks current values), but matters for:
- Historical mNAV accuracy on charts
- Auditability of past data

**Scope:**
- ~300 historical entries across all companies
- Add sourceUrl pointing to SEC EDGAR filings (10-Q, 10-K, 8-K)
- Add sourceType for each entry

**Approach:**
- Batch by company (MSTR first - most entries)
- Use SEC EDGAR search to find historical filings
- Low urgency - historical data is frozen, won't change

**When to do this:**
- After Phase 7 verification system is complete
- When we have time for non-critical improvements
- Could be done incrementally company-by-company

---

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
| 2026-01-22 | Verification should be one coherent system | Comparison engine finds discrepancies; verification determines truth; manual review is fallback for low confidence - not a separate process |
| 2026-01-22 | Focus sourceUrl on recent entries only | Historical entries (2020-2025) don't need sourceUrl for verification system; backfill later for historical chart accuracy |
| 2026-01-25 | Track ALL dilutive instruments (no threshold) | User rejected "only track >5% dilution" - if we want to be authoritative, track everything |
| 2026-01-25 | sharesForMnav = BASIC shares | Dilution calculated dynamically via dilutive-instruments.ts based on stock price vs strike price |
| 2026-01-25 | AMF API for French regulatory filings | Created `src/lib/fetchers/amf.ts` for Capital B (ALTBG). Query by ISIN, parse holdings from filing titles. Primary source for French companies. |
| 2026-01-25 | ALTBG data correction | Holdings: 2,201→2,823 BTC (AMF filing). Shares: 50M→227M basic (mNAV.com). Sep 2025 EUR58M private placement caused ~4x dilution. |

---

## Completed Phases

### Phase 0-3: Planning, Schema, Fetchers, Comparison
- All complete, see git history
- 200 tests passing
- Fetchers built for: mNAV, Strategy, SharpLink, SEC XBRL, Metaplanet, LiteStrategy
