# DAT Tracker Roadmap

> **Last Updated**: 2026-03-06

---

## Core Principles

- **Correctness before features** — every number must be verifiable
- **Permanence before convenience** — source documents cached forever
- **Measurement before expansion** — understand usage before scaling
- **HPS is the core metric** — the site answers "who grows crypto per share best?"

---

## Phase 0.5 — Product Framing (parallel track, can be done by separate agent)

> "A first-time visitor understands the DAT thesis in 3 seconds."

**Goal:** Reframe the homepage from "who holds the most crypto" to "who is best at growing crypto per share."

### 0.5.1 Homepage Leaderboard Pivot

**Deliverables:**
- [ ] Default sort: HPS Growth (90D) instead of treasury size
- [ ] Core columns: Company, Asset, HPS Growth (90D), mNAV, Treasury Value, Leverage
- [ ] Sector summary banner: Median HPS Growth, Median mNAV, Companies Growing HPS
- [ ] mNAV color context relative to sector median (<0.9x green, 0.9-1.3 neutral, >1.3x red)

**Data availability:** 55 companies have holdings + sharesForMnav. 54 have 90+ days of DAT history. HPS growth computable for nearly the entire universe.

### 0.5.2 Dilution vs Accretion Chart (Company Page)

**Deliverables:**
- [ ] Dual-axis chart: BTC/share (line) + shares outstanding (bar) over time
- [ ] Instantly shows: good managers (HPS up, shares stable) vs bad (shares exploding, HPS flat)
- [ ] This is the "Moneyball chart" — the signature visualization

### 0.5.3 mNAV vs HPS Growth Scatter Plot

**Deliverables:**
- [ ] X: mNAV (premium/discount), Y: HPS Growth
- [ ] Quadrants: upper-left = efficient wrappers, lower-right = overpriced + weak
- [ ] Every DAT as a labeled dot, sized by treasury value

### 0.5.4 AHPS Growth (future metric)

**Concept:** Accretive Holdings Per Share Growth — isolates management skill from crypto price movement. Measures how efficiently management converts capital access into more crypto per share. Could become the "EPS of the DAT sector."

**Status:** Deferred. Requires granular capital events data (currently available for ~5 companies: MSTR, BMNR, MARA, SBET, DDC). As the pipeline matures, more companies get full AHPS decomposition. For now, plain HPS Growth % is the leaderboard metric.

---

## Phase 1 — Immutable Provenance

> "Every number links to a permanent, cached source document."

### 1.1 R2 Document Coverage

**Goal:** Every cited source document is cached in R2 so links never break, regardless of what SEC/SEDAR/company sites do.

**Current state:**
- `/filings/{ticker}/{accession}` route exists (R2 first, SEC fallback)
- `processed-sec-docs/` has partial coverage
- `upload-processed-to-r2.ts` uploads to R2

**Deliverables:**
- [ ] Audit: which cited documents (sourceUrl, holdingsSourceUrl, debtSourceUrl, etc.) are NOT in R2?
- [ ] Bulk download + process missing SEC filings into R2
- [ ] Cache non-SEC sources (press releases, company dashboards, SEDAR+ filings) where possible
- [ ] For JS-rendered dashboards: store Playwright snapshots as dated artifacts
- [ ] Coverage metric: % of cited sources with R2 backup

**DoD:**
- Every `sourceUrl` in companies.ts resolves to a cached R2 document
- If SEC/SEDAR goes down, every citation still works

### 1.2 Provenance Chain Completeness

**Goal:** Every data field traces to: value → quote → document → permanent URL.

**Current state:**
- companies.ts has `sourceQuote`, `holdingsSourceUrl`, `accessionNumber` for most companies
- Cross-check script validates quote-value matches
- Some fields (debt, cash, preferred, shares) lack full citation chains

**Deliverables:**
- [ ] Extend citation fields to ALL data types (not just holdings):
  - debt: debtSourceQuote
  - cash: cashSourceQuote
  - shares: sharesSourceQuote
  - preferred: preferredSourceQuote
- [ ] Every field with a value must have: source URL + quote + as-of date
- [ ] Provenance for derived values: show inputs + calculation

**DoD:**
- For any number displayed on the site, you can programmatically retrieve:
  `value → sourceQuote → sourceUrl → R2 cached document`

---

## Phase 2 — Ground Truth Enforcement

> "Data integrity is enforced automatically, not manually."

### 2.1 Cross-Check in CI

**Goal:** The cross-check script runs on every commit and blocks merges with data integrity failures.

**Current state:**
- `scripts/cross-check-data.ts` exists, runs manually
- 0 FAIL, 15 WARN (all staleness), 15 INFO
- Checks: quote-value match, staleness, field consistency, shares sanity, source type alignment

**Deliverables:**
- [ ] Add cross-check to GitHub Actions / Vercel build
- [ ] FAIL = block merge, WARN = annotate PR, INFO = silent
- [ ] Staleness threshold config (currently 90d warn, 180d fail for tier 1)
- [ ] Track warning count over time — must not increase (ratchet)

**DoD:**
- No data change can merge if it introduces a FAIL
- Warning count is tracked and ratcheted down

### 2.2 Adversarial Verification Process (Automated)

**Goal:** New data changes go through automated verification before landing.

**Current state:**
- CLAUDE.md documents the adversarial process (manual)
- Provenance system exists for some companies (MSTR, MARA, BMNR, etc.)

**Deliverables:**
- [ ] PR bot: when companies.ts changes, auto-run cross-check and comment results
- [ ] For holdings changes: verify new value appears in cited source document
- [ ] For new companies: checklist validation (all required fields present)

**DoD:**
- Every data change is verified against its source before merging

---

## Phase 3 — Citation UX

> "Click any number, see the source quote, jump to the document."

### 3.1 Citation Click-Through

**Goal:** Every displayed number on the site is clickable → shows source quote → links to cached document.

**Current state:**
- Data table shows holdingsLastUpdated date + source link
- Company page shows some source info
- No universal "click to cite" pattern

**Deliverables:**
- [ ] Citation popover component: click any metric → see:
  - The value and as-of date
  - Verbatim source quote
  - Link to R2-cached document (with highlight/anchor if possible)
  - Source type badge (SEC filing, press release, company dashboard, etc.)
- [ ] Apply to: holdings, shares, debt, cash, mNAV inputs
- [ ] Mobile-friendly (bottom sheet on mobile, popover on desktop)

**DoD:**
- Every number on the data table and company page is clickable → citation

### 3.2 Filing Viewer Enhancement

**Goal:** When users click through to a source document, the relevant quote is highlighted.

**Current state:**
- `/filings/{ticker}/{accession}` route serves cached filings
- No quote highlighting

**Deliverables:**
- [ ] Anchor/highlight the specific quote in the filing viewer
- [ ] "Back to company" navigation
- [ ] Filing metadata header (company, date, filing type)

**DoD:**
- Click citation → filing opens with the relevant passage highlighted

---

## Phase 4 — Data Freshness

> "Stale data is detected and resolved systematically."

### 4.1 Staleness Monitoring

**Goal:** Automated detection and alerting when data goes stale.

**Current state:**
- Cross-check script flags staleness (>90d warn, >180d fail for tier 1)
- 15 companies currently stale (verified: no newer disclosures exist)
- Manual web search to check for updates

**Deliverables:**
- [ ] Scheduled staleness report (weekly cron → Discord/email)
- [ ] Per-company expected update cadence (quarterly filers vs. monthly dashboards)
- [ ] Priority queue: tier 1 stale companies surfaced first
- [ ] Track "days since last verification attempt" separately from "days since data updated"

**DoD:**
- Stale data is surfaced automatically; verification attempts are logged

### 4.2 Source Monitoring

**Goal:** Detect when source pages change (new filings, updated dashboards).

**Current state:**
- SEC EDGAR monitoring exists (hourly cron checks for new filings)
- Company dashboards not monitored
- Press releases not monitored

**Deliverables:**
- [ ] Monitor company IR pages for new press releases
- [ ] Monitor dashboard URLs for content changes (hash-based)
- [ ] When change detected: create verification task with diff

**DoD:**
- New filings and dashboard updates are detected within 24 hours

---

## Phase 5 — Adoption Monitoring

> "Understand who uses what, so we build the right things next."

### 5.1 Usage Instrumentation

**Goal:** Measure real usage patterns.

**Deliverables:**
- [ ] D1 `events` table + `POST /api/events`
- [ ] Server-side: API call events for key endpoints
- [ ] Client-side: citation opens, source clicks, history views, company page views
- [ ] Retention + rate limiting

### 5.2 Adoption Dashboard

**Goal:** Weekly canonical readout of usage.

**Deliverables:**
- [ ] Track: unique users, returning users, API calls by endpoint/caller type
- [ ] Track: citation open rate, click-through to source, most viewed companies
- [ ] Weekly markdown snapshot under `ops/`
- [ ] Decision gate: after 7 days of data, evaluate if PostHog needed

**DoD:**
- <60 seconds to understand adoption trends week-over-week

---

## Phase 6 — D1 Migration (Eliminate Naked Numbers)

> "Everything displayed comes from D1, not static TS files."

### 6.1 D1-Backed UI

**Goal:** Site renders from D1-backed endpoints, not companies.ts.

**Current state:**
- D1 schema exists (artifacts, runs, datapoints)
- Some endpoints read from D1
- companies.ts still the primary data source for most UI

**Deliverables:**
- [ ] Inventory every UI metric and its current source
- [ ] Writers/backfills per metric family
- [ ] Migrate data table to D1-backed endpoints
- [ ] Migrate company pages to D1-backed endpoints
- [ ] companies.ts becomes seed data / fallback only

**DoD:**
- UI renders from D1; no ad-hoc TS/JSON paths for displayed values

### 6.2 Retire Legacy Paths

**Goal:** One source of truth.

**Deliverables:**
- [ ] Remove TS/JSON legacy data paths
- [ ] Keep migration tooling only
- [ ] D1/R2 is canonical for everything displayed

---

## Agents Workboard (live)

Update this section when starting/stopping work so other agents see what's in-flight.

### Now (in progress)
- **Cross-check enforcement** — cross-check-data.ts passing (0 FAIL), needs CI wiring
- **Ingestion + transform loop** — runs green (scheduled inventory + invariants)

### Next (queued)
- R2 coverage audit (Phase 1.1)
- Citation UX design (Phase 3.1)

### Done (recent)
- Cross-check data integrity sweep — 0 FAIL, all companies have source quotes (2026-03-06)
- Staleness sweep — verified all 15 stale warnings have no newer data available (2026-03-06)
- Proposal-key upsert rollout (writers idempotent)
- Confidence scoring + DLQ routing + resolution
