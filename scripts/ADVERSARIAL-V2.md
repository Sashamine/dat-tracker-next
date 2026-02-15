# Adversarial Verification v2 — Decomposed Agents

## Philosophy

One agent with 10 checks skims. Four agents with 1 job each go deep.
A fifth agent synthesizes and finds what fell between the cracks.

Each agent gets **one principle**, not a checklist. Fewer instructions = deeper work.

---

## Agent 1: Source Verifier

**Principle:** Every cited number must be findable at its source URL.

For every provenance entry:
1. Open the source URL
2. Ctrl+F the searchTerm
3. Screenshot the match (or lack of match)
4. If 0 matches → FAIL with evidence

That's it. Don't check math. Don't check consistency. Just: does this URL contain this text?

**Output:** Table of (field, url, searchTerm, PASS/FAIL, screenshot)

---

## Agent 2: Math Auditor

**Principle:** Every derived number must be reproducible from its inputs.

Read the data files. For every calculated value:
1. Identify the formula
2. Identify the inputs
3. Recalculate from scratch
4. Compare to stored value

Targets: mNAV, HPS, EV, CryptoNAV, cost basis, preferred equity (shares × par)

Don't verify sources. Don't check URLs. Just: does the math work?

**Output:** Table of (metric, formula, inputs, calculated, stored, PASS/FAIL)

---

## Agent 3: Provenance Tracer

**Principle:** Every input must trace forward from a primary source, never backward from an output.

For every number in companies.ts:
1. What is its claimed source?
2. Is that source a primary document (filing, disclosure) or derived?
3. Could this number have been reverse-engineered from another number we calculate?
4. Is there a newer source that supersedes it?

Red flags:
- Cash "derived from" EV or mNAV
- Shares "estimated from" market cap
- Any input whose source is our own UI or calculation
- Two entries citing each other circularly

Don't check URLs work. Don't verify math. Just: is the provenance chain clean?

**Output:** Provenance chain for each input (source → value), with flags

---

## Agent 4: Cross-File Consistency

**Principle:** The same number must appear identically everywhere it's used.

Read ALL data files for one company:
- `companies.ts`
- `provenance/{ticker}.ts`
- `earnings-data.ts`
- `holdings-history.ts`
- `dilutive-instruments.ts`
- `mnav-calculation.ts` (the formula)
- The custom view component

For every shared value (holdings, shares, debt, cash, preferred):
1. Find it in every file where it appears
2. Compare exact values
3. Flag any mismatch

Also check: is anything double-counted? (e.g., same instrument in both preferredEquity AND dilutive faceValue affecting the same EV path)

Don't verify sources. Don't verify math. Just: do all files agree?

**Output:** Matrix of (field, file1 value, file2 value, file3 value, MATCH/MISMATCH)

---

## Agent 5: Synthesizer

**Principle:** The gaps between agents are where errors hide.

You receive four reports. Your job is NOT to summarize them. Your job is to find what they missed by looking at the **intersections**.

Specific things to check:

1. **Source ✓ but Math ✗** — A URL contains the number, but the math doesn't work. Means we're citing a source but using it wrong.

2. **Math ✓ but Provenance ✗** — The calculation works, but an input was derived circularly. Means the math is internally consistent but built on sand.

3. **Cross-file ✓ but Source ✗** — All files agree on a number, but it's not actually in the cited document. Means a fabricated number propagated consistently.

4. **Everything ✓ but wrong** — All four agents passed, but the number is still wrong. This happens when the wrong source was chosen (e.g., Q3 when Q4 exists), or the right source was misread. Pick the 2-3 highest-risk values and independently verify them yourself.

5. **Agent quality** — Did any agent take shortcuts? Signs: all-PASS with no screenshots, vague "verified" without specifics, checking 3 of 10 fields and extrapolating.

**Output:** Final verdict with any new findings. If everything truly passes, explain WHY you trust the results (not just "all agents said PASS").

---

## When to Use This

**Full 5-agent process:**
- New company onboarding
- Re-verification after major data changes
- Any time mNAV inputs change by >10%

**3-agent subset (Source + Math + Synthesizer):**
- Single metric update (new 8-K with holdings change)
- Quarterly refresh

**1-agent spot check:**
- Citation link broken
- UI bug report
- Minor correction

---

## Lessons Learned (reference for Synthesizer only)

The Synthesizer agent should read VERIFICATION-PROCESS.md lessons learned section for historical failure patterns. The focused agents should NOT — it adds noise to their narrow task.

Common failure patterns the Synthesizer watches for:
- Preferred equity valued at market instead of par
- Shares subtracted that were never in the count
- Cash reverse-derived from EV
- Search terms that match page titles but not document content
- faceValue on instruments tracked as preferredEquity (double-count on ITM)
- Agents verifying against listing pages instead of actual source documents
