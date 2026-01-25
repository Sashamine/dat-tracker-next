# DAT Tracker - Claude Context

## Working Memory (Session State)
@CLAUDE.local.md

---

## IMPORTANT: Check ROADMAP.md First!

**Before starting any data architecture work, read `ROADMAP.md`** for:
- Current phase and status
- What's been completed
- What's in progress
- Open questions and decisions made

This prevents us from re-discussing solved problems or losing track of progress.

### ENFORCE THE PROCESS

**If the user tries to skip ahead or jump phases, PUSH BACK.**

Say something like:
> "Hold on - we're still in Phase X. ROADMAP.md shows we haven't finished [specific incomplete task]. Let's complete that first, or explicitly decide to skip it and document why."

This applies even if the user insists. The user has explicitly requested this enforcement because they tend to get carried away by complexity. Completing phases properly prevents rework.

**Exceptions:**
- Urgent bugs/fixes unrelated to the roadmap
- User explicitly says "I know we're skipping, add it to decisions log"

---

## MANDATORY: Adversarial Process for Data Changes

**Before editing any data file (companies.ts, holdings-history.ts), you MUST run the adversarial process.**

Do NOT see a discrepancy and immediately fix it. That leads to errors.

### The Process

1. **Proposer**: "I want to change X to Y because [source]"
2. **Challenger**: Challenge BOTH sides:
   - Where did the existing value X come from? Check git history. What source did it cite?
   - Where did the proposed value Y come from? Is it actually verified?
3. **Resolution**: Weigh evidence for both sides, then decide

### Two Types of Data

**Verifiable data** (holdings, quarterly share counts):
- Primary source exists with exact number
- Rule: **Must read the actual primary source document** before changing
- Primary sources: SEC EDGAR filings, official company pages (strategy.com/purchases)
- NOT primary sources: news articles, aggregators, web search results

**Estimated data** (shares between quarters):
- No primary source for current value
- Must derive from: last verified value + estimated change
- Rule: **Must show verified inputs + methodology + confidence range**
- Mark clearly as estimate in the code

### What "Verified" Means

**Verified**: I have read the primary source document and it shows the number.

**Not verified**:
- "Web search says X" - that's a claim, not verification
- "News article reports X" - that's a claim about what someone else said
- "Aggregator shows X" - aggregators can be wrong

### Derived Values Are Not Verified

**If your number requires math, it's not verified.**

Example: "Ramaswamy owns 113.9M shares at 9.8% stake → 1.16B total shares"

This is a *derived* value. Even if the inputs are from SEC filings, the calculated output is not verified. A filing might state a different total due to rounding, timing, or share classes you missed.

**Rule: Always search for a filing that states the number directly before accepting a derived value.**

If a direct source exists (e.g., DEF 14C listing "1,049,527,531 Class A + 197,909,283 Class B"), use that instead of your calculation.

### Before Any Data Edit, Answer These Questions

1. What is the existing value and where did it come from? (check git)
2. What source did the existing value cite? Does that source actually say that?
3. What is the proposed new value and what is its primary source?
4. Have I read the actual primary source document (not an article about it)?
5. Is this verifiable data or an estimate? If estimate, what's the methodology?

**If you cannot answer these questions, you cannot make the edit.**

### MANDATORY: Data Freshness Check

**When investigating a discrepancy, check if the source date is >90 days old.**

**If stale (>90 days), search for recent activity ONCE per company before updating any fields.**

This is a per-company check, not per-field. Once you've verified a company has no recent activity, you can update all its fields without re-checking.

#### When This Applies

**DO run freshness check when:**
- Investigating a discrepancy with a stale source (>90 days old)
- First time touching a company's data in this session

**DON'T run freshness check when:**
- Source is fresh (<90 days old)
- You already verified this company earlier in the same session
- Simply reading data without modifying it

#### The 3 Questions (Non-Negotiable)

1. **How old is the source?**
   - Calculate: today's date minus source date
   - If >90 days → STOP. Do not update data yet.

2. **Is there a newer source?**
   - Q3 filing exists → Search for Q4 filing, 8-Ks, press releases since then
   - Check company IR page for recent announcements
   - Search: "[Company] [field] October November December [year]"

3. **What could have changed?**
   - Miners: equity offerings, debt paydowns/issuances, BTC sales
   - Treasury companies: new purchases, capital raises, conversions
   - All companies: stock splits, reverse splits, warrant exercises

#### Why This Matters

Example failure (CORZ, Jan 2026):
- Discrepancy showed SEC 10-Q Q3 2025 as source
- I updated to match SEC values without checking freshness
- Q3 2025 = Sep 30, 2025 = **4 months stale**
- Should have searched for Q4 activity before accepting those values

**The trigger is automatic**: See a date → Calculate age → If >90 days → Search before proceeding.

---

## MANDATORY: Keep companies.ts and holdings-history.ts in Sync

**When updating share counts, you MUST update BOTH files.**

### The Two Files

1. **companies.ts** - `sharesForMnav` field (used for mNAV calculation)
2. **holdings-history.ts** - `sharesOutstandingDiluted` in the latest entry (historical tracking)

### The Rule

**When updating shares for a company:**
1. Update `sharesForMnav` in companies.ts with source citation
2. Add a new entry to holdings-history.ts with matching `sharesOutstandingDiluted`
3. Run the consistency test: `npx vitest run shares-consistency`

### Why This Matters

Example failure (CLSK, Jan 2026):
- Updated companies.ts with new SEC DEF 14A share count (255M)
- Forgot to update holdings-history.ts (still had 325M from Dec 2025)
- Result: 27% discrepancy, incorrect holdingsPerShare calculations

### The Validation Test

Run `npx vitest run shares-consistency` to find all discrepancies.

Any variance between `sharesForMnav` and the latest `sharesOutstandingDiluted` will be flagged.

---

## Deployment

**This project deploys to Vercel.** Changes must be committed and pushed to see them live.

- Production URL: https://dat-tracker-next.vercel.app
- DO NOT suggest localhost/port 3000 for testing - always push to Vercel
- After making changes, commit and push to deploy

## Key Architecture Decisions

### Holdings Data
- Show date + source link for verification (no staleness colors/warnings)
- Users can click source link to verify data themselves
- Staleness logic is internal only (for monitoring system)

### Monitoring System
- Automated hourly checks via Vercel Cron
- Primary sources first: SEC EDGAR > Holdings Pages > IR Pages
- Aggregators (Bitbo, BitcoinTreasuries.net) are for verification only, not primary data
- No CoinGecko

### Data Sources Priority
1. SEC EDGAR (8-K, 10-Q, 10-K) - highest trust
2. Direct holdings pages (KULR tracker, Metaplanet analytics)
3. Company IR pages (press releases)
4. Twitter (secondary)
5. Aggregators (verification/fallback only)

**IMPORTANT: Aggregators (BitcoinTreasuries.net, Bitbo) can be wrong. Never use them as primary sources. They are for cross-checking only. Always prefer SEC filings, company websites, or official press releases.**

## Common Tasks

### Deploy changes
```bash
git add . && git commit -m "message" && git push
```

### Check TypeScript
```bash
npx tsc --noEmit
```

## Company Data Sources

**IMPORTANT: Check `src/lib/data/company-sources.ts` first!**

This file contains official dashboards, SEC CIKs, and data methodology for each company:
- **SBET**: https://www.sharplink.com/eth-dashboard (updates mNAV daily)
- **MSTR**: https://www.strategy.com/bitcoin
- **Metaplanet**: https://metaplanet.jp/bitcoin (updates daily)
- **Blockworks**: https://blockworks.com/analytics/{TICKER} (mNAV charts)

When calculating mNAV, verify against official dashboards when available.

### Shares Outstanding
- Use `diluted` shares when available (WeightedAverageNumberOfDilutedSharesOutstanding from SEC)
- Some companies (SBET) only publish basic shares - note this in company-sources.ts
- Always document the source and methodology in holdings-history.ts comments

## Don't Forget
- Always push to deploy - no localhost testing
- No staleness colors in UI - just show dates
- Source URLs are important - add them for new companies
- Check company-sources.ts for official dashboards before web searching

## When Data is Wrong
When user reports incorrect data, DON'T just patch it. Instead:
1. Explain WHY the data was wrong (stale API? manual entry error? wrong source?)
2. Explain HOW to systemically fix it (add sharesForMnav? better data source? automated monitoring?)
3. Or explain why we CAN'T fix it systemically and manual patches are necessary

Only patch after explaining the root cause and systemic solution (or lack thereof).

## mNAV Calculation Architecture

### Market Cap Calculation
- `sharesForMnav` × Stock Price = Market Cap (when share count is known)
- Falls back to API market cap if no sharesForMnav
- API market caps (FMP) can be stale - use MARKET_CAP_OVERRIDES to fix

### mNAV Formula
```
Free Cash = Cash Reserves - Restricted Cash (only subtract unencumbered cash)
Enterprise Value = Market Cap + Total Debt + Preferred Equity - Free Cash
Crypto NAV = Holdings × Crypto Price (crypto only, not other assets)
mNAV = Enterprise Value / Crypto NAV
```

`sharesForMnav` is ONLY for market cap. Balance sheet items (debt, cash, preferred, restrictedCash) are separate inputs.

## How to Add a New Company

### Step 1: Add to companies.ts

Add the company to the appropriate asset array (btcCompanies, ethCompanies, etc.):

```typescript
{
  id: "ticker-lowercase",      // Unique ID, usually lowercase ticker
  name: "Company Name",
  ticker: "TICK",
  asset: "BTC",                // BTC, ETH, SOL, etc.
  tier: 1,                     // 1 = primary, 2 = secondary
  holdings: 1000,              // Current crypto holdings
  holdingsLastUpdated: "2026-01-21",
  holdingsSource: "sec-filing", // sec-filing, company-website, press-release
  holdingsSourceUrl: "https://...",
  datStartDate: "2025-01-01",  // When they started DAT strategy

  // Optional but recommended for mNAV:
  sharesForMnav: 100_000_000,  // Diluted shares for market cap calc
  totalDebt: 500_000_000,      // Total debt in USD
  debtSource: "SEC 10-Q Q3 2025",
  debtAsOf: "2025-09-30",
  cashReserves: 50_000_000,    // Cash in USD
  cashSource: "SEC 10-Q Q3 2025",
  cashAsOf: "2025-09-30",

  // Optional metadata:
  website: "https://...",
  twitter: "https://twitter.com/...",
  secCik: "0001234567",        // For SEC EDGAR lookups
  isMiner: false,              // true for BTC miners
  leader: "CEO Name",
  strategy: "Brief strategy description",
  notes: "Additional context",
}
```

### Step 2: Add to holdings-history.ts

Add historical holdings data for the company:

```typescript
"TICK": [
  {
    date: "2025-01-15",
    holdings: 500,
    sharesOutstandingDiluted: 100_000_000,
    holdingsPerShare: 0.000005,
    source: "SEC 8-K",
    sharesSource: "SEC 10-Q Q4 2024",
  },
  {
    date: "2025-06-30",
    holdings: 1000,
    sharesOutstandingDiluted: 100_000_000,
    holdingsPerShare: 0.00001,
    source: "SEC 8-K",
    sharesSource: "SEC 10-Q Q2 2025",
  },
],
```

### Step 3: Determine Data Sources

**For US companies:**
1. Get SEC CIK from https://www.sec.gov/cgi-bin/browse-edgar?company=COMPANY&CIK=&type=&owner=include&count=40&action=getcompany
2. Check for official holdings dashboard (like strategy.com, kulrbitcointracker.com)
3. Use SEC 10-Q for shares outstanding (WeightedAverageNumberOfDilutedSharesOutstanding)

**For foreign companies:**
1. Check local exchange filings
2. May need marketCap override if no US price feed

### Step 4: Verify mNAV Calculation

After adding, verify the mNAV looks reasonable:
- Compare to mNAV.com if available
- Check that market cap × shares ≈ expected market cap
- Verify debt/cash numbers against latest filing

### Checklist
- [ ] Added to correct asset array in companies.ts
- [ ] Holdings and source URL are accurate
- [ ] sharesForMnav set (for mNAV calculation)
- [ ] totalDebt/cashReserves set with source tracking (if material)
- [ ] Added to holdings-history.ts with at least one entry
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Tests pass (`npm test`)

---

## Future Work / TODO

### High Priority
- [x] **Auto-track shares from SEC filings**: LLM extractor now parses shares outstanding from 8-K/10-Q/10-K filings. Supports dual-class companies (Class A + Class B). Any share mismatch is flagged for review via Discord alert.

### Medium Priority
- [ ] Scrape official IR dashboards (MSTR, SBET, Metaplanet) for market cap verification
- [ ] Add discrepancy monitoring: cron job comparing our market caps vs Yahoo Finance, flag >10% differences

### Dual-Class Companies
Companies with multiple share classes (like XXI) require special handling:
- `isDualClass: true` in company-sources.ts
- `shareClasses: ['Class A', 'Class B']` for LLM extraction hints
- `sharesForMnav` should be TOTAL shares (sum of all classes)
- LLM extractor asks for each class separately, then sums for total

---

## Working Memory Protocol

**CLAUDE.local.md is the rolling context buffer.** Update it to maintain state across sessions.

### When to Update

1. **Session start**: Read the buffer, note any stale info
2. **After completing a task**: Update "Open Tasks" and "Session Notes"
3. **After making a decision**: Add to "Recent Decisions" with date
4. **Before session end**: Update all sections with current state
5. **When context gets long**: Summarize and refresh the buffer

### What to Track

| Section | Update Frequency |
|---------|------------------|
| Current Goal | When goal changes |
| Assumptions | When discovering new constraints |
| Open Tasks | After each task completion |
| Recent Decisions | Immediately when decided |
| Known Constraints | When hitting blockers |
| Next Actions | After completing actions |
| Session Notes | Throughout session |

### Buffer Maintenance

- Keep each section concise (3-5 bullet points max)
- Move completed items to ROADMAP.md decisions log
- Prune "Recent Decisions" older than 2 weeks
- Update "Last updated" timestamp when writing
