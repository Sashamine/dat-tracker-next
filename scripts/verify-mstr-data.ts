/**
 * Verify MSTR data consistency between earnings and chart sources
 */
import { MSTR_VERIFIED_FINANCIALS } from '../src/lib/data/mstr-verified-financials';
import { getHoldingsHistory } from '../src/lib/data/holdings-history';

const QUARTERS = [
  { year: 2024, quarter: 4, endDate: '2024-12-31' },
  { year: 2025, quarter: 1, endDate: '2025-03-31' },
  { year: 2025, quarter: 2, endDate: '2025-06-30' },
  { year: 2025, quarter: 3, endDate: '2025-09-30' },
  { year: 2025, quarter: 4, endDate: '2025-12-31' },
];

console.log('MSTR Data Verification - Quarterly Consistency\n');
console.log('=' .repeat(80));

for (const q of QUARTERS) {
  // Earnings source (getMSTRQuarterData logic)
  const earningsSnapshot = MSTR_VERIFIED_FINANCIALS
    .filter(s => s.date <= q.endDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  
  // Chart source (getHoldingsHistory)
  const chartHistory = getHoldingsHistory('MSTR');
  const chartSnapshot = chartHistory?.history
    .filter(s => s.date <= q.endDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  
  console.log(`\nQ${q.quarter} ${q.year} (ending ${q.endDate}):`);
  console.log('-'.repeat(40));
  
  if (earningsSnapshot && chartSnapshot) {
    const holdingsMatch = earningsSnapshot.holdings.value === chartSnapshot.holdings;
    const sharesMatch = earningsSnapshot.shares.total === chartSnapshot.sharesOutstanding;
    const hpsEarnings = earningsSnapshot.holdingsPerShare || 0;
    const hpsChart = chartSnapshot.holdingsPerShare || 0;
    const hpsDiff = Math.abs(hpsEarnings - hpsChart);
    
    console.log(`  Earnings date: ${earningsSnapshot.date}`);
    console.log(`  Chart date:    ${chartSnapshot.date}`);
    console.log(`  Holdings:      ${earningsSnapshot.holdings.value.toLocaleString()} / ${chartSnapshot.holdings.toLocaleString()} ${holdingsMatch ? '✓' : '✗ MISMATCH'}`);
    console.log(`  Shares:        ${earningsSnapshot.shares.total.toLocaleString()} / ${chartSnapshot.sharesOutstanding?.toLocaleString() || 'N/A'} ${sharesMatch ? '✓' : '✗ MISMATCH'}`);
    console.log(`  HPS:           ${hpsEarnings.toFixed(6)} / ${hpsChart.toFixed(6)} ${hpsDiff < 0.000001 ? '✓' : '✗ MISMATCH'}`);
  } else {
    console.log(`  ✗ Missing data: earnings=${!!earningsSnapshot} chart=${!!chartSnapshot}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`Total verified financials: ${MSTR_VERIFIED_FINANCIALS.length}`);
console.log(`Chart history points:      ${getHoldingsHistory('MSTR')?.history.length || 0}`);
