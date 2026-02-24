# Verification Runbook (Canonical)

This document is the **standard** verification process for DAT Tracker.

If you are new here (human or model): **start with this runbook**.

Goal: verify a company’s displayed balance-sheet/treasury information with **primary-source evidence**, then safely patch + deploy.

---

## The core idea (read this once)

> **Verification without reconstruction is just checking that lies agree with each other.**

We do not “check the site against itself.” We **reconstruct ground truth from primary sources**, then compare that reconstruction to what the repo/site contains.

---

## Non‑negotiable guardrails

1) **Identity Guard (mandatory in every worker/synth prompt)**
   - Worker must self-report provider/model.
   - Must match expected assignment.
   - On mismatch → **ABORT**.

2) **Verdict block**
   - Every worker output ends with the standard verdict block.
   - Synths include **CHAIN**.

3) **No codebase anchoring during reconstruction (Phase 1)**
   - R* workers may receive only: ticker/CIK + runDir (+ allowed source list).
   - R* workers must not read project code or CODEBASE_VALUES.

4) **Auditors don’t get CODEBASE_VALUES**
   - Grok auditors evaluate **artifacts + citations**, not repo values (unless explicitly running Diff/Patch phases).

5) **Artifact‑only adversarial audits**
   - Audversaries attack the produced artifacts (r-synth + cited URLs), not the whole repo.

---

## Model assignments (standard)

**Constraints / goals**
- Gemini is not used (quota instability).
- Claude is not used (cost).

**Provider split (independence)**
- **GPT (OpenAI)**: orchestrator + reconstruction + diff/patch implementation.
- **Grok (xAI)**: adversarial audits + final GO/NO‑GO decisions.

Canonical mapping lives in: `specs/model-assignments.md`.

---

## Run directory + required artifacts

All work for a company run is written under:

`verification-runs/<ticker>/<YYYY-MM-DD>/`

Minimum artifacts (recommended names):
- `STATE.md`
- `sources-manifest.md`
- `r1-holdings.md`
- `r2-shares.md`
- `r3-financials.md`
- `r4-dilutives.md`
- `r-synth.md` + `r-synth-verdict.txt`
- (if Phase 1-ADV runs) `a-synth.md`
- (if Phase 2 runs) `diff.md`
- (if Phase 3 runs) `patch.diff`
- (if Phase 3-V runs) `v-synth.md`
- (if Phase 4 runs) `c-synth.md`
- (if Phase 6 runs) `ui-citation-report.md` + screenshots/logs

---

# Phase 0 — Setup (STATE, manifests)

**Purpose:** create run dir, authorize pipeline, establish inputs.

**Orchestrator:** GPT

**Inputs:** ticker/CIK (+ target period if needed).

**Outputs:**
- `STATE.md`
- `sources-manifest.md` (or equivalent)

**Gate:** checkpoint: “Proceed? [y/n]”

---

# Phase 1 — Reconstruct (primary extraction)

**Purpose:** extract ground truth from primary sources (SEC filings, XBRL, IR, etc.).

**Workers (default):**
- R1 Holdings — GPT‑5‑mini
- R2 Shares — GPT‑5‑mini
- R3 Financials — GPT‑5‑mini
- R4 Dilutives — GPT‑5.1 (harder extraction)

**Rules (mandatory):**
- R workers run independently (no reading other R outputs).
- Every number must include:
  - as‑of date
  - source URL
  - verbatim quote/snippet

**Outputs:** `r1-*.md` … `r4-*.md`

---

## Phase 1 Synth — R‑Synth

**Purpose:** reconcile R1–R4 into a single reconstructed snapshot.

**Synth:** GPT‑5.1

**Inputs allowed:** R1–R4 artifacts only.

**Outputs:**
- `r-synth.md`
- `r-synth-verdict.txt`

**Gate:** checkpoint before adversarial.

---

# Phase 1‑ADV — Adversarial audit (attack reconstruction)

**Purpose:** invalidate weak claims, find missing items, force citation integrity.

**Adversaries (all Grok):**
- A1 Numerical (recompute math)
- A2 Provenance (URL+quote verification)
- A3 Temporal (staleness/timeline)
- A4 Completeness (missing filings/instruments)

**A‑Synth (GO/NO‑GO):** Grok

**Rules:**
- Grok adversaries do not receive CODEBASE_VALUES.
- Attack artifacts only.

**Loop rule:** if A‑Synth != PASS → loop Phase 1, re-run only failing R workers.

---

# Phase 2 — Diff (reconstruction vs codebase)

**Purpose:** translate reconstruction into an explicit change list.

**Agent:** GPT‑5.1

**Inputs allowed:** r‑synth + CODEBASE_VALUES + relevant repo files.

**Outputs:**
- `diff.md`
- optionally `changes.json`

---

# Phase 3 — Patch generation

**Purpose:** implement changes in repo.

**Agent:** GPT‑5.1

**Outputs:** `patch.diff` and/or branch/PR.

---

# Phase 3‑V — Patch verification

**Purpose:** ensure patch is correct and safe.

- Mechanical build/run checks: GPT‑5.1
- Final correctness authority (GO/NO‑GO): Grok

**Rule:** patch writer cannot be final authority.

---

# Phase 4 — Cross‑file consistency audit

**Purpose:** ensure all files agree; prevent drift/hardcoding.

- C‑agents (C1–C7 as needed): Grok
- C‑Synth (GO/NO‑GO): Grok

Optional helper:
- Inventory builder: GPT generates a cross‑file value matrix.

---

# Phase 5 — Merge

**Purpose:** land changes safely.

- Implementation: GPT
- Final approval: Grok

---

# Phase 6 — UI + Citation verification

**Purpose:** ensure citations render and are findable; UI matches canonical values/formulas.

- Browser automation/screenshots: GPT‑5.1 (or GPT‑5‑mini if purely mechanical)
- Audit failures/disputes: Grok

**Rule:** citations must link to the *specific* document containing the number (no generic homepages).

---

# Phase 7 — mNAV sanity check

**Purpose:** sanity-check mNAV vs inputs; catch formula parity issues.

**Primary:** Grok

Notes:
- `sharesForMnav` uses **basic shares only**; dilutives are applied dynamically (ITM) by the calculator.

---

## Hybrid SEC extraction (recommended)

**Why:** cheaper + faster than LLM-parsing whole iXBRL HTML, and more robust vs SEC rate limiting.

### Layer 1 — JSON-first (numeric facts)
Use `data.sec.gov` endpoints (cache to disk):
- Submissions: `https://data.sec.gov/submissions/CIK##########.json`
- Companyfacts: `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json`

### Layer 2 — Filings/exhibits only when needed (instrument terms)
For legal/narrative terms (indentures, warrant mechanics, conversion features), download only the specific docs/exhibits you need from `www.sec.gov/Archives` using the polite downloader + cache.

### Required environment
SEC requires a descriptive User-Agent including contact info:
- `SEC_USER_AGENT="Name (email@domain.com)"`

### Commands
Fetch companyfacts:
- `npm run sec:fetch-companyfacts -- --cik 0001849635 --outFile verification-runs/djt/2026-02-22/sec/companyfacts.json`

Fetch specific filing docs under an accession directory:
- `npm run sec:fetch-filings -- --cik 0001849635 --accession 000114036125040977 --outDir verification-runs/djt/2026-02-22/sec/filings --docs "<filename1>,<filename2>"`

(You supply the exact filenames from the accession directory. The script caches responses so repeated runs are near-instant.)

## Common failure modes (non-exhaustive)
- Trusting existing values without reconstruction.
- Generic source URLs (sec.gov home, directory listings, etc.).
- PIPE warrants / Item 3.02 missed.
- Share count changes from buybacks/issuances.
- Convertible terms buried in exhibits.
- “Reported date” vs event date confusion.

---

## What to do next

For a new company run:
1) Create `verification-runs/<ticker>/<date>/STATE.md` + `sources-manifest.md`
2) Run Phase 1 (R1–R4) and produce R‑Synth
3) Run Phase 1‑ADV and loop until PASS
4) Only then diff/patch/verify/merge
