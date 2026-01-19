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
