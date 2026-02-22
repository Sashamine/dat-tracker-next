# STATE — Verification Run

- **Ticker:** 
- **CIK:** 
- **Run date:** 
- **Run dir:** `verification-runs/<ticker>/<YYYY-MM-DD>/`

## Objective (define scope)
What are we verifying for this run?
- [ ] Holdings (asset amount + as-of date)
- [ ] Shares outstanding (basic)
- [ ] Cash
- [ ] Total debt
- [ ] Preferred equity
- [ ] Dilutives (warrants/convertibles/etc.)
- [ ] mNAV sanity
- [ ] UI citations render + are clickable

## Phase gates (GO/NO-GO)
> Do not proceed past a gate without a clean verdict.

- [ ] **Phase 0 — Setup** (STATE + sources manifest)
- [ ] **Phase 1 — Reconstruct** (R1–R4 complete)
- [ ] **Phase 1 Synth — R‑Synth** (r-synth + verdict)
- [ ] **Phase 1‑ADV — Adversarial** (A-synth PASS)
- [ ] **Phase 2 — Diff** (diff.md written)
- [ ] **Phase 3 — Patch** (patch.diff / branch created)
- [ ] **Phase 3‑V — Verify patch** (v-synth PASS)
- [ ] **Phase 4 — Cross-file audit** (c-synth PASS)
- [ ] **Phase 5 — Merge**
- [ ] **Phase 6 — UI + citations** (ui-citation-report PASS)
- [ ] **Phase 7 — mNAV sanity**

## Required artifacts checklist
- [ ] `sources-manifest.md`
- [ ] `r1-holdings.md`
- [ ] `r2-shares.md`
- [ ] `r3-financials.md`
- [ ] `r4-dilutives.md`
- [ ] `r-synth.md`
- [ ] `r-synth-verdict.txt`
- [ ] (optional) `a-synth.md`
- [ ] (optional) `diff.md`
- [ ] (optional) `patch.diff`
- [ ] (optional) `v-synth.md`
- [ ] (optional) `c-synth.md`
- [ ] (optional) `ui-citation-report.md`

## Notes / decisions log
- 
