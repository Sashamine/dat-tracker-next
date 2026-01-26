# Working Memory Buffer
> Auto-updated during sessions. Re-read at session start.
> Last updated: 2026-01-25

## Current Goal
Phase 8a - Dilutive Instruments Tracking (data structure complete, needs more companies)

## Active Context
- Project: dat-tracker-next (crypto treasury tracker)
- Deployment: Vercel at https://dat-tracker-next.vercel.app
- 54 companies tracked across BTC, ETH, SOL

## Assumptions
- User prefers adversarial verification process for data changes
- Always check ROADMAP.md before starting data architecture work
- Push to Vercel for testing, no localhost
- Track ALL dilutive instruments (no materiality threshold)

## Open Tasks
- [ ] Phase 8d: Populate dilutive instruments for remaining companies
- [ ] Phase 7d: Continue manual review of individual companies
- [ ] Phase 7e: UI for estimates with provenance

## Recent Decisions
- 2026-01-25: Created dilutive-instruments.ts for dynamic share calculation
- 2026-01-25: Use diluted shares ONLY if instruments are "in the money"
- 2026-01-25: companies.ts sharesForMnav = BASIC shares; dilution calculated dynamically
- 2026-01-22: Verification should be one coherent system (comparison engine + adversarial process)

## Known Constraints
- Aggregators (BitcoinTreasuries.net, Bitbo) can be wrong - never use as primary sources
- ATM gap: share dilution not disclosed until 10-Q
- Must update BOTH companies.ts and holdings-history.ts when changing shares
- For companies with dilutive instruments: sharesForMnav = basic shares (dilution is dynamic)
- ALTBG (Capital B): Use AMF API for French regulatory filings (ISIN FR0011053636)

## Next Actions
1. Continue verifying individual companies (user provides ticker)
2. Add dilutive instruments for each company during verification
3. Phase 8d: Populate instruments for all 54 companies

## Session Notes (2026-01-25)
- Started with UPXI and BTCS verification (from prior session)
- Discussed methodology: use diluted shares only when instruments are in-the-money
- Designed and implemented dilutive-instruments.ts with:
  - Data structure for convertibles, options, warrants
  - getEffectiveShares() function calculates dilution based on stock price
  - Integration into market-cap.ts getMarketCapForMnavSync()
- Updated BTCS from 50M (diluted) to 47M (basic) - dilution now dynamic
- 10 new tests pass, 264 total tests pass
- Added Phase 8 to ROADMAP.md

### AMF API Integration (continued session)
- ALTBG verification revealed data discrepancy: 2,201 vs 2,823 BTC
- Discovered AMF (French regulator) has OpenDataSoft API at dilaamf.opendatasoft.com
- Created `src/lib/fetchers/amf.ts` - fetches regulatory filings by ISIN
- API parses filing titles to extract BTC holdings (e.g., "total of 2,823 BTC")
- Updated ALTBG:
  - holdings: 2,201 → 2,823 BTC (Nov 25, 2025 AMF filing)
  - sharesForMnav: 50M → 227M (basic shares per mNAV.com; fully diluted ~392M)
  - source: theblock.co (aggregator) → AMF PDF URL (primary source)
- Sep 2025 EUR58.1M private placement caused ~4x share dilution (48M → 227M)
- Added historical entries to holdings-history.ts from AMF filings
- 271 tests pass, TypeScript compiles

### BTCS Adversarial Verification (continued session)
- Ran full adversarial verification on BTCS data
- Verified ETH holdings (70,500) against 8-K Jan 7, 2026 press release
- Verified basic shares (47,075,189) against 10-Q Q3 2025 balance sheet
- Verified diluted calculation (50,298,201) matches 10-Q
- **Fixed**: Convertible note source dates were wrong by ~1 year
  - $5.85 note: "8-K Jul 2024" → "8-K May 2025"
  - $13.00 note: "8-K Dec 2024" → "8-K Jul 2025"
  - Updated URLs to point to btcs.com official pages
- Identified concern: 8-K Jan 5, 2026 shows Item 3.02 (unregistered equity sale)

### Data Warnings Feature (continued session)
- Added `DataWarning` type and `dataWarnings` field to Company interface
- Types: equity-sale, share-change, debt-change, stale-data
- Display: 📋 icon with tooltip in data table (desktop + mobile)
- Added warning for BTCS about Jan 5 equity sale
- 274 tests pass, deployed to Vercel

