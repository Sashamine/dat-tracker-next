// Quick verification script to check if computed MSTR earnings data matches old hardcoded values
const { getQuarterEndSnapshot } = require('./src/lib/data/mstr-capital-structure.ts');

// Old hardcoded values to verify against
const testCases = [
  { year: 2025, quarter: 3, expectedHoldings: 640031, expectedShares: 267_468_000, expectedPerShare: 0.002393 },
  { year: 2025, quarter: 2, expectedHoldings: 597325, expectedShares: 261_318_000, expectedPerShare: 0.002286 },
  { year: 2024, quarter: 4, expectedHoldings: 446400, expectedShares: 226_138_000, expectedPerShare: 0.001974 },
  { year: 2023, quarter: 4, expectedHoldings: 189150, expectedShares: 149_040_000, expectedPerShare: 0.001269 },
  { year: 2022, quarter: 4, expectedHoldings: 132500, expectedShares: 95_850_000, expectedPerShare: 0.001382 },
  { year: 2021, quarter: 4, expectedHoldings: 124391, expectedShares: 93_220_000, expectedPerShare: 0.001334 },
  { year: 2020, quarter: 4, expectedHoldings: 70470, expectedShares: 76_230_000, expectedPerShare: 0.000924 },
  { year: 2020, quarter: 3, expectedHoldings: 38250, expectedShares: 72_530_000, expectedPerShare: 0.000527 },
];

function getMSTRQuarterData(fiscalYear, fiscalQuarter) {
  const quarterEndMonth = fiscalQuarter * 3;
  const periodEnd = `${fiscalYear}-${String(quarterEndMonth).padStart(2, '0')}-${
    quarterEndMonth === 3 ? '31' : quarterEndMonth === 6 ? '30' : quarterEndMonth === 9 ? '30' : '31'
  }`;

  const snapshot = getQuarterEndSnapshot(periodEnd);
  if (!snapshot) {
    return {};
  }

  const holdingsAtQuarterEnd = snapshot.btcHoldings;
  const sharesAtQuarterEnd = snapshot.commonSharesOutstanding;
  const holdingsPerShare = holdingsAtQuarterEnd / sharesAtQuarterEnd;

  return {
    holdingsAtQuarterEnd,
    sharesAtQuarterEnd,
    holdingsPerShare,
  };
}

console.log('Verifying MSTR earnings consolidation...\n');

let allPassed = true;
for (const test of testCases) {
  const computed = getMSTRQuarterData(test.year, test.quarter);

  const holdingsMatch = Math.abs(computed.holdingsAtQuarterEnd - test.expectedHoldings) < 1;
  const sharesMatch = Math.abs(computed.sharesAtQuarterEnd - test.expectedShares) < 1000; // Allow 1K variance
  const perShareMatch = Math.abs(computed.holdingsPerShare - test.expectedPerShare) < 0.000001;

  const passed = holdingsMatch && sharesMatch && perShareMatch;
  allPassed = allPassed && passed;

  console.log(`Q${test.quarter} ${test.year}: ${passed ? '✓ PASS' : '✗ FAIL'}`);
  if (!passed) {
    console.log(`  Expected: ${test.expectedHoldings} BTC, ${test.expectedShares} shares, ${test.expectedPerShare} per share`);
    console.log(`  Computed: ${computed.holdingsAtQuarterEnd} BTC, ${computed.sharesAtQuarterEnd} shares, ${computed.holdingsPerShare} per share`);
  }
}

console.log(`\n${allPassed ? 'All tests passed! ✓' : 'Some tests failed! ✗'}`);
process.exit(allPassed ? 0 : 1);
