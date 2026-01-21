/**
 * Test script for Metaplanet comparison
 */
import 'dotenv/config';
import { metaplanetFetcher } from '../src/lib/fetchers/dashboards/metaplanet';
import { allCompanies } from '../src/lib/data/companies';

async function main() {
  // Test metaplanet fetcher
  console.log('Testing Metaplanet fetcher...');
  const results = await metaplanetFetcher.fetch(['3350.T']);

  console.log(`Got ${results.length} results from Metaplanet`);
  for (const r of results) {
    console.log(`  ${r.field}: ${r.value.toLocaleString()} BTC (${r.source.date})`);
  }

  // Compare with our value
  const metaplanet = allCompanies.find(c => c.ticker === '3350.T');
  if (metaplanet && results.length > 0) {
    const holdingsResult = results.find(r => r.field === 'holdings');
    if (holdingsResult) {
      const diff = Math.abs(holdingsResult.value - metaplanet.holdings) / metaplanet.holdings * 100;
      console.log(`\nComparison:`);
      console.log(`  Our holdings: ${metaplanet.holdings.toLocaleString()} BTC`);
      console.log(`  Dashboard:    ${holdingsResult.value.toLocaleString()} BTC`);
      console.log(`  Difference:   ${diff.toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
