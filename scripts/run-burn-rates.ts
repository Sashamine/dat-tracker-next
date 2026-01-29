/**
 * Fetch burn rates for top 26 DAT companies
 * Run with: npx tsx scripts/run-burn-rates.ts
 */

import { fetchBurnRates } from '../src/lib/fetchers/sec-xbrl';
import { btcCompanies, ethCompanies, solCompanies, hypeCompanies, bnbCompanies, taoCompanies } from '../src/lib/data/companies';

// Get all companies with SEC CIKs (can fetch XBRL data)
const allCompanies = [
  ...btcCompanies,
  ...ethCompanies,
  ...solCompanies,
  ...hypeCompanies,
  ...bnbCompanies,
  ...taoCompanies,
].filter(c => c.secCik);

// Sort by holdings value (approximate) - take top 26
const top26 = allCompanies
  .slice(0, 26)
  .map(c => c.ticker);

console.log(`\nFetching burn rates for ${top26.length} companies...\n`);
console.log(`Tickers: ${top26.join(', ')}\n`);

async function main() {
  const results = await fetchBurnRates(top26);
  
  console.log('=' .repeat(100));
  console.log('BURN RATE RESULTS');
  console.log('=' .repeat(100));
  console.log('');
  
  // Format results as table
  console.log('Ticker'.padEnd(10) + 'Quarterly Burn'.padEnd(20) + 'Period Type'.padEnd(15) + 'Period End'.padEnd(15) + 'Form'.padEnd(10) + 'Status');
  console.log('-'.repeat(100));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const r of results) {
    if (r.quarterlyBurn !== null) {
      const burnStr = r.quarterlyBurn >= 0 
        ? `$${(r.quarterlyBurn / 1_000_000).toFixed(2)}M burn`
        : `$${(Math.abs(r.quarterlyBurn) / 1_000_000).toFixed(2)}M gen`;
      
      console.log(
        r.ticker.padEnd(10) +
        burnStr.padEnd(20) +
        (r.periodType || '').padEnd(15) +
        (r.periodEnd || '').padEnd(15) +
        (r.form || '').padEnd(10) +
        '✅'
      );
      successCount++;
    } else {
      console.log(
        r.ticker.padEnd(10) +
        'N/A'.padEnd(20) +
        ''.padEnd(15) +
        ''.padEnd(15) +
        ''.padEnd(10) +
        `❌ ${r.error || 'No data'}`
      );
      errorCount++;
    }
  }
  
  console.log('-'.repeat(100));
  console.log(`\nSummary: ${successCount} success, ${errorCount} failed\n`);
}

main().catch(console.error);
