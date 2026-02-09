/**
 * Analyze the gap between extracted data and known totals
 */

async function run() {
  console.log('MSTR FUNDING GAP ANALYSIS');
  console.log('='.repeat(70));
  
  // What we extracted
  const extracted = {
    btcPurchases: { btc: 390960, cost: 25.85e9 },  // From our extraction
    debtRaised: 6.76e9,  // From our extraction
  };
  
  // Known current state (approximate as of late 2024/early 2025)
  const known = {
    btcHoldings: 450000,  // ~450K BTC
    totalCostBasis: 28e9, // ~$28B cost basis
  };
  
  console.log('\n1. BTC PURCHASES GAP:');
  console.log('-'.repeat(70));
  console.log(`   Extracted from 8-Ks:     ${extracted.btcPurchases.btc.toLocaleString()} BTC ($${(extracted.btcPurchases.cost/1e9).toFixed(2)}B)`);
  console.log(`   Known holdings (approx): ${known.btcHoldings.toLocaleString()} BTC ($${(known.totalCostBasis/1e9).toFixed(2)}B)`);
  console.log(`   Gap:                     ${(known.btcHoldings - extracted.btcPurchases.btc).toLocaleString()} BTC ($${((known.totalCostBasis - extracted.btcPurchases.cost)/1e9).toFixed(2)}B)`);
  
  console.log('\n   LIKELY CAUSES:');
  console.log('   - 2025 purchases not included (our extraction ended 2024-12-31)');
  console.log('   - Some 8-Ks may have different wording we missed');
  
  console.log('\n2. FUNDING SOURCE GAP:');
  console.log('-'.repeat(70));
  console.log(`   Debt raised (extracted): $${(extracted.debtRaised/1e9).toFixed(2)}B`);
  console.log(`   BTC cost basis:          $${(known.totalCostBasis/1e9).toFixed(2)}B`);
  console.log(`   Gap:                     $${((known.totalCostBasis - extracted.debtRaised)/1e9).toFixed(2)}B`);
  
  console.log('\n   FUNDING SOURCES NOT TRACKED:');
  console.log('   ┌─────────────────────────────────────────────────────────────┐');
  console.log('   │ ATM EQUITY SALES - This is the BIG one!                     │');
  console.log('   │ MSTR has raised $10B+ through at-the-market stock sales     │');
  console.log('   │ These are disclosed in 424B5 prospectus supplements, not 8-K│');
  console.log('   └─────────────────────────────────────────────────────────────┘');
  console.log('   - Preferred stock raises (tracked separately in preferred-equity.ts)');
  console.log('   - Operating cash flow from software business');
  console.log('   - 2025 debt issuances');
  
  console.log('\n3. FILING TYPES BY FUNDING SOURCE:');
  console.log('-'.repeat(70));
  console.log('   ┌──────────────────┬─────────────────────────────────────────┐');
  console.log('   │ Funding Source   │ SEC Filing Type                         │');
  console.log('   ├──────────────────┼─────────────────────────────────────────┤');
  console.log('   │ BTC Purchases    │ 8-K (Item 8.01)                    ✓    │');
  console.log('   │ Debt Issuances   │ 8-K (Item 1.01)                    ✓    │');
  console.log('   │ ATM Equity Sales │ 424B5 prospectus supplements       ✗    │');
  console.log('   │ Preferred Stock  │ 8-K + 424B5                        ✓    │');
  console.log('   │ Direct Offerings │ 424B5                              ✗    │');
  console.log('   └──────────────────┴─────────────────────────────────────────┘');
  
  console.log('\n4. RECOMMENDATION:');
  console.log('-'.repeat(70));
  console.log('   To get complete funding picture, need to also extract:');
  console.log('   1. ATM equity sales from 424B5 filings (biggest gap)');
  console.log('   2. 2025 8-Ks for recent purchases and debt');
  console.log('   3. Cross-reference with 10-Q/10-K for verified totals');
}

run();
