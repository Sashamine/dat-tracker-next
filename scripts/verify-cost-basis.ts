// Quick verification of cost basis calculations
import { PURCHASES, getCostBasis } from '../src/lib/data/purchases-history';

console.log('=== Cost Basis Verification ===\n');

for (const [ticker, data] of Object.entries(PURCHASES)) {
  console.log(`${ticker}:`);
  console.log(`  Total Quantity: ${data.totalQuantity.toLocaleString()} ${data.asset}`);
  console.log(`  Total Cost: $${(data.totalCost / 1e9).toFixed(3)}B`);
  console.log(`  Cost Basis Avg: $${data.costBasisAvg.toLocaleString()}`);
  console.log('');
}

// Expected values
console.log('=== Expected Values ===');
console.log('MSTR: $76,037 (official)');
console.log('3350.T: $107,607 (metaplanet.jp)');
