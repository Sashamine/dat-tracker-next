# DAT Tracker - Claude Context

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
Enterprise Value = Market Cap + Total Debt + Preferred Equity - Cash
Crypto NAV = Holdings × Crypto Price (crypto only, not other assets)
mNAV = Enterprise Value / Crypto NAV
```

`sharesForMnav` is ONLY for market cap. Balance sheet items (debt, cash, preferred) are separate inputs.

## Future Work / TODO

### High Priority
- [ ] **Auto-track dilution from 8-Ks**: Parse SEC 8-K filings for share issuance events (ATM, PIPE, converts). Auto-update `sharesForMnav` when dilution detected, or flag for manual review. This would make market caps always accurate without manual overrides.

### Medium Priority
- [ ] Scrape official IR dashboards (MSTR, SBET, Metaplanet) for market cap verification
- [ ] Add discrepancy monitoring: cron job comparing our market caps vs Yahoo Finance, flag >10% differences
