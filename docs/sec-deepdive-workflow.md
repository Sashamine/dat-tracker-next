# SEC Deep-Dive Workflow

## Problem
Each company verification eats ~50-100K tokens of context in the main session.
Three companies in one session = compaction. Bad.

## Solution: Sub-Agent Pattern

### Step 1: Main session kicks off sub-agent
```
Sub-agent task: "Run SEC deep-dive for [TICKER] (CIK [CIK]).
1. Run: powershell scripts/xbrl-extract.ps1 -CIK [CIK] -Period [latest] -Filing 10-Q
2. Check recent 8-Ks via EFTS: https://efts.sec.gov/LATEST/search-index?q=%22[company]%22&dateRange=custom&startdt=YYYY-MM-DD
3. Write findings to clawd/[ticker]-audit/FINDINGS.md
4. Keep it concise — key values, accession numbers, discrepancies only."
```

### Step 2: Sub-agent does the heavy lifting
- Fetches XBRL, reads filings, cross-references
- Writes structured findings to disk
- All that context stays in the sub-agent session (isolated)

### Step 3: Main session builds provenance
- Reads FINDINGS.md (small, structured)
- Copies scripts/provenance-template.ts → provenance/[ticker].ts
- Fills in values from findings
- Uses `grep`/`sed` for targeted edits to companies.ts, earnings-data.ts, etc.
- **Never reads entire large files** — use offset/limit or grep

## Context Budget Rules

### DO
- Use `grep -n` to find line numbers, then `sed -n 'X,Yp'` to read just that section
- Use `offset`/`limit` params when reading files
- Process XBRL via PowerShell script (xbrl-extract.ps1), not raw JSON fetch
- Use sub-agents for any task that reads multiple SEC filings
- Keep provenance template handy (don't re-read reference files)

### DON'T
- Fetch raw XBRL JSON into context (50KB+)
- Read entire companies.ts (2300+ lines)
- Read entire earnings-data.ts (3000+ lines)
- Read full provenance files "for reference" — use the template
- Read sub-agent findings AND the raw filings (pick one)

## Tools

- `scripts/xbrl-extract.ps1` — Extracts key fields from SEC XBRL API
- `scripts/provenance-template.ts` — Skeleton for new provenance files
- Sub-agent pattern — Isolates heavy SEC research from main context
