# Working Memory Buffer
> Auto-updated during sessions. Re-read at session start.
> Last updated: 2026-01-26

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
1. Continue Phase 7d: verify more companies
2. Phase 8d: Populate dilutive instruments for all companies
3. Phase 7e: UI for estimates with provenance

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

### AVX Verification (continued session)
- Found SEC CIK 1826397 (formerly AgriFORCE)
- Fixed sharesForMnav: 40M → 93.1M (Nov 2025 PIPE closed with 86.7M new shares + 6.1M warrants)
- Added SEC source URLs, updated date to Nov 5, 2025
- User clarified: S-3 shelves and warrants are standard finance, don't need warnings
- Only warn for actual dilution events (8-K Item 3.02 unregistered equity sales)

### SUIG Verification (continued session)
- Found SEC CIK 1425355 (formerly Mill City Ventures)
- Jan 8, 2026 8-K revealed major share count discrepancy
- **Fixed**: sharesForMnav 48M → 80.9M (per "fully adjusted shares" in 8-K)
- Holdings confirmed: 108,098,436 SUI
- Also fixed Q3 2025 holdings in history (was 130M, should be 108M)
- Company repurchased 7.8M shares in Q4 2025
- Company-reported mNAV: 0.64x (significantly below 1.0)
- 274 tests pass, deployed to Vercel

### NA (Nano Labs) Verification (continued session)
- Found SEC CIK 1872302 (foreign issuer - files 6-K, 20-F)
- Discovered multi-asset treasury: 130K BNB primary + 1,000 BTC passive
- BNB is active focus ($1B target), BTC is passive hold from convertible deal
- mNAV was calculating at 5.09x without BTC, should be ~2.89x with BTC included

### Secondary Crypto Holdings Feature (continued session)
- Implemented `secondaryCryptoHoldings` for multi-asset treasury companies
- Added `SecondaryCryptoHolding` interface to types.ts (asset, amount, note)
- Updated `calculateMNAV` in calculations.ts to accept `secondaryCryptoValue` parameter
- Updated `getCompanyMNAV` in use-mnav-stats.ts to calculate secondary holdings value
- Added `secondaryCryptoHoldings: [{ asset: "BTC", amount: 1_000 }]` to NA
- NA's mNAV now correctly includes BTC in crypto NAV calculation
- 274 tests pass, TypeScript compiles

### TRON Verification (continued session)
- SEC CIK: 1956744 (formerly SRM Entertainment)
- **Fixed**: Holdings were incorrectly "fixed" from 677M → 365M TRX in prior session
  - Sep 2025 $110M warrant exercise added 312M TRX (365M base + 312M = 677M)
  - Jan 23, 2026 8-K confirms "more than 677 million TRX in total"
- **Fixed**: sharesForMnav 85M → 274M (Dec 29, 2025 8-K after Justin Sun $18M investment)
- **Fixed**: Market cap display inconsistency
  - mNAV calculation used correct $433M (274M × $1.58)
  - Display showed stale FMP data ($53M, pre-warrant share count)
  - Added TRON to MARKET_CAP_OVERRIDES with $434M
- mNAV = 2.16x (116% premium, no debt - clean balance sheet)
- Q3 2025: Total liabilities only $4.8M vs $201M crypto NAV (0.02x leverage)

### Leverage Ratio Feature (continued session)
- Added Leverage Ratio = Debt / Crypto NAV to show capital structure impact
- Data table: New "Leverage" column between mNAV 24h and Price (sortable)
- Mobile card: Added Leverage to 4-column grid
- Company detail page: Added Leverage metric in Key Valuation Metrics section
- High leverage (≥1.0x) shown in amber with warning: "mNAV elevated by debt"
- This explains why NA has high mNAV (5x) - it's the $500M debt, not market premium
- 274 tests pass, deployed to Vercel

## Session Notes (2026-01-26)

### FGNX Verification (from prior session)
- sharesForMnav: 92M → 33.6M (per Jan 21, 2026 press release)
- Added SEC CIK: 1591890
- Rewrote holdings-history.ts with SEC-verified data
- mNAV: 0.90x (10% discount to NAV)

### CYPH Verification (Cypherpunk Technologies)
- Discovered our data conflated TWO companies:
  - Old: Canadian Cypherpunk Holdings (SEDAR filings)
  - New: US Cypherpunk Technologies (SEC CIK 1509745, f/k/a Leap Therapeutics)
- Holdings: 290,062 ZEC ✓ (Dec 30, 2025 8-K confirmed)
- Cost basis: $334.41 ✓ (exact match)
- **Fixed**: sharesForMnav 125M → 137.4M (basic 56.6M + pre-funded warrants 80.8M)
- Pre-funded warrants included because they're essentially shares ($0.001 exercise)
- Oct 2025 PIPE: $58.88M from Winklevoss Treasury Investments
- Added SEC CIK: 1509745
- Completely rewrote CYPH_HISTORY (old was fabricated Canadian data)
- 274 tests pass, deployed to Vercel

### Market Cap Display Fix
- User noticed mNAV showed 1.11x but NAV/share showed 32% discount - inconsistent
- Root cause: Company page used `getMarketCap()` (API data, $70M) for display
  but mNAV calculation used `getMarketCapForMnavSync()` (shares × price, $114M)
- **Fixed**: Company page now uses `getMarketCapForMnavSync()` for Market Cap display
- Result: Both Market Cap display and mNAV now use the same calculated value
- CYPH mNAV now correctly shows ~0.68x (discount to NAV, not premium)

### TBH Verification (Brag House / House of Doge)
- **Critical finding**: TBH data was completely wrong
  - TBH is a gaming company that IPO'd March 2025 - has NO DOGE
  - House of Doge (private company) holds 730M DOGE
  - Merger announced Oct 12, 2025, expected close Q1 2026
- **Holdings-history was fabricated**: showed 2024 DOGE holdings, but TBH didn't exist until 2025
- SEC CIK: 1903595
- Post-merger structure from fairness opinion:
  - ~663M new shares to HOD equity holders
  - ~50M existing TBH shares remain
  - $1.09B valuation at $1.6434/share implied
  - TBH shareholders get ~7.2%, HOD gets ~92.8%
- **Fixed**:
  - Added `pendingMerger: true`
  - Set `holdings: 0` (TBH has no DOGE)
  - Set `expectedHoldings: 730_000_000` (HOD's DOGE)
  - Set `sharesForMnav: 10_800_000` (TBH pre-merger)
  - Rewrote TBH_HISTORY with accurate timeline (IPO Mar 2025, merger announced Oct 2025)
- Jan 6, 2026: TBH received Nasdaq compliance notice (stock <$1, 180 days to fix)
- 274 tests pass

### ZONE Verification (CleanCore Solutions)
- SEC CIK: 1956741
- **Verified from 10-Q Q1 FY2026** (not press release):
  - Sep 30, 2025: 703,617,752 DOGE at $163.8M fair value
  - Sep 30, 2025: 186,598,270 shares (massive dilution from warrant exercises)
  - Nov 10, 2025: 201,309,022 shares (10-Q cover page)
- **Critical correction**: Prior share counts were fabricated (35M→60M)
  - Actual dilution: 11.8M → 186.6M shares in Q1 FY2026
  - 164M shares from warrant exercises alone
- Holdings 733.1M from press release (Nov 12) - not SEC-verified
- Added cashReserves: $12.9M
- User challenged: "Was there an unregistered equity sale?" - good catch!
  - Most dilution was registered (warrant exercises, ATM offering)
  - Some debt-to-equity conversions may have been Item 3.02
- Added ZONE to dilutive-instruments.ts:
  - Strategic Advisor warrants: 8.75M shares at $1.00, 5.25M shares at $1.33
  - Placement Agent warrants: 5.25M shares at $1.33
  - All OUT of the money at ~$0.41 stock price (strikes $1.00-$1.33)
  - Will be included in diluted count if stock rises above strike prices
- 274 tests pass

