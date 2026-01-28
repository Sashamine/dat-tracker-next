/**
 * Debug strategy.com API responses
 */

async function main() {
  console.log('Fetching mstrKpiData...\n');
  
  const response = await fetch('https://api.strategy.com/btc/mstrKpiData', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    console.log(`HTTP ${response.status}`);
    return;
  }
  
  const data = await response.json();
  
  console.log('Response keys:', Object.keys(data));
  console.log('\nRelevant fields:');
  console.log('  fdShares:', data.fdShares, `(${typeof data.fdShares})`);
  console.log('  marketCap:', data.marketCap, `(${typeof data.marketCap})`);
  console.log('  price:', data.price, `(${typeof data.price})`);
  
  // Test parsing
  function parseNumber(str: string | undefined | null): number | null {
    if (!str) return null;
    const cleaned = str.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  const marketCapMillions = parseNumber(data.marketCap);
  const price = parseNumber(data.price);
  
  console.log('\nParsed values:');
  console.log('  marketCapMillions:', marketCapMillions);
  console.log('  price:', price);
  
  if (marketCapMillions && price && price > 0) {
    const derivedShares = Math.round((marketCapMillions * 1_000_000) / price);
    console.log('\nDerived shares:', derivedShares.toLocaleString());
  }
}

main().catch(console.error);
