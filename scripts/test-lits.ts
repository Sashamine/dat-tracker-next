/**
 * Test script for LITS comparison
 */
import 'dotenv/config';
import { litestrategyFetcher } from '../src/lib/fetchers/dashboards/litestrategy';
import { allCompanies } from '../src/lib/data/companies';

async function main() {
  // Test litestrategy fetcher
  console.log('Testing Lite Strategy fetcher...');
  const results = await litestrategyFetcher.fetch(['LITS']);

  console.log(`Got ${results.length} results from Lite Strategy`);
  for (const r of results) {
    console.log(`  ${r.field}: ${r.value.toLocaleString()} LTC (${r.source.date})`);
  }

  // Compare with our value
  const lits = allCompanies.find(c => c.ticker === 'LITS');
  if (lits && results.length > 0) {
    const holdingsResult = results.find(r => r.field === 'holdings');
    if (holdingsResult) {
      const diff = Math.abs(holdingsResult.value - lits.holdings) / lits.holdings * 100;
      console.log(`\nComparison:`);
      console.log(`  Our holdings: ${lits.holdings.toLocaleString()} LTC`);
      console.log(`  Dashboard:    ${holdingsResult.value.toLocaleString()} LTC`);
      console.log(`  Difference:   ${diff.toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
