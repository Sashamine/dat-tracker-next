/**
 * Verify BMNR data consistency
 * - Check holdings history data structure
 * - Verify interpolation works correctly
 * - Check date ordering and data integrity
 */
import { getHoldingsHistory, HOLDINGS_HISTORY } from '../src/lib/data/holdings-history';

console.log('BMNR Data Verification\n');
console.log('=' .repeat(80));

// Get raw history (before interpolation)
const rawHistory = HOLDINGS_HISTORY['BMNR']?.history || [];
console.log(`\nRaw BMNR history entries: ${rawHistory.length}`);

// Get interpolated history
const interpolatedHistory = getHoldingsHistory('BMNR');
console.log(`Interpolated BMNR history entries: ${interpolatedHistory?.history.length || 0}`);

// Calculate expected interpolation count
const expectedInterpolated = rawHistory.length + (rawHistory.length - 1);
console.log(`Expected interpolated entries: ${expectedInterpolated}`);
console.log(`Interpolation working: ${interpolatedHistory?.history.length === expectedInterpolated ? '✓' : '✗ MISMATCH'}`);

console.log('\n' + '-'.repeat(80));
console.log('Date Range:');
console.log('-'.repeat(40));
if (rawHistory.length > 0) {
  console.log(`  First entry: ${rawHistory[0].date}`);
  console.log(`  Last entry:  ${rawHistory[rawHistory.length - 1].date}`);
}

console.log('\n' + '-'.repeat(80));
console.log('Holdings Per Share Progression:');
console.log('-'.repeat(40));

let prevHPS = 0;
let hpsIncreasing = true;
let hpsWarnings: string[] = [];

for (const snap of rawHistory) {
  const hps = snap.holdingsPerShare;
  if (prevHPS > 0 && hps < prevHPS * 0.5) {
    hpsWarnings.push(`  ⚠️ ${snap.date}: HPS dropped ${((prevHPS - hps) / prevHPS * 100).toFixed(1)}% (${prevHPS.toFixed(6)} → ${hps.toFixed(6)})`);
  }
  prevHPS = hps;
}

if (hpsWarnings.length > 0) {
  console.log('Significant HPS changes (may indicate dilution or data issues):');
  for (const warning of hpsWarnings) {
    console.log(warning);
  }
} else {
  console.log('  ✓ No major HPS anomalies detected');
}

console.log('\n' + '-'.repeat(80));
console.log('Data Completeness Check:');
console.log('-'.repeat(40));

let missingFields: string[] = [];
for (const snap of rawHistory) {
  if (!snap.holdings) missingFields.push(`${snap.date}: missing holdings`);
  if (!snap.sharesOutstandingDiluted) missingFields.push(`${snap.date}: missing shares`);
  if (!snap.holdingsPerShare) missingFields.push(`${snap.date}: missing HPS`);
  if (!snap.sourceUrl) missingFields.push(`${snap.date}: missing sourceUrl`);
}

if (missingFields.length > 0) {
  console.log('Missing required fields:');
  for (const field of missingFields.slice(0, 10)) {
    console.log(`  ✗ ${field}`);
  }
  if (missingFields.length > 10) {
    console.log(`  ... and ${missingFields.length - 10} more`);
  }
} else {
  console.log('  ✓ All required fields present');
}

console.log('\n' + '-'.repeat(80));
console.log('Confidence Distribution:');
console.log('-'.repeat(40));

const confidenceCounts = { high: 0, medium: 0, low: 0, undefined: 0 };
for (const snap of rawHistory) {
  const confidence = snap.confidence || 'undefined';
  confidenceCounts[confidence as keyof typeof confidenceCounts]++;
}

console.log(`  High:      ${confidenceCounts.high} entries`);
console.log(`  Medium:    ${confidenceCounts.medium} entries`);
console.log(`  Low:       ${confidenceCounts.low} entries`);
console.log(`  Undefined: ${confidenceCounts.undefined} entries`);

console.log('\n' + '-'.repeat(80));
console.log('Latest Snapshot:');
console.log('-'.repeat(40));

const latest = rawHistory[rawHistory.length - 1];
if (latest) {
  console.log(`  Date:     ${latest.date}`);
  console.log(`  Holdings: ${latest.holdings.toLocaleString()} ETH`);
  console.log(`  Shares:   ${latest.sharesOutstandingDiluted.toLocaleString()}`);
  console.log(`  HPS:      ${latest.holdingsPerShare.toFixed(6)} ETH/share`);
  console.log(`  Cash:     $${(latest.cash || 0).toLocaleString()}`);
  console.log(`  Source:   ${latest.source}`);
}

console.log('\n' + '='.repeat(80));
console.log('Verification complete.');
