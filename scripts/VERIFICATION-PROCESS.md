# DAT Company Verification Process

## When to Use This

**Full adversarial process required when:**
- Onboarding a new company (all steps)
- Re-verifying an existing company's data
- Any task reconciling data across >2 independent sources
- Any financial numbers that feed into mNAV/HPS calculations

**Single-agent sufficient when:**
- Updating one metric from one source (e.g., new PR with holdings update)
- Citation spot-check (does this link contain this text?)
- Code-only changes where compiler catches errors

---

## Phase 1: Data Extraction (Adversarial — 2 agents)

### Agent A: SEC Researcher
Goes to primary sources. Does NOT read any project code.

**11-Step Process:**

1. **Holdings Data** — Find current crypto holdings
   - Check SEC EDGAR 8-Ks (Items 7.01, 8.01) for the MOST RECENT disclosure
   - Check company press releases / IR page
   - Check company Twitter/X for informal disclosures
   - **STALENESS RULE: For every metric, confirm no newer source exists. If you find a Q3 source, explicitly check for Q4 or newer PRs before recording it.**
   - Record: asset type, exact amount, as-of date, source URL, verbatim quote

2. **SEC Filing Verification** — Map the filing landscape
   - Confirm CIK
   - List ALL filings from past 6 months (10-Q, 10-K, 8-K, S-3, 424B)
   - For each 8-K: note Item numbers and what they disclose
   - Record accession numbers, filing dates, period-end dates

3. **XBRL Data Extraction** — Structured data from API
   - Fetch `https://data.sec.gov/api/xbrl/companyfacts/CIK{padded10}.json`
   - Extract: EntityCommonStockSharesOutstanding (cover page, MOST RECENT), Assets, CashAndCashEquivalents, LongTermDebt, ConvertibleNotesPayable, PreferredStockValue
   - Record exact values, periods, units

4. **Fiscal Year Identification**
   - FY end month, current quarter, calendar alignment

5. **Earnings Data** — Build quarterly history
   - For each available quarter (go back 4+ quarters):
     - Holdings at quarter end (from filing notes, not balance sheet USD)
     - Shares at quarter end (balance sheet) AND filing date (cover page)
     - Calculate HPS for each
   - **Use BASIC shares (cover page) for sharesForMnav**
   - Note diluted shares separately

6. **Holdings Per Share Growth**
   - QoQ growth for each quarter
   - Trend direction and acceleration

7. **Non-Crypto Investments**
   - Other material assets (AI/HPC stakes, funds, real estate)
   - Treatment recommendation for mNAV

8. **Company Metadata**
   - Strategy, staking info, key notes
   - Dual-class structure? Majority ownership?

9. **Dilutive Instruments**
   - Warrants, convertibles, options from MOST RECENT filings
   - Check 8-K Items 1.01, 2.03, 3.02 for new issuances
   - For convertibles: face value, conversion price, rate, maturity

10. **Company Links**
    - Website, Twitter/X, IR page

11. **mNAV Calculation**
    - Compute from extracted data
    - Note methodology (EV/CryptoNAV vs company's own presentation)

**Output:** `ground-truth.md` with verbatim quotes and URLs for every number.

### Agent B: Extraction Adversary
Reviews Agent A's output. Attacks the ENTIRE extraction — not just one dimension.

**Attack vectors:**

1. **Completeness** — Did Agent A miss any filings? Check EDGAR for 8-Ks, S-3s, 424Bs that weren't mentioned. Did it miss convertibles (Item 2.03)? Preferred equity? Warrants (Item 3.02)?

2. **Accuracy** — For every quoted number, navigate to the source URL and verify the quote actually exists in the document. Fabricated quotes are a known failure mode.

3. **Staleness** — For every metric, is there a NEWER source? If Agent A used Q3 data, check whether Q4 or a more recent PR exists. Check the company's PR page and recent 8-Ks independently.

4. **Methodology** — Did Agent A use the right share count type? (Basic vs diluted weighted avg — a known error pattern.) Did it correctly identify debt instruments? (XBRL LongTermDebt misses convertibles.)

5. **Arithmetic** — Recalculate every derived number (HPS, mNAV) from the raw inputs. Do they match?

6. **Source authority** — For each citation, is it using the most authoritative available source? Preference order: SEC filing (8-K/10-Q/10-K) > regulatory filing > press release > company website. If the same data exists in both a PR and an 8-K, the citation should point to the 8-K. PR URLs can change or disappear; SEC EDGAR is permanent.

**Output:** `extraction-adversary.md` — every error found, with evidence.

**Threshold for adversarial:** This phase is always adversarial because it reconciles multiple source types (XBRL, 8-K, 10-Q, PRs) across multiple time periods. Single agents consistently cut corners on exhaustive source searches, fabricate quotes, and miss entire categories of financial instruments.

---

## Phase 2: Custom View & Provenance (Single agent, if view exists)

If the company already has a custom view and provenance file, skip to Phase 3.

If not:
- Build provenance file (`provenance/{ticker}.ts`) from ground truth
- Build custom view component (`{TICKER}CompanyView.tsx`)
- Wire up MnavCalculationCard with source URLs
- Add to company page conditional

**Single agent is fine here** — it's code generation from known inputs, compiler catches errors.

---

## Phase 3: Citation Verification (Single agent)

Navigate to the company page. Click every ⓘ popover.

For each citation:
1. Read the search term and source URL from the popover
2. Navigate to the source URL
3. Ctrl+F the exact search term
4. Screenshot showing match count
5. If 0 matches → FAILURE

**Single agent is fine** — mechanical verification with binary pass/fail. No reconciliation needed.

**Output:** `citations/report.md` with screenshots.

---

## Phase 4: Cross-Consistency Check (Adversarial — 2 agents)

### Agent C: Pipeline Checker
Compares ground truth against ALL code files and UI.

**File-by-file comparison:**
- `provenance/{ticker}.ts` — every value matches ground truth?
- `companies.ts` — sharesForMnav, holdings, debt, cash, burn, preferredEquity match?
- `earnings-data.ts` — quarterly entries match ground truth?
- `holdings-history.ts` — entries match? Quarter-end anchors present?

**Cross-file consistency:**
- Every quarter-end in earnings-data has a matching holdings-history entry
- Holdings, shares, and HPS identical at those dates
- companies.ts sharesForMnav = provenance sharesOutstanding
- Company page mNAV formula matches overview page (`getCompanyMNAV()`)
  - Same cash treatment (free cash vs full cash)
  - Same otherInvestments inclusion (materiality threshold)
  - Same preferredEquity

**UI verification:**
- Navigate to company page AND overview page
- Do the mNAVs match?
- Does HPS chart match earnings table?
- Any hardcoded values that should be dynamic?

**Output:** `pipeline-check.md` with MATCH/MISMATCH for every field.

### Agent D: Final Adversary
Reviews ALL previous agents' work. Structured attack vectors:

**Attack vectors:**

1. **Spot-check vs exhaustive** — Did Agent C actually check every value in every file, or did it say "ALL MATCH" after checking a few? Independently verify at least 3 values Agent C claimed matched.

2. **Hardcoded values** — Search the company view component for hardcoded numbers (grep for specific values like share counts, sats, holdings). Any number that should be dynamic but is hardcoded is a bug. (Known pattern: ABTC had "380 sats" hardcoded.)

3. **Formula parity** — Independently read `getCompanyMNAV()` in `mnav-calculation.ts` and the company view's mNAV formula. Compare them line by line. Don't trust Agent C's assessment. Check: cash treatment (free cash vs full cash), otherInvestments inclusion, preferredEquity, debt adjustments for ITM converts.

4. **Chart/earnings alignment** — Navigate to the company page. Read the HPS chart data points at quarter-end dates. Read the earnings table values. Do they match? This must be a visual check, not just code comparison.

5. **Placeholder detection** — Check holdings-history entries for suspiciously round numbers or linear progressions that suggest placeholders rather than real data. (Known pattern: BTBT had 85K→120K→140K placeholder ETH values.)

6. **Agent quality** — Did Agent A read the right filings? Did Agent B actually verify quotes exist in documents, or just rubber-stamp? Did Agent C catch cross-file drift or just check surface-level matches?

7. **Fix safety** — If fixes were applied between phases, did they introduce new inconsistencies? Check that all four data files still agree after changes. (Known pattern: ABTC fix changed shares to 920.7M but left SPS baseline at 368 instead of 371.)

8. **Staleness UX** — Does the page correctly flag stale individual metrics to users? Check: if holdings were updated recently but cash is 4+ months old, does the UI warn about stale cash? The StalenessNote component may use the most recent date across ALL metrics, masking individually stale values. (Known pattern: BTBT holdings fresh at Jan 31 masked Sep 30 cash staleness.)

**Output:** `final-adversary.md`

**Threshold for adversarial:** This phase is always adversarial because it's cross-file consistency (>2 files) feeding into financial calculations. Pipeline checkers consistently miss hardcoded values, formula divergences, and placeholder data.

---

## Phase 5: Resolution & Verification (Single agent)

Apply fixes from Phase 4 findings. Then:

### Post-Fix Verification Agent
- Re-read all four data files
- Verify every changed value is internally consistent
- HPS = holdings / shares (do the math)
- Check UI compiles and loads
- Confirm company page mNAV = overview page mNAV

**Single agent is fine** — it's checking a known set of changes against known expected values.

**Output:** `post-fix-verification.md`

---

## Process Summary

| Phase | Agents | Adversarial? | Why |
|-------|--------|-------------|-----|
| 1. Data Extraction | 2 (researcher + adversary) | Yes | Multi-source reconciliation, fabrication risk |
| 2. Custom View | 1 | No | Code generation, compiler-verified |
| 3. Citations | 1 | No | Mechanical pass/fail checks |
| 4. Cross-Consistency | 2 (pipeline + adversary) | Yes | Cross-file financial calculations |
| 5. Resolution | 1 | No | Known fixes, verifiable output |

**Total: 5 phases, 7 agents (4 adversarial, 3 single)**

---

## Adversarial Threshold Rule

> **If the task involves reconciling data across >2 independent sources, OR if an error would silently propagate into financial calculations, it requires adversarial verification.**

Single agents cut corners on:
- Exhaustive source searches (grab first plausible answer)
- Cross-file consistency (update one file, miss three)
- Quote accuracy (fabricate plausible-sounding quotes)
- Staleness (use whatever's convenient, not what's newest)

---

## Lessons Learned

### From ABTC (Feb 2026)
- 899M shares was the diluted weighted average for EPS, not actual shares outstanding
- Hardcoded "380 sats" SPS baseline was wrong after shares correction
- Q3 period-end shares (920.7M) differ from cover page shares (927.6M) — use period-end for quarterly data
- Search terms must match document text exactly ("8,052" not "8,052,000" for thousands-denominated filings)

### From BTBT (Feb 2026)
- Provenance contained a fabricated quote ("No preferred stock outstanding" — doesn't exist in 10-Q)
- Holdings history Q1-Q3 had placeholder values (85K/120K/140K ETH) with no source
- Source verifier missed $150M convertible notes (XBRL LongTermDebt field doesn't capture converts)
- Company page and overview page used different mNAV formulas (cash treatment, otherInvestments)
- Most data from Q3 PR when Jan/Feb 2026 data was available — staleness not caught until human review
- All citations pointed to press releases when 8-K filings contained the same data — SEC filings are more authoritative and permanent
- StalenessNote component picks most recent date across ALL metrics, masking individually stale values (Jan 31 holdings hid Sep 30 cash, Mar 31 burn)
- Company page ITM convert adjustment missing — would diverge from overview when stock exceeds $4.16 conversion price
