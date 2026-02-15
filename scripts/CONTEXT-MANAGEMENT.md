# Context Management Model for Adversarial Verification

> **Purpose:** Prevent context overflow crashes during multi-phase, multi-company verification pipelines. Companion to `VERIFICATION-PROCESS.md`.

## The Problem

Session context is finite (~195K tokens). Without management:
- Sub-agent returns dump full findings into the orchestrator
- The orchestrator reads large files to build prompts for the next phase
- Context accumulates linearly across phases and compounds across companies
- No warning before hitting the wall — crash is silent, progress is lost
- Recovery requires manual investigation of dead transcripts

**Known failure:** Feb 14, 2026 — orchestrator ran MSTR (5 phases), then started BMNR. Session hit 619KB/183 messages. 9-minute processing delay after Phase 1A return, then silent death during file reads. No recovery path existed.

---

## Architecture: Thin Orchestrator + Fat Sub-Agents

### Core Principle

> **The orchestrator is a dispatcher with a clipboard. It never touches raw data.**

```
┌─────────────────────────────────────────────────┐
│                 ORCHESTRATOR                     │
│  Reads: state file, sub-agent summaries (<50 lines) │
│  Writes: state file updates                     │
│  Spawns: sub-agents with file paths as input    │
│  Never: reads source files, SEC filings, ground truth │
└──────────┬──────────────────────┬───────────────┘
           │                      │
     ┌─────▼──────┐        ┌─────▼──────┐
     │ Sub-Agent  │        │ Sub-Agent  │
     │ (Phase 1A) │        │ (Phase 1B) │
     │            │        │            │
     │ Reads:     │        │ Reads:     │
     │  SEC EDGAR │        │  ground-   │
     │  XBRL API  │        │  truth.md  │
     │            │        │            │
     │ Writes:    │        │ Writes:    │
     │  ground-   │        │  adversary │
     │  truth.md  │        │  report.md │
     │            │        │            │
     │ Returns:   │        │ Returns:   │
     │  summary   │        │  summary   │
     │  (≤50 lines)│       │  (≤50 lines)│
     └────────────┘        └────────────┘
```

### Data Flow Rules

1. **Sub-agents write full findings to disk.** Always. Every phase produces a file.
2. **Sub-agents return structured summaries only.** Max 50 lines. Key numbers, issue counts, severity levels, file paths.
3. **The orchestrator never reads data files.** If the next phase needs ground truth, the next sub-agent reads it — not the orchestrator.
4. **Sub-agents reference files by path.** The orchestrator passes paths between phases: "Read `bmnr-ground-truth.md` and attack it."
5. **State lives on disk.** The orchestrator's knowledge of progress, findings, and next steps is written to a state file after every phase.

---

## Context Budget System

### Budget Allocation

| Component | Token Budget | Notes |
|-----------|-------------|-------|
| System prompt + project context | ~15K | Fixed overhead |
| Orchestrator conversation history | ~30K | Grows with phases |
| Per-phase sub-agent summary return | ≤4K | Enforced by prompt |
| State file read | ~2K | Compact JSON |
| **Total per company** | **~50K** | Leaves headroom |
| **Session rotation threshold** | **120K** | ~60% of 195K limit |

### Budget Tracking

The orchestrator maintains a running estimate in the state file:

```json
{
  "contextEstimate": {
    "systemOverhead": 15000,
    "conversationTokens": 28000,
    "totalEstimate": 43000,
    "sessionLimit": 195000,
    "rotationThreshold": 120000
  }
}
```

**Estimation method:** Count sub-agent returns and orchestrator messages. Each return ≈ 1K-4K tokens. Each orchestrator message ≈ 500-1K. This is rough but sufficient — the point is catching the 60% threshold, not precision.

### When to Rotate

If `totalEstimate > rotationThreshold`:
1. Write full state to disk
2. Summarize current progress in the state file
3. End the orchestrator message with: "Context budget exceeded. Next session should read `verification-state.json` and continue from Phase X."
4. The human (or a cron job) starts a new session that picks up from the state file

---

## State File Specification

**Path:** `dat-tracker-next/scripts/qa-screenshots/{ticker}/verification-state.json`

```json
{
  "ticker": "BMNR",
  "startedAt": "2026-02-14T21:36:00Z",
  "updatedAt": "2026-02-14T21:46:00Z",
  "status": "in-progress",
  
  "phases": {
    "1a": {
      "status": "complete",
      "agent": "SEC Researcher",
      "outputFile": "bmnr-ground-truth.md",
      "summary": {
        "holdingsETH": 4325738,
        "holdingsDate": "2026-02-08",
        "sharesEstimated": 524400000,
        "sharesAnchorDate": "2026-01-12",
        "debt": 0,
        "preferred": 0,
        "issuesNoted": 2,
        "notes": "Share count is estimated (no ATM disclosure). FY ends Aug 31."
      },
      "completedAt": "2026-02-14T21:45:59Z",
      "tokensBurned": 3200
    },
    "1b": {
      "status": "pending",
      "agent": "Extraction Adversary",
      "inputFiles": ["bmnr-ground-truth.md"],
      "outputFile": "bmnr-extraction-adversary.md"
    },
    "4c": { "status": "not-started" },
    "4d": { "status": "not-started" },
    "5":  { "status": "not-started" }
  },

  "contextEstimate": {
    "totalEstimate": 22000,
    "rotationThreshold": 120000
  },

  "companyQueue": ["BMNR", "MARA", "XXI", "SBET", "ASST"],
  "companiesCompleted": ["MSTR"]
}
```

### State File Rules

1. **Updated after every phase completes.** Before spawning the next agent.
2. **Includes enough to cold-start.** A brand new session with zero context should be able to read this file and know exactly what to do next.
3. **Summary per phase is mandatory.** Not just "complete" — the key findings that downstream phases need.
4. **File paths are relative to the QA directory.** So they work regardless of session.

---

## Sub-Agent Return Format

Every sub-agent MUST end its response with a structured summary block:

```markdown
## Summary

**Status:** Complete | Partial | Failed
**Output file:** {path}
**Lines written:** {n}

### Key Findings
- {finding 1 — one line}
- {finding 2 — one line}
- ...

### Issues Found
| # | Severity | Description |
|---|----------|-------------|
| 1 | Critical | {one line} |
| 2 | High     | {one line} |

### Key Numbers
| Metric | Value | Source |
|--------|-------|--------|
| Holdings | 4,325,738 ETH | 8-K Feb 9 |
| Shares | ~524.4M (est.) | 10-Q + ATM est. |

### Next Phase Needs
- {what the next agent should focus on}
- {any flags or concerns to carry forward}
```

**Enforcement:** The orchestrator's spawn prompt includes: "You MUST end with a Summary block in the format specified. Keep it under 50 lines. Full findings go in the output file."

---

## Session Rotation Protocol

### When rotating mid-company:

1. Orchestrator writes state file with current phase status
2. Orchestrator posts to channel: "Context budget hit. Wrote state to `verification-state.json`. Resume with: *read the state file and continue BMNR from Phase 1B*"
3. New session reads state file
4. New session has clean context — only the state file summary, not accumulated history

### When rotating between companies:

1. Mark current company as complete in state file
2. Clear phase-specific data (keep only final summary)
3. Advance `companyQueue`
4. New session starts fresh with just the queue state

### Recovery from crash:

1. Read state file — last `updatedAt` tells you when it died
2. Check the last completed phase — that's your resume point
3. The incomplete phase's sub-agent may have written a partial output file — check for it
4. Restart from the last incomplete phase

---

## Multi-Company Pipeline

For running verification across N companies:

```
Company Queue: [BMNR, MARA, XXI, SBET, ASST, ...]

For each company:
  1. Fresh orchestrator session (or rotate if continuing)
  2. Read verification-state.json
  3. Run all phases for this company
  4. Write final results to state file
  5. Mark company complete
  6. Check context budget → rotate if needed
  7. Next company
```

**Rule: Never carry one company's detailed context into another's.** The only cross-company state is the queue and completion status.

---

## Orchestrator Prompt Template

When spawning the orchestrator (or resuming after rotation):

```
You are the verification orchestrator for DAT company data.

## Your Role
- Dispatch sub-agents for each verification phase
- Track progress via the state file
- NEVER read source data files yourself
- NEVER read SEC filings or ground truth files yourself
- Pass file PATHS to sub-agents — they read the data

## Process
Read `verification-state.json` for current status.
Follow VERIFICATION-PROCESS.md for the phase sequence.
After each phase completes, update the state file.

## Context Budget
You have ~195K tokens. Rotate session if you estimate >120K used.
Each sub-agent return should be ≤50 lines / ≤4K tokens.
If a sub-agent returns more, summarize it yourself and discard the excess.

## Sub-Agent Returns
Sub-agents write full data to files and return structured summaries.
When spawning the next phase, tell it: "Read [file path] for input."
Do NOT read the file yourself to build the prompt.

## Current State
{read from verification-state.json}
```

---

## Failure Modes This Prevents

| Failure | How Context Model Prevents It |
|---------|-------------------------------|
| Orchestrator reads 546-line ground truth | Rule: orchestrator never reads data files |
| MSTR context carries into BMNR | Rule: one company per rotation (or fresh session) |
| Silent crash at context limit | Budget tracking with 60% rotation threshold |
| Lost progress after crash | State file enables cold-start recovery |
| Sub-agent dumps 2000-line report into orchestrator | Enforced 50-line return summary format |
| No idea how close to the limit | Context estimate in state file, checked each phase |
| 9-minute processing delay (struggling with context) | Should never get that bloated — rotate first |

---

## Implementation Notes

### What exists today (Feb 2026)
- Sub-agents already write to files ✅
- `sessions_spawn` supports labels and cleanup ✅
- Orchestrator already chains phases sequentially ✅
- State file: **does not exist yet** ❌
- Budget tracking: **does not exist yet** ❌
- Return format enforcement: **not consistent** ❌
- Session rotation: **manual only** ❌

### Incremental Output Rule (learned Feb 14)
**Sub-agents must write output files incrementally.** Never read all inputs before writing.

Pattern: Read input A → write findings → Read input B → append findings → Write summary.

Anti-pattern: Read A, B, C, D → process → write everything at end. This fails when context fills up during reads, leaving nothing for writes.

**Evidence:** BMNR Phase 4D first attempt read all 4 input files (100K tokens, 2 hours), then tried to write the report — context exhausted, no output file created. Retry with incremental writes: 65K tokens, 2.5 minutes, complete output.

### Priority implementation order
1. **State file** — biggest bang. Enables crash recovery immediately.
2. **Sub-agent return format** — add structured summary to spawn prompts.
3. **Orchestrator discipline** — stop reading data files in orchestrator.
4. **Budget tracking** — estimate and rotate. Can be rough initially.
5. **Multi-company rotation** — one company per session as default.

---

## Changelog

- **2026-02-14:** Initial spec. Motivated by crash during BMNR Phase 1A→1B handoff after accumulated MSTR context.
