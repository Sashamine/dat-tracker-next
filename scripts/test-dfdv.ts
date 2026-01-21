/**
 * Test script for DFDV comparison
 */
import 'dotenv/config';
import { defidevcorpFetcher } from '../src/lib/fetchers/dashboards/defidevcorp';
import { allCompanies } from '../src/lib/data/companies';

async function main() {
  // Test defidevcorp fetcher
  console.log('Testing defidevcorp fetcher...');
  const results = await defidevcorpFetcher.fetch(['DFDV']);

  console.log(`Got ${results.length} results from defidevcorp`);
  for (const r of results) {
    console.log(`  ${r.field}: ${r.value.toLocaleString()} (${r.source.date})`);
  }

  // Compare with our value
  const dfdv = allCompanies.find(c => c.ticker === 'DFDV');
  if (dfdv && results.length > 0) {
    const holdingsResult = results.find(r => r.field === 'holdings');
    if (holdingsResult) {
      const diff = Math.abs(holdingsResult.value - dfdv.holdings) / dfdv.holdings * 100;
      console.log(`\nComparison:`);
      console.log(`  Our holdings: ${dfdv.holdings.toLocaleString()}`);
      console.log(`  Dashboard:    ${holdingsResult.value.toLocaleString()}`);
      console.log(`  Difference:   ${diff.toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
