// Derive purchase history from holdings-history snapshots
// Uses holdings deltas + historical prices to estimate purchases

import { HOLDINGS_HISTORY } from '../src/lib/data/holdings-history';

// Historical BTC prices (approximate daily averages)
const BTC_PRICES: Record<string, number> = {
  // 2024
  "2024-08-15": 58000,
  "2024-10-31": 72000,
  "2024-12-26": 97000,
  "2024-12-31": 93000,
  // 2025
  "2025-01-06": 99000,
  "2025-01-21": 103000,
  "2025-02-11": 97000,
  "2025-03-25": 87000,
  "2025-03-31": 83000,
  "2025-04-23": 92000,
  "2025-05-20": 105000,
  "2025-06-23": 109000,
  "2025-07-10": 115000,
  "2025-07-29": 118000,
  "2025-08-19": 115000,
  "2025-09-30": 112000,
  "2025-12-09": 99000,
};

interface DerivedPurchase {
  date: string;
  quantity: number;
  pricePerUnit: number;
  totalCost: number;
  source: string;
}

function derivePurchases(ticker: string): DerivedPurchase[] {
  const data = HOLDINGS_HISTORY[ticker];
  if (!data) return [];
  
  const purchases: DerivedPurchase[] = [];
  let prevHoldings = 0;
  
  for (const snapshot of data.history) {
    const delta = snapshot.holdings - prevHoldings;
    if (delta > 0) {
      const price = BTC_PRICES[snapshot.date] || 100000; // Default if missing
      purchases.push({
        date: snapshot.date,
        quantity: delta,
        pricePerUnit: price,
        totalCost: Math.round(delta * price),
        source: snapshot.source || "holdings-history",
      });
    }
    prevHoldings = snapshot.holdings;
  }
  
  return purchases;
}

function calculateStats(purchases: DerivedPurchase[]) {
  const totalQty = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  return {
    totalQty: Math.round(totalQty * 100) / 100,
    totalCost,
    avgCost: totalQty > 0 ? Math.round(totalCost / totalQty) : 0,
  };
}

// Generate for key companies
const companies = ['KULR', 'NAKA', 'XXI'];

console.log('=== Derived Purchase Histories ===\n');

for (const ticker of companies) {
  const purchases = derivePurchases(ticker);
  const stats = calculateStats(purchases);
  
  console.log(`${ticker}:`);
  console.log(`  Purchases: ${purchases.length}`);
  console.log(`  Total: ${stats.totalQty.toLocaleString()} BTC`);
  console.log(`  Cost: $${(stats.totalCost / 1e6).toFixed(1)}M`);
  console.log(`  Avg: $${stats.avgCost.toLocaleString()}`);
  console.log('  Details:');
  purchases.forEach(p => {
    console.log(`    ${p.date}: +${p.quantity.toFixed(2)} @ $${p.pricePerUnit.toLocaleString()} = $${(p.totalCost/1e6).toFixed(2)}M`);
  });
  console.log('');
}

// Output TypeScript code
console.log('\n=== TypeScript for purchases-history.ts ===\n');

for (const ticker of companies) {
  const purchases = derivePurchases(ticker);
  const stats = calculateStats(purchases);
  
  console.log(`// ${ticker} - Derived from holdings-history.ts`);
  console.log(`// Total: ${stats.totalQty.toLocaleString()} BTC, $${(stats.totalCost/1e6).toFixed(1)}M, avg $${stats.avgCost.toLocaleString()}`);
  console.log(`const ${ticker}_PURCHASES: Purchase[] = [`);
  purchases.forEach(p => {
    console.log(`  { date: "${p.date}", quantity: ${p.quantity.toFixed(2)}, pricePerUnit: ${p.pricePerUnit}, totalCost: ${p.totalCost}, source: "${p.source}" },`);
  });
  console.log(`];\n`);
}
