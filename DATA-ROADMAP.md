# Data Integrity Roadmap

> Goal: Every datapoint is provably correct — linked to a real document with a citation proving the value.
>
> Last updated: 2026-03-09

## Current State (after Phase 1 work)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total datapoints verified | 264/1,846 (14.3%) | 701/1,846 (38.0%) | +437 |
| Current datapoints verified | ~68/333 (20.4%) | 276/333 (82.9%) | +208 |

### Remaining 62 unverified current datapoints

| Category | Count | Notes |
|----------|-------|-------|
| Foreign filings | 19 | TDnet (Japan), SEDAR (Canada), HKEX, ASX — PDFs, 404s, foreign language |
| Synthetic R2 | 14 | SEC-sourced but value not in XBRL or any R2 doc — likely derived/computed |
| SEC no match | 7 | Value doesn't appear in linked doc or XBRL (press-release shares, etc.) |
| Zero values | 5 | Nothing to search for |
| Company sources | 5 | Live dashboards, PDFs that 404'd |
| Press releases | 4 | URLs 404'd or value not in text |
| HKEX PDFs | 3 | Need PDF text extraction |

---

## Phase 1: Fix the Wiring (current → ~85% verified)

**Target: 283/333 current datapoints verified**

These are all achievable with existing R2 documents. No new document fetching needed.

### 1a. XBRL concept backfill (DONE)
- Re-ran XBRL pipeline on 16 tickers with updated extractor
- Result: 175 datapoints now have xbrl_concept, then +80 more on second pass
- **Status: Complete**

### 1b. Citation backfill from R2 docs (DONE)
- Deterministic value-in-document search for datapoints with accessions
- Result: 88 citations written across multiple runs, then +6 more with improved patterns
- **Status: Complete** (hit rate ceiling reached)

### 1c. Relink datapoints to proper artifacts (DONE)
- Matched unverified datapoints to orphaned R2-backed artifacts by entity + date proximity
- Result: 379 citations written (relink-artifacts.ts), then 36 more via wide search (all R2 docs per entity)
- Scripts: `/tmp/relink-artifacts.ts`, `/tmp/wide-search.ts`
- **Status: Complete** (remaining 16 synthetic_r2 + 10 sec_no_match are likely derived/computed values)

### 1d. URL-based citation fetch (DONE)
- Fetched press releases, company websites, foreign filing URLs directly
- Result: 8 citations written for current datapoints
- Script: `/tmp/cite-from-urls.ts`
- **Status: Complete** (remaining URLs 404 or contain PDFs)

### 1e. XBRL remaining gaps
- ~58 sec_companyfacts_xbrl datapoints without xbrl_concept (mostly historical)
- **Solution**: Re-run XBRL pipeline with broader concept mapping
- **Scope**: ~3 current, ~55 historical
- **Effort**: Small
- **Status: Not started**

### Phase 1 exit criteria
- Every current SEC-sourced datapoint has xbrl_concept or citation_quote
- Every current datapoint's artifact has a real R2 document (not synthetic/)
- Verification rate ≥ 85% of current datapoints

---

## Phase 2: Foreign & Non-SEC Sources (→ ~92% verified)

### 2a. Foreign regulatory filing citations
- 19 current datapoints from TDnet (Japan), SEDAR (Canada), HKEX (Hong Kong), ASX (Australia)
- R2 has some PDFs (hkex/434/*.pdf) but no citation extraction
- **Solution**:
  - HKEX PDFs (3): LLM extraction already exists, need to persist citations
  - TDnet/SEDAR: Download filing PDFs to R2, run LLM extraction
  - For English-language filings (SEDAR, ASX): deterministic text search possible
  - For Japanese filings (TDnet): need LLM extraction with translation
- **Scope**: 19 current, ~338 historical
- **Effort**: Medium-large (new document fetching + multi-language support)
- **Status: Not started**

### 2b. Press release citations
- 4 remaining current datapoints from press releases (8 already cited via URL fetch in Phase 1)
- Remaining URLs 404 or value not in text
- **Solution**: Find alternate URLs, cache HTML in R2
- **Scope**: 4 current, ~120 historical
- **Effort**: Small
- **Status: Partially done** (8/12 current cited)

### 2c. Company website snapshots
- 5 current datapoints from live company dashboards
- Values change — need point-in-time snapshots
- **Solution**: Snapshot dashboard pages to R2 when values are ingested, cite from snapshot
- **Scope**: 5 current, ~45 historical
- **Effort**: Medium (need snapshot-on-ingest pipeline)
- **Status: Not started**

### Phase 2 exit criteria
- Every non-manual datapoint has a citation or xbrl_concept
- Foreign filings have R2-cached documents with citations
- Press releases cached and cited
- Verification rate ≥ 92% of current datapoints

---

## Phase 3: Historical Completeness (→ ~95% all-time verified)

### 3a. Bulk historical citation sweep
- ~1,150 historical datapoints still unverified (relink pass already got ~430)
- ~400+ proper filing artifacts in R2 with full text
- **Solution**: For each historical datapoint, find its value in any R2 document for that entity within the relevant time window
- **Scope**: ~1,500 historical datapoints
- **Effort**: Large (but mostly automated — extend existing citation search to historical)
- **Status: Not started**

### 3b. MSTR complete coverage
- MSTR has 451 datapoints (24% of all data) with 150+ 8-K filings in R2
- Most are weekly BTC purchase 8-Ks that should be directly citable
- **Solution**: Match each MSTR historical datapoint to the corresponding 8-K or 10-Q in R2
- **Scope**: ~440 datapoints
- **Effort**: Medium (good R2 coverage, mostly automation)
- **Status: Not started**

### 3c. Metaplanet (3350.T) historical
- 213 datapoints, all from regulatory-filing (TDnet)
- Need TDnet PDFs in R2
- **Scope**: 213 datapoints
- **Effort**: Medium (requires Japanese document handling)
- **Status: Not started**

### Phase 3 exit criteria
- ≥ 95% of all 1,846 datapoints verified
- Every MSTR datapoint citable from R2 document
- Historical trend data fully auditable

---

## Phase 4: Structural Integrity (ongoing)

### 4a. Eliminate synthetic artifacts
- 270 artifacts with synthetic/ R2 keys → replace with proper filing artifacts
- Every artifact should have a real, fetchable document
- **Status: Not started**

### 4b. Eliminate orphaned artifacts
- 1,193 artifacts with no linked datapoints
- Audit: are these duplicates of linked artifacts, or genuinely unused?
- Either link them to datapoints or archive them
- **Status: Not started**

### 4c. Ingestion pipeline writes citations at insert time
- Currently: insert datapoint first, backfill citation later
- Target: every new datapoint arrives with citation_quote already populated
- Requires changes to: d1-xbrl-to-d1.ts, d1-backfill-holdings-history.ts, auto-update pipeline
- **Status: Not started**

### 4d. CI verification gate
- No PR merges if verification rate drops below threshold
- `verify-d1-citations.ts` runs in CI, blocks on regressions
- **Status: Script exists, CI integration not done**

### Phase 4 exit criteria
- Zero synthetic artifacts
- Zero orphaned artifacts
- New datapoints arrive pre-cited
- CI prevents verification regressions

---

## What Cannot Be Verified (~5%)

Some datapoints will never have machine-verifiable citations:

| Category | Count | Why |
|----------|-------|-----|
| Zero values | 5 | Nothing to search for in a document |
| Manual backfill | 6 | Values entered by human, no primary source document |
| Derived/computed | ~10 | Value is sum of components (e.g., total debt = sum of tranches) |
| Pre-history | ~20 | Values from before company started filing; aggregator-sourced |

These should be explicitly marked with a `verification_status` flag explaining why they can't be verified, rather than left as silent gaps.

---

## Priority Order

1. **Phase 1c** (relink to proper artifacts) — biggest bang for effort, unlocks ~40 current + ~630 historical
2. **Phase 1d** (fix auto-update R2 paths) — quick win, ~15 current
3. **Phase 2b** (press release citations) — ~13 current, straightforward
4. **Phase 2a** (foreign filings) — ~22 current, harder but important
5. **Phase 3b** (MSTR historical) — ~440 datapoints, MSTR is flagship company
6. **Phase 3a** (bulk historical sweep) — remaining ~1,000 historical
7. **Phase 4** (structural cleanup) — ongoing, prevents future gaps

---

## Success Metrics

| Milestone | Before | Current | Target | When |
|-----------|--------|---------|--------|------|
| Current datapoints verified | 20.4% | **81.4%** | 85% | After Phase 1 (nearly done) |
| Current datapoints verified | 20.4% | 81.4% | 92% | After Phase 2 |
| All datapoints verified | 14.3% | **37.7%** | 95% | After Phase 3 |
| Synthetic artifacts | 270 | ~270 | 0 | After Phase 4a |
| Orphaned artifacts | 1,193 | ~800 | 0 | After Phase 4b |
| New datapoints pre-cited | No | No | Yes | After Phase 4c |
