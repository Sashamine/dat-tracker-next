## Summary
Describe what changed and why.

## Auto-data checklist (only if this PR has the `auto-data` label)
- [ ] Changes are **fill-missing only** (no overwrites of existing fields)
- [ ] Company state verification passes (`state:verify:*`)
- [ ] Diff is limited to expected files (typically `src/lib/data/companies.ts`, `states/**`, `infra/*.json`)
- [ ] DLQ changes (if any) look reasonable (no obvious spam/loop)
- [ ] Sanity check a couple tickers in the diff for plausibility
