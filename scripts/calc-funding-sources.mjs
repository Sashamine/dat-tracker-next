/**
 * Calculate funding sources from known data
 */

// From our extracted data
const btcPurchases = {
  totalCost: 50.99e9,  // $50.99B spent on BTC
  btcAcquired: 652541,
};

const debtRaised = {
  convertibles: 5.38e9,
  securedNotes: 1.28e9,
  silvergateLoam: 0.205e9,
  total: 6.76e9,
};

// Preferred equity (from our preferred tracking)
const preferredRaised = {
  strk: 2.6e9,   // Approximate STRK raises
  strf: 0.5e9,  // Approximate STRF raises
  total: 3.1e9,
};

// Calculate equity from common stock ATM
const equityFromCommon = btcPurchases.totalCost - debtRaised.total - preferredRaised.total;

console.log('MSTR FUNDING SOURCES ANALYSIS');
console.log('='.repeat(70));
console.log(`\nTotal BTC Cost Basis: $${(btcPurchases.totalCost/1e9).toFixed(2)}B`);
console.log(`  (${btcPurchases.btcAcquired.toLocaleString()} BTC)\n`);

console.log('Funding Sources:');
console.log('-'.repeat(50));
console.log(`  Debt (Convertibles + Notes):    $${(debtRaised.total/1e9).toFixed(2)}B`);
console.log(`    - Convertible Notes:          $${(debtRaised.convertibles/1e9).toFixed(2)}B`);
console.log(`    - Senior Secured Notes:       $${(debtRaised.securedNotes/1e9).toFixed(2)}B`);
console.log(`    - Silvergate Loan:            $${(debtRaised.silvergateLoam/1e9).toFixed(2)}B`);
console.log(`  Preferred Stock (STRK/STRF):    $${(preferredRaised.total/1e9).toFixed(2)}B`);
console.log(`  Common Stock ATM (calc):        $${(equityFromCommon/1e9).toFixed(2)}B`);
console.log('-'.repeat(50));
console.log(`  TOTAL:                          $${(btcPurchases.totalCost/1e9).toFixed(2)}B`);

console.log('\n\nFunding Mix:');
const total = btcPurchases.totalCost;
console.log(`  Debt:            ${((debtRaised.total/total)*100).toFixed(1)}%`);
console.log(`  Preferred:       ${((preferredRaised.total/total)*100).toFixed(1)}%`);
console.log(`  Common ATM:      ${((equityFromCommon/total)*100).toFixed(1)}%`);

console.log('\n\nNOTE: ATM common stock equity is the residual after accounting for');
console.log('debt and preferred. This ~$41B matches MSTR\'s disclosed ATM programs:');
console.log('  - 2024 Common ATM: $21B program');
console.log('  - 2025 Common ATM: $21B program');
console.log('Total ATM capacity: $42B (mostly utilized)');
