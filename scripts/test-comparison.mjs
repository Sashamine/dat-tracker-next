/**
 * Test script for the comparison engine
 * Runs comparison for MSTR (dry run - doesn't write to DB)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Dynamic import to allow top-level await
async function main() {
  // We need to use tsx or ts-node to run TypeScript
  // For now, let's just test the fetchers directly

  const { mnavFetcher } = await import('../src/lib/fetchers/mnav.js');
  const { strategyFetcher } = await import('../src/lib/fetchers/dashboards/strategy.js');

  console.log('Testing fetchers for MSTR...\n');

  // Test mNAV fetcher
  console.log('=== mNAV.com ===');
  const mnavResults = await mnavFetcher.fetch(['MSTR']);
  for (const r of mnavResults) {
    console.log(`  ${r.field}: ${r.value}`);
  }

  console.log('\n=== strategy.com ===');
  const strategyResults = await strategyFetcher.fetch(['MSTR']);
  for (const r of strategyResults) {
    console.log(`  ${r.field}: ${r.value}`);
  }

  // Compare with our values
  console.log('\n=== Our values (from companies.ts) ===');
  const { allCompanies } = await import('../src/lib/data/companies.js');
  const mstr = allCompanies.find(c => c.ticker === 'MSTR');
  if (mstr) {
    console.log(`  holdings: ${mstr.holdings}`);
    console.log(`  totalDebt: ${mstr.totalDebt}`);
    console.log(`  cashReserves: ${mstr.cashReserves}`);
    console.log(`  preferredEquity: ${mstr.preferredEquity}`);
    console.log(`  sharesForMnav: ${mstr.sharesForMnav}`);
  }

  // Show discrepancies
  console.log('\n=== Discrepancies ===');
  const allResults = [...mnavResults, ...strategyResults];

  const fields = ['holdings', 'debt', 'cash', 'preferred_equity', 'shares_outstanding'];
  const ourFieldMap = {
    holdings: mstr?.holdings,
    debt: mstr?.totalDebt,
    cash: mstr?.cashReserves,
    preferred_equity: mstr?.preferredEquity,
    shares_outstanding: mstr?.sharesForMnav,
  };

  for (const field of fields) {
    const ourValue = ourFieldMap[field];
    const sourceResults = allResults.filter(r => r.field === field);

    if (ourValue === undefined || sourceResults.length === 0) continue;

    for (const sr of sourceResults) {
      const deviation = ourValue === 0
        ? (sr.value === 0 ? 0 : 100)
        : Math.abs((sr.value - ourValue) / ourValue * 100);

      if (deviation > 0.01) {
        console.log(`  ${field}:`);
        console.log(`    Ours: ${ourValue.toLocaleString()}`);
        console.log(`    ${sr.source.name}: ${sr.value.toLocaleString()}`);
        console.log(`    Deviation: ${deviation.toFixed(2)}%`);
      }
    }
  }
}

main().catch(console.error);
