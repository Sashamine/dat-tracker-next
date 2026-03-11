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

**Goal:** Align the site with the final product structure defined in `docs/product-model.md`.

**Canonical spec:** `docs/product-model.md` — all UI work must conform to this document.

### 0.5.1 Three-View Leaderboard

Default sort: Treasury Value (Size). Three toggle views with view-specific columns.

**Current state (2026-03-07):**
- Two-tab toggle exists: `[ Performance ]  [ Size ]`
- Default sort is `hpsGrowth90d` — **should be `holdingsValue`**
- Efficiency view does not exist yet

**Deliverables:**
- [ ] Rename tabs: `[ Size ]  [ Growth ]  [ Efficiency ]`
- [ ] Default sort: `holdingsValue` (Size view)
- [ ] Size view columns: Company, Asset, Treasury Value, HPS, mNAV, Leverage
- [ ] Growth view columns: Company, Asset, HPS Growth (90D), mNAV, Treasury Value
- [ ] Efficiency view columns: Company, Asset, Efficiency, HPS Growth, mNAV, Treasury Value
- [ ] Compute Wrapper Efficiency = HPS Growth / mNAV
- [ ] Per-view summary banner with view-appropriate stats

### 0.5.2 Homepage Scatter Plot

The **primary sector visualization**, placed above the leaderboard on the overview page.

**Deliverables:**
- [ ] Y: HPS Growth (90D), X: mNAV, dot size: Treasury Value
- [ ] Quadrant labels: undervalued performers, elite wrappers, turnaround candidates, overpriced wrappers
- [ ] Quadrant boundaries: mNAV = 1.0x (vertical), sector median HPS Growth (horizontal)
- [ ] Hover tooltips: Company, Treasury Value, HPS, HPS Growth, mNAV
- [ ] Click → company page
- [ ] Compare mode: select up to 4 companies

### 0.5.3 Company Page Restructure

Reorder company page to lead with balance sheet (DAT companies are balance-sheet vehicles).

**Deliverables:**
- [ ] Layout: Header → Balance Sheet → Key Metrics → Performance Chart → Strategy → Holdings History
- [ ] Balance sheet equation: Crypto + Cash − Debt − Preferred = Equity NAV
- [ ] Key metrics: HPS, HPS Growth (90D, 1Y), mNAV, Leverage
- [ ] Performance chart: Price + mNAV + HPS on one chart
- [ ] Anchor link: "Jump to performance chart"

### 0.5.4 Analytics Page

Separate page (`/analytics`) with four sector-level charts.

**Deliverables:**
- [ ] Treasury Density vs Scale: Y=HPS, X=Treasury Value, dot size=Market Cap
- [ ] Flywheel Dynamics: Y=HPS Growth, X=mNAV change
- [ ] Sector Growth Distribution: histogram of HPS Growth
- [ ] Sector mNAV History: time series of median + average mNAV

### 0.5.5 Dilution vs Accretion Chart (Company Page)

- [ ] Dual-axis chart: BTC/share (line) + shares outstanding (bar) over time
- [ ] Instantly shows: good managers (HPS up, shares stable) vs bad (shares exploding, HPS flat)

### 0.5.6 AHPS Growth (deferred)

**Concept:** Accretive Holdings Per Share Growth — isolates management skill from crypto price movement.

**Status:** Deferred. Requires granular capital events data (currently available for ~5 companies). Plain HPS Growth % is the leaderboard metric for now.

### 0.5.7 NAV Composition Transparency

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

### 4.3 Foreign Filing Pipeline Automation

**Goal:** Bring foreign companies to the same citation quality as SEC-covered companies — automated document fetch, data extraction, and D1 ingestion with full provenance.

**Current state:**
- 13 foreign companies across 7 filing systems
- Tier 2 (document-only fetchers): EDINET, HKEX — download filings to R2 but no data extraction
- Tier 3 (manual only): SEDAR+, LSE RNS, ASX, CVM/B3, MFN — no automation at all
- AMF fetcher is the only one with full extraction (ALTBG/ALCPB)
- TDnet/Metaplanet fetcher does dashboard scraping (not regulatory filings)
- All foreign holdings currently come from `companies.ts` backfill with synthetic accessions

**Company inventory by filing system:**

| System | Companies | Existing Code | Status |
|--------|-----------|---------------|--------|
| **EDINET/TDnet** (Japan) | 3350.T, 3825.T, 3189.T | `edinet.ts`, `tdnet/metaplanet.ts`, `edinet-fetch` cron | Fetch-only, no extraction |
| **HKEX** (Hong Kong) | 0434.HK | `hkex.ts`, `hkex-search.ts`, `hkex-pdf-extractor.ts`, `hkex-fetch` cron | Fetch-only, PDF text exists |
| **AMF** (France) | ALCPB | `amf.ts` | **Full pipeline** (model for others) |
| **SEDAR+** (Canada) | ETHM, BTCT.V, XTAIF, LUXFF | `sedar-check` cron (metadata only) | Calendar check only, no download |
| **MFN** (Sweden) | H100.ST | None | No automation |
| **LSE RNS** (UK) | SWC | None | No automation |
| **ASX** (Australia) | DCC.AX | None | No automation |
| **CVM/B3** (Brazil) | OBTC3 | None | No automation |
| **BaFin/DGAP** (Germany) | SRAG.DU | None | No automation |

#### 4.3a Extraction Layer for Existing Fetchers (Quick wins)

Extend fetchers that already download documents to also extract holdings data.

**Deliverables:**
- [ ] **EDINET extraction**: Parse XBRL inline docs for BTC holdings (3350.T, 3825.T, 3189.T)
  - EDINET returns XBRL — similar structure to SEC, adapt existing XBRL parser
  - JP-GAAP taxonomy differs from US-GAAP; map relevant tags
- [ ] **HKEX extraction**: Extract holdings from downloaded PDFs (0434.HK)
  - `hkex-pdf-extractor.ts` already does text extraction
  - Add regex/LLM layer to pull BTC count from extracted text
- [ ] **TDnet structured extraction**: Replace Metaplanet dashboard scrape with TDnet filing parse
  - TDnet disclosures are the regulatory source; dashboard is derivative
  - Parse "適時開示" (timely disclosure) PDFs for holdings figures
- [ ] **Unified foreign extraction interface**: Standard output format matching D1 datapoint schema
  - `{ ticker, metric, value, asOf, accession, sourceUrl, sourceType, quote, searchTerm }`
  - Reuse `batch-holdings-update.ts` pattern for D1 ingestion

**DoD:**
- Japan (3) and Hong Kong (1) companies have automated extraction with real accessions

#### 4.3b SEDAR+ Download + Extraction (Canada)

Build document fetcher for Canadian companies (4 tickers).

**Deliverables:**
- [ ] **SEDAR+ document fetcher**: Download financial statements from SEDAR+ profiles
  - Existing `sedar-check` cron knows filing calendar; extend to download PDFs
  - SEDAR+ profile IDs already known (e.g., LUXFF = 000044736)
- [ ] **SEDAR+ extraction**: Parse Canadian GAAP/IFRS financial statements for crypto holdings
  - Note disclosures (e.g., "Note 5 Digital Assets") contain holdings counts
  - PDF text extraction → regex for holdings figures
- [ ] Upload extracted documents to R2 under `external-sources/{ticker}/`

**DoD:**
- ETHM, BTCT.V, XTAIF, LUXFF have automated document fetch and extraction

#### 4.3c European Filing Systems (AMF, MFN, BaFin)

Extend AMF model to Swedish and German regulators.

**Deliverables:**
- [ ] **MFN fetcher** (Sweden, H100.ST): Monitor Modular Finance news feed for Hashdex filings
  - MFN provides structured press releases; parse for NAV/holdings data
- [ ] **BaFin/DGAP fetcher** (Germany, SRAG.DU): Monitor DGAP ad-hoc disclosures
  - DGAP (Deutsche Gesellschaft für Ad-hoc-Publizität) publishes via EQS newswire
  - Parse for BTC holdings from annual/quarterly reports
- [ ] AMF pipeline already complete — use as reference implementation

**DoD:**
- H100.ST and SRAG.DU have automated filing detection and extraction

#### 4.3d Remaining Markets (UK, Australia, Brazil)

**Deliverables:**
- [ ] **LSE RNS fetcher** (UK, SWC): Monitor Regulatory News Service for Samara Alpha filings
  - RNS has structured API; parse for portfolio disclosures
- [ ] **ASX fetcher** (Australia, DCC.AX): Monitor ASX announcements for DigitalX
  - ASX has public announcement API
- [ ] **CVM/B3 fetcher** (Brazil, OBTC3): Monitor CVM for Méliuz filings
  - CVM (Comissão de Valores Mobiliários) has online filing system

**DoD:**
- All 13 foreign companies have automated document fetch and extraction
- No company relies solely on `companies.ts` backfill for holdings data

#### 4.3e Foreign Cron Orchestration

**Deliverables:**
- [ ] **Unified foreign cron**: Single `/api/cron/foreign-filings` endpoint that dispatches to all fetchers
  - Run daily (foreign filings are less frequent than SEC)
  - Each fetcher checks for new documents since last run
  - Extracted data flows into D1 as `candidate` datapoints (same as XBRL cron)
- [ ] **Citation parity**: Foreign datapoints have same citation quality as SEC
  - Real accession numbers (regulatory filing IDs, not synthetic `REG-` prefixes)
  - Source documents in R2
  - Search term highlighting works on cached documents
- [ ] **Staleness integration**: Foreign tickers included in 4.1 staleness monitoring with correct cadences
  - Japan: quarterly (TDnet) + monthly (Metaplanet dashboard)
  - Canada: quarterly (SEDAR+)
  - Europe: semi-annual or ad-hoc (AMF/MFN/BaFin)

**DoD:**
- Foreign pipeline runs on same schedule as SEC pipeline
- All foreign companies show real regulatory accessions in citation chain
- Synthetic `REG-` accessions eliminated

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
