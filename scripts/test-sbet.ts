/**
 * Test script for SBET comparison
 */
import 'dotenv/config';
import { sharplinkFetcher } from '../src/lib/fetchers/dashboards/sharplink';
import { allCompanies } from '../src/lib/data/companies';

async function main() {
  // Test sharplink fetcher
  console.log('Testing sharplink fetcher...');
  const results = await sharplinkFetcher.fetch(['SBET']);

  console.log(`Got ${results.length} results from sharplink`);
  for (const r of results) {
    console.log(`  ${r.field}: ${r.value} (${r.source.date})`);
  }

  // Compare with our value
  const sbet = allCompanies.find(c => c.ticker === 'SBET');
  if (sbet && results.length > 0) {
    const holdingsResult = results.find(r => r.field === 'holdings');
    if (holdingsResult) {
      const diff = Math.abs(holdingsResult.value - sbet.holdings) / sbet.holdings * 100;
      console.log(`\nComparison:`);
      console.log(`  Our holdings: ${sbet.holdings.toLocaleString()}`);
      console.log(`  Dashboard:    ${holdingsResult.value.toLocaleString()}`);
      console.log(`  Difference:   ${diff.toFixed(2)}%`);
    }
  }
}

main().catch(console.error);
