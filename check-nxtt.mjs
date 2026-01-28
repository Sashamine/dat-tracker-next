// Check all CryptoAssetNumberOfUnits entries
const response = await fetch('https://data.sec.gov/api/xbrl/companyfacts/CIK0001784970.json', {
  headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
});
const d = await response.json();

console.log('CryptoAssetNumberOfUnits - ALL ENTRIES:');
console.log('');

// Check 'pure' units
const pureUnits = d.facts?.['us-gaap']?.CryptoAssetNumberOfUnits?.units?.pure || [];
console.log('PURE units:');
pureUnits.sort((a,b) => b.end.localeCompare(a.end)).forEach(e => {
  console.log(`  ${e.end} | ${e.form.padEnd(6)} | ${e.val.toLocaleString()} | filed ${e.filed}`);
});

// Check 'bitcoin' units  
const btcUnits = d.facts?.['us-gaap']?.CryptoAssetNumberOfUnits?.units?.bitcoin || [];
console.log('\nBITCOIN units:');
btcUnits.sort((a,b) => b.end.localeCompare(a.end)).forEach(e => {
  console.log(`  ${e.end} | ${e.form.padEnd(6)} | ${e.val.toLocaleString()} | filed ${e.filed}`);
});

// Check fair value history
const fvUnits = d.facts?.['us-gaap']?.CryptoAssetFairValue?.units?.USD || 
                d.facts?.['us-gaap']?.CryptoAssetFairValueCurrent?.units?.USD || [];
console.log('\nCRYPTO FAIR VALUE (USD) history:');
fvUnits.sort((a,b) => b.end.localeCompare(a.end)).slice(0,10).forEach(e => {
  console.log(`  ${e.end} | ${e.form.padEnd(6)} | $${(e.val/1e6).toFixed(2)}M | filed ${e.filed}`);
});

// Calculate implied BTC from fair value
console.log('\n' + '='.repeat(60));
console.log('IMPLIED BTC CALCULATION:');
const latestFV = fvUnits.sort((a,b) => b.end.localeCompare(a.end))[0];
if (latestFV) {
  // BTC price on 2025-09-30 was approximately $63,000-$65,000
  const btcPrices = [60000, 63000, 65000, 97000];
  btcPrices.forEach(price => {
    const implied = latestFV.val / price;
    console.log(`  At $${price.toLocaleString()}/BTC: ${implied.toFixed(0)} BTC`);
  });
}
