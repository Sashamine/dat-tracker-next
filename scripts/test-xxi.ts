/**
 * Test script for XXI comparison
 */
import 'dotenv/config';
import { xxiMempoolFetcher } from '../src/lib/fetchers/dashboards/xxi-mempool';
import { allCompanies } from '../src/lib/data/companies';

async function main() {
  // Test XXI fetcher
  console.log('Testing XXI mempool fetcher...');
  const results = await xxiMempoolFetcher.fetch(['XXI']);

  console.log(`Got ${results.length} results from XXI mempool`);
  for (const r of results) {
    console.log(`  ${r.field}: ${r.value.toLocaleString()} BTC (${r.source.date})`);
  }

  // Compare with our value
  const xxi = allCompanies.find(c => c.ticker === 'XXI');
  if (xxi && results.length > 0) {
    const holdingsResult = results.find(r => r.field === 'holdings');
    if (holdingsResult) {
      const diff = Math.abs(holdingsResult.value - xxi.holdings) / xxi.holdings * 100;
      console.log(`\nComparison:`);
      console.log(`  Our holdings: ${xxi.holdings.toLocaleString()} BTC`);
      console.log(`  On-chain:     ${holdingsResult.value.toLocaleString()} BTC`);
      console.log(`  Difference:   ${diff.toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
