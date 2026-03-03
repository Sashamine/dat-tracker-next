# DAT Tracker Data Architecture Roadmap

> **Last Updated**: 2026-03-02

---

## Roadmap (Canon-first, adoption-aware)

This is the **active** roadmap for making the site fully provenanced with queryable data and full citation.

Core principles:
- **Canon before polish**
- **Measurement before perfection**
- **Adoption before expansion**

---

## Phase 1 — Canon Spine (Ship Threshold)

Complete these and we can honestly say:
> “DAT Tracker is a defensible reference system.”

### 1) Provenance primitives (R2 + D1 core)
**Goal:** Immutable raw artifacts + queryable datapoints with lineage.

Deliverables:
- Cloudflare **R2** for immutable artifacts (filings, XBRL, companyfacts, dashboards)
- Cloudflare **D1** schema: `artifacts`, `runs`, `datapoints`
- Stable IDs everywhere
- Every datapoint links: `datapoint → run_id + artifact_id`

DoD:
- For any number, we can programmatically trace:
  `datapoint → run → artifact → source_url/accession`

### 2) Deterministic ingestion + idempotent transforms
**Goal:** Safe, reproducible updates.

Deliverables:
- Scheduled ingestion (**30–60 min is acceptable**) to start
- Write artifact → write run → upsert datapoints
- Content-hash (or key) dedupe
- Stable identity upserts (proposal_key style)
- Reruns produce **zero duplicates**

DoD:
- Re-running any job produces:
  - no dupes
  - clean counters
  - queryable run lineage

### 3) Eliminate “naked numbers” (site fully D1-backed)
**Goal:** Everything displayed is D1-backed and queryable (latest + history).

Deliverables:
- Inventory of every UI metric and its source
- Writers/backfills per metric family
- Strict allowlist for native holdings (only explicit extraction; e.g. BTC/ETH/SOL)

DoD:
- UI renders from D1-backed endpoints; no ad-hoc TS/JSON data paths for displayed values

### 4) Minimal citation surface (not perfect UX yet)
**Goal:** Any number can be explained.

Deliverables:
- Standardized receipt schema:
  - `value`, `unit`, `as_of`, `reported_at`
  - `artifact_id`, `run_id`
  - `source_url`, `accession`, `r2_key`
  - `method`, `confidence`
- “Explain” endpoint (latest datapoint + receipts)
- Basic citation modal (functional > polished)

DoD:
- Agents + users can retrieve the provenance chain for any displayed metric

### 5) Adoption instrumentation (D1 events; re-evaluate PostHog after 7 days)
**Goal:** Measure real usage before polishing further.

Deliverables:
- D1 `events` table + `POST /api/events`
- Server-side API call events for key read endpoints (latest/history)
- Client-side UX events: citation opens, source clicks, history views
- Retention + rate limiting

DoD (after 7 days):
- You can answer with numbers:
  - most viewed companies
  - most queried metrics
  - citation open frequency + click-through rate
  - history endpoint usage heatmap
  - web vs agent vs cron split

Decision gate:
- After 7 days of D1 events data, re-evaluate whether PostHog is needed for funnels/cohorts/retention.

### 6) Minimum invariants (canon guardrails)
**Goal:** Prevent silent canon rot while we measure adoption.

Deliverables:
- Missing receipts regression invariant (must not increase)
- Duplicate datapoints invariant
- Coarse “impossible value” checks (bounds/sanity) for key metric families

DoD:
- Canon integrity regressions fail CI/workflows loudly.

### 7) Adoption Signals Dashboard (measurement layer)
**Goal:** Weekly canonical readout that grounds roadmap priorities.

Track weekly:
- unique users, returning users
- API calls (total + by endpoint + by caller type)
- citation opens + click-through rate
- most queried metrics, most viewed companies
- backlinks / organic mentions (start manual)

Outputs:
- one dashboard endpoint + one weekly markdown snapshot under `ops/`

DoD:
- <60 seconds to understand adoption + trend deltas week-over-week.

---

## Phase 2 — Trust Hardening (triggered by real usage)

Only accelerate these if Phase 1 shows meaningful usage (and/or citations/history are being used heavily).

### 8) Verification + confidence loop
**Goal:** Keep correctness high as coverage scales.

Deliverables:
- Metric-specific verifiers
- Confidence scoring + DLQ workflows + weekly resolve report

DoD:
- Low-confidence datapoints are actively resolved; DLQ stays near-zero.

### 9) Full citation UX everywhere
**Goal:** No naked numbers across the entire site.

Deliverables:
- Expand citation modal to all surfaces
- Include history + verification state
- Frictionless source jump

DoD:
- Every metric is clickable → receipts + history.

### 10) Multi-asset + taxonomy first-class
**Goal:** Model multi-asset treasuries correctly.

Deliverables:
- Per-asset holdings schema (native + USD)
- Multi-asset mNAV math + correct rollups

DoD:
- Multi-asset companies are accurate and fully queryable.

### 11) CI / invariants ratchet
**Goal:** Green means safe.

Deliverables:
- Expand lint scope, provenance regression tests, invariant suite, event schema stability

DoD:
- Regressions are caught immediately; safety improves over time.

### 12) Retire legacy paths
**Goal:** One source of truth.

Deliverables:
- Remove TS/JSON legacy data paths; keep migration tooling only

DoD:
- D1/R2 is canonical for everything displayed.

---

## AGENTS WORKBOARD (live)

**Legend:**
- **Agent 1** = primary orchestrator (product + core data architecture)
- **Agent 5** = Claude Code (local CLI) — D1 backfills, migrations, ops
- **Agent 6** = Codex (this thread) — proposal-key upsert for datapoint writers

Update this section whenever you start/stop work so other agents can instantly see what’s in-flight.

### Now (in progress)
- **Ingestion + transform loop**
  - **Owner:** Agent 1
  - **Status:** Runs green (scheduled inventory + invariants).
  - **Notes:** keep pushing invariants down into CI so canon regressions fail loudly.

- **CI/Lint ratchet (required checks scope expansion)**
  - **Owner:** unowned
  - **Status:** Ongoing.

### Next (queued)
- **Adoption instrumentation implementation** (Phase 1.5)
- **Adoption signals dashboard** (Phase 1.7)

### Done (recent)
- Proposal-key upsert rollout (writers idempotent) — DONE
- Confidence scoring + DLQ routing + resolution — DONE

---

## ARCHIVE (pre-provenance / pre-D1)

Older notes from the earlier TS/JSON-based system are kept below for reference, but are not the active plan.
