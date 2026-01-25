# Working Memory Buffer
> Auto-updated during sessions. Re-read at session start.
> Last updated: 2026-01-25

## Current Goal
Phase 7d - Manual Review Process for data discrepancies

## Active Context
- Project: dat-tracker-next (crypto treasury tracker)
- Deployment: Vercel at https://dat-tracker-next.vercel.app
- 54 companies tracked across BTC, ETH, SOL

## Assumptions
- User prefers adversarial verification process for data changes
- Always check ROADMAP.md before starting data architecture work
- Push to Vercel for testing, no localhost

## Open Tasks
- [ ] Continue Phase 7d (manual review process)
- [ ] Phase 7e: UI for estimates with provenance (next)

## Recent Decisions
- 2026-01-22: Verification should be one coherent system (comparison engine + adversarial process)
- Share counts: Use dashboards where available, accept quarterly lag otherwise

## Known Constraints
- Aggregators (BitcoinTreasuries.net, Bitbo) can be wrong - never use as primary sources
- ATM gap: share dilution not disclosed until 10-Q
- Must update BOTH companies.ts and holdings-history.ts when changing shares

## Next Actions
1. Ask user what they want to work on
2. Check ROADMAP.md for current phase status
3. If data work: run adversarial process before any edits

## Session Notes
(Add notes during work session here)

