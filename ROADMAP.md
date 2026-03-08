# DAT Tracker Roadmap

> **Last Updated**: 2026-03-07

---

## Core Principles

- **Correctness before features** — every number must be verifiable
- **Permanence before convenience** — source documents cached forever
- **Measurement before expansion** — understand usage before scaling
- **Three dimensions, not one** — Size, Growth, and Efficiency are independent lenses (see `docs/product-model.md`)

---

## Phase 0.5 — Product Framing (parallel track — GPT handles UI, Claude handles data)

> "A first-time visitor understands the DAT sector in 3 seconds."
>
> **Product model:** `docs/product-model.md`
> **NAV policy:** `docs/nav-treatment-policy.md`

**Goal:** Structure the homepage around three independent dimensions: Size (default), Growth, and Efficiency.

### 0.5.1 Three-View Homepage

The homepage supports three views via a tab toggle. Each shows the same companies with different sort + column emphasis.

**Current state (2026-03-07):**
- Two-tab toggle exists: `[ Performance ]  [ Size ]`
- Default sort is `hpsGrowth90d` (Growth) — **should be `holdingsValue` (Size)**
- Efficiency view does not exist yet
- All underlying data (HPS growth, mNAV) is already computed

**Deliverables:**
- [ ] Rename tabs: `[ Size ]  [ Growth ]  [ Efficiency ]`
- [ ] Default sort: `holdingsValue` (Size view), not `hpsGrowth90d`
- [ ] Size view: sorted by treasury value. Columns: Company, Asset, Treasury Value, mNAV, Market Cap
- [ ] Growth view: sorted by HPS Growth (90D). Columns: Company, Asset, AHPS Growth (90D), mNAV, Treasury Value
- [ ] Efficiency view: sorted by Wrapper Efficiency (HPS Growth / mNAV). Columns: Company, Asset, Efficiency, HPS Growth, mNAV
- [ ] Per-view summary banner with view-appropriate stats
- [ ] mNAV color context relative to sector median (<0.9x green, 0.9-1.3 neutral, >1.3x red)

**Data availability:** 55 companies have holdings + sharesForMnav. 54 have 90+ days of DAT history. HPS growth computable for nearly the entire universe. Efficiency is trivially derived (HPS Growth / mNAV).

### 0.5.2 Dilution vs Accretion Chart (Company Page)

**Deliverables:**
- [ ] Dual-axis chart: BTC/share (line) + shares outstanding (bar) over time
- [ ] Instantly shows: good managers (HPS up, shares stable) vs bad (shares exploding, HPS flat)
- [ ] This is the "Moneyball chart" — the signature visualization

### 0.5.3 Sector Scatter Plot

**Deliverables:**
- [ ] X: mNAV (premium/discount), Y: HPS Growth (90D)
- [ ] Quadrants: upper-left = efficient wrappers, lower-right = overpriced + weak
- [ ] Every DAT as a labeled dot, sized by treasury value
- [ ] This is the visual encoding of the Efficiency dimension

### 0.5.4 AHPS Growth (deferred)

**Concept:** Accretive Holdings Per Share Growth — isolates management skill from crypto price movement. Measures how efficiently management converts capital access into more crypto per share. Could become the "EPS of the DAT sector."

**Status:** Deferred. Requires granular capital events data (currently available for ~5 companies: MSTR, BMNR, MARA, SBET, DDC). As the pipeline matures, more companies get full AHPS decomposition. For now, plain HPS Growth % is the leaderboard metric.

### 0.5.5 NAV Composition Transparency

**Goal:** Make the NAV treatment policy visible to users.

**Deliverables:**
- [ ] Document treatment rules in code (see `docs/nav-treatment-policy.md`)
- [ ] Ensure all companies are consistently modeled (STKE equity investments gap)
- [ ] Add explicit notes where non-direct crypto treatment applies
- [ ] Future: Strict NAV vs Expanded NAV toggle

---

## Phase 1 — Immutable Provenance

> "Every number links to a permanent, cached source document."

### 1.1 R2 Document Coverage

**Goal:** Every cited source document is cached in R2 so links never break, regardless of what SEC/SEDAR/company sites do.

**Current state (2026-03-06):**
- `/filings/{ticker}/{accession}` route exists (R2 first, SEC fallback)
- 670+ SEC archive URLs converted to `/filings/` format
- 165 processed SEC filings uploaded to R2 (`new-uploads/` prefix)
- 23 external source documents cached in R2 (`external-sources/` prefix)
- `scripts/verify-r2-citations.ts` reports coverage metrics
- **SEC filing coverage: 99.1%** (105/106 citations in companies.ts)
- **External source coverage: 39%** (23/59 unique URLs cached)
- **Overall: 75.3%** (128/170 total source citations)

**Deliverables:**
- [x] Audit: which cited documents are NOT in R2? (`verify-r2-citations.ts`)
- [x] Bulk download + process missing SEC filings into R2 (165 filings, 41 tickers)
- [x] Convert all SEC archive URLs to `/filings/` format (670+ URLs)
- [x] Coverage metric: % of cited sources with R2 backup
- [x] Cache static external sources (PDFs, press releases) — 23 docs cached
- [ ] Cache remaining external sources (SEDAR+, foreign regulators)
- [ ] For JS-rendered dashboards: store Playwright snapshots as dated artifacts
- [ ] 1 missing SEC filing: tron/0001493152-26-012544 (may not exist on EDGAR)

**DoD:**
- Every `sourceUrl` in companies.ts resolves to a cached R2 document
- If SEC/SEDAR goes down, every citation still works

### 1.2 Provenance Chain Completeness

**Goal:** Every data field traces to: value → quote → document → permanent URL.

**Current state (2026-03-06):**
- companies.ts has `sourceQuote`, `holdingsSourceUrl`, `accessionNumber` for most companies
- Cross-check script validates quote-value matches
- Quote fields added to Company type: `debtSourceQuote`, `cashSourceQuote`, `sharesSourceQuote`, `preferredSourceQuote`
- **Quote coverage**: holdings 95%, debt 98%, cash 100%, shares 100%, preferred 100%

**Deliverables:**
- [x] Extend citation fields to ALL data types (type system + initial population):
  - debt: debtSourceQuote — 39/40 (98%) — only BNC missing (no totalDebt field)
  - cash: cashSourceQuote — 44/44 (100%)
  - shares: sharesSourceQuote — 55/55 (100%)
  - preferred: preferredSourceQuote — 20/20 (100%)
- [x] Fill remaining gaps (OBTC3, BTBT preferred, foreign companies)
- [ ] Upgrade promoted quotes to verbatim SEC filing extracts where possible
- [ ] Provenance for derived values: show inputs + calculation

**DoD:**
- For any number displayed on the site, you can programmatically retrieve:
  `value → sourceQuote → sourceUrl → R2 cached document`

---

## Phase 2 — Ground Truth Enforcement

> "Data integrity is enforced automatically, not manually."

### 2.1 Cross-Check in CI

**Goal:** The cross-check script runs on every commit and blocks merges with data integrity failures.

**Current state (2026-03-06):**
- `scripts/cross-check-data.ts` runs: 0 FAIL, 15 WARN (all staleness), 15 INFO
- Checks: quote-value match, staleness, field consistency, shares sanity, source type alignment
- `.github/workflows/cross-check.yml` triggers on PR/push when data files change
- Warning ratchet enforced via `.github/cross-check-baseline.json` (max: 15)
- PR annotation via `actions/github-script` comments warnings/failures on PRs

**Deliverables:**
- [x] Add cross-check to GitHub Actions (`.github/workflows/cross-check.yml`)
- [x] FAIL = block merge (exit code 1), WARN = annotate PR, INFO = silent
- [x] Staleness threshold config (90d warn, 180d fail for tier 1)
- [x] Track warning count over time — ratchet via baseline file

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

**Current state (2026-03-06):**
- CitationPopover component built: click any metric → see source quote + link to document
- sourceQuote wired into all metrics: holdings, shares, debt, cash, preferred, market cap
- Filing viewer URLs auto-append `?q=` search param for quote highlighting
- Quote coverage: debt 98%, cash 100%, shares 100%, preferred 100%, holdings 95%

**Deliverables:**
- [x] Citation popover component: click any metric → see:
  - The value and as-of date
  - Verbatim source quote
  - Link to R2-cached document (with highlight/anchor if possible)
  - Source type badge (SEC filing, press release, company dashboard, etc.)
- [x] Apply to: holdings, shares, debt, cash, mNAV inputs
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
- **Phase 0.5 Product Framing** — GPT handles UI (three-view homepage, scatter plot, cosmetics)
- **QA bug fixes** — Claude fixing data/architecture bugs from Mar 7 QA report
- **Ingestion + transform loop** — runs green (scheduled inventory + invariants)

### Next (queued)
- Phase 0.5.5 NAV composition transparency (STKE equity gap)
- Remaining external source caching (SEDAR+, dashboards via Playwright)
- Phase 3.1 mobile citation UX (bottom sheet)
- Phase 3.2 Filing viewer quote highlighting

### Done (recent)
- QA bug fixes: B-1/2 (ABTC sync), B-3/7 (earnings/HPS data), B-6 (admin page), B-10/11 (asset aggregates), B-13/22 (mNAV formula) — 2026-03-07
- Product model + NAV policy documented (`docs/product-model.md`, `docs/nav-treatment-policy.md`) — 2026-03-07
- Audit report debt classification + STKE convertibles (PR #329) — 2026-03-07
- mNAV formula unification via mnav-engine.ts (PR #330) — 2026-03-07
- Citation UX wiring (Phase 3.1) — sourceQuote passed to all CitationPopover usages (2026-03-06)
- Source quote coverage complete — debt 98%, cash/shares/preferred 100% (2026-03-06)
- Cross-check CI wiring — GitHub Actions workflow + warning ratchet (2026-03-06)
- R2 coverage audit + SEC filing cache — 165 filings, 23 external docs in R2 (2026-03-06)
