/**
 * Test 8-K extraction with proper patterns
 */
const R2_BASE = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const PREFIXES = ['batch3', 'batch2', 'batch1', 'new-uploads', 'batch4', 'batch5', 'batch6'];

async function fetch8K(accession) {
  for (const prefix of PREFIXES) {
    const url = `${R2_BASE}/${prefix}/mstr/${accession}.txt`;
    const res = await fetch(url);
    if (res.ok) {
      console.log(`Found in: ${prefix}`);
      return await res.text();
    }
  }
  return null;
}

function extract(content) {
  // Clean HTML and normalize whitespace
  const clean = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ');
  
  const results = {};
  
  // Find "As of [date]" section which has the aggregate numbers
  // The table structure shows values after column headers
  
  // Strategy 1: Look for the specific pattern in MSTR 8-Ks
  // "Aggregate BTC Holdings" ... number ... "Aggregate Purchase Price (in billions)" ... $XX.XX ... "Average Purchase Price" ... $XX,XXX
  
  // Holdings - find number after "Aggregate BTC Holdings" header
  const holdingsPattern = /Aggregate BTC Holdings[\s\S]{1,200}?(\d{3},\d{3})/;
  const holdingsMatch = clean.match(holdingsPattern);
  if (holdingsMatch) {
    results.holdings = parseInt(holdingsMatch[1].replace(/,/g, ''), 10);
    results.holdingsRaw = holdingsMatch[1];
  }
  
  // Total cost in billions - look for pattern like "$ 50.44" after "(in billions)"
  const costPattern = /Aggregate Purchase Price \(in billions\)[\s\S]{1,100}?\$\s*(\d+\.\d+)/;
  const costMatch = clean.match(costPattern);
  if (costMatch) {
    results.totalCostBillions = parseFloat(costMatch[1]);
    results.totalCost = Math.round(results.totalCostBillions * 1_000_000_000);
  }
  
  // Average cost - the second "Average Purchase Price" followed by $XX,XXX
  // First one is for the period, second is aggregate
  const avgPattern = /Average Purchase Price[\s\S]{1,50}?\$\s*([\d,]+)/g;
  const avgMatches = [...clean.matchAll(avgPattern)];
  
  // We want the aggregate (appears after "Aggregate BTC Holdings" row)
  // Usually there are 2 matches - period avg and aggregate avg
  if (avgMatches.length >= 2) {
    results.avgCost = parseInt(avgMatches[1][1].replace(/,/g, ''), 10);
    results.avgCostRaw = avgMatches[1][1];
  }
  
  // Debug: show the section
  const btcIdx = clean.indexOf('Aggregate BTC Holdings');
  if (btcIdx > 0) {
    results._debug = clean.slice(btcIdx, btcIdx + 300);
  }
  
  return results;
}

async function run() {
  // Test multiple 8-Ks
  const testFilings = [
    { accession: '0001193125-26-001550', date: '2026-01-05' },
    { accession: '0001193125-26-021726', date: '2026-01-26' },
    { accession: '0001193125-26-033573', date: '2026-02-02' },
  ];
  
  for (const filing of testFilings) {
    console.log('\n' + '='.repeat(60));
    console.log(`8-K: ${filing.accession} (${filing.date})`);
    console.log('='.repeat(60));
    
    const content = await fetch8K(filing.accession);
    if (!content) {
      console.log('Not found');
      continue;
    }
    
    console.log(`Content: ${content.length.toLocaleString()} chars`);
    
    const results = extract(content);
    
    console.log('\nExtracted:');
    if (results.holdings) {
      console.log(`  ✓ Holdings: ${results.holdings.toLocaleString()} BTC (raw: "${results.holdingsRaw}")`);
    } else {
      console.log('  ✗ Holdings: not found');
    }
    
    if (results.totalCost) {
      console.log(`  ✓ Total Cost: $${results.totalCostBillions}B ($${results.totalCost.toLocaleString()})`);
    } else {
      console.log('  ✗ Total Cost: not found');
    }
    
    if (results.avgCost) {
      console.log(`  ✓ Avg Cost: $${results.avgCost.toLocaleString()} (raw: "${results.avgCostRaw}")`);
    } else {
      console.log('  ✗ Avg Cost: not found');
    }
    
    if (results._debug && (!results.holdings || !results.totalCost)) {
      console.log('\nDebug section:');
      console.log(results._debug);
    }
  }
}

run().catch(console.error);
