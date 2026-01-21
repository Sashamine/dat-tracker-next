/**
 * Test script for SEC 8-K Auto-Update Adapter
 *
 * Usage:
 *   npx tsx scripts/test-sec-auto-update.ts [ticker] [--dry-run]
 *
 * Examples:
 *   npx tsx scripts/test-sec-auto-update.ts MSTR --dry-run
 *   npx tsx scripts/test-sec-auto-update.ts              # Check all tickers, dry run
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { runSecAutoUpdate, checkTickerForSecUpdate } from '../src/lib/sec-auto-update';

async function main() {
  const args = process.argv.slice(2);
  const ticker = args.find(a => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run') || !args.includes('--commit');

  console.log('='.repeat(60));
  console.log('SEC 8-K Auto-Update Test');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will commit changes)'}`);
  console.log(`Target: ${ticker || 'All tickers with CIK mappings'}`);
  console.log('='.repeat(60));
  console.log();

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GROK_API_KEY) {
    console.error('ERROR: No LLM API key found. Set ANTHROPIC_API_KEY or GROK_API_KEY');
    process.exit(1);
  }

  if (ticker) {
    // Check single ticker
    console.log(`Checking ${ticker} for recent 8-K filings...`);
    const result = await checkTickerForSecUpdate(ticker, {
      dryRun,
      sinceDays: 30,
      minConfidence: 0.6,
    });

    console.log('\nResult:');
    console.log(JSON.stringify(result, null, 2));

    if (result.newHoldings !== undefined && result.previousHoldings !== undefined) {
      const change = result.newHoldings - result.previousHoldings;
      const changePct = (change / result.previousHoldings * 100).toFixed(2);
      console.log(`\nChange: ${change > 0 ? '+' : ''}${change.toLocaleString()} (${changePct}%)`);
    }

  } else {
    // Check all tickers (limited to first 5 for testing)
    const testTickers = ['MSTR', 'MARA', 'RIOT', 'CLSK', 'SBET'];
    console.log(`Testing with ${testTickers.length} tickers: ${testTickers.join(', ')}`);
    console.log();

    const results = await runSecAutoUpdate({
      tickers: testTickers,
      dryRun,
      sinceDays: 30,
      minConfidence: 0.6,
    });

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));

    for (const result of results) {
      const status = result.error
        ? `ERROR: ${result.error}`
        : result.newHoldings !== undefined && result.newHoldings !== result.previousHoldings
          ? `UPDATED: ${result.previousHoldings?.toLocaleString()} → ${result.newHoldings.toLocaleString()}`
          : result.reasoning || 'No changes';

      console.log(`${result.ticker}: ${status}`);
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
