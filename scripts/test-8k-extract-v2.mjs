/**
 * Test 8-K extraction v2 - fixed patterns
 * 
 * Table structure in MSTR 8-Ks:
 * Headers: "Aggregate BTC Holdings" | "Aggregate Purchase Price (in billions)" | "Average Purchase Price"
 * Row: [period acquired] [period cost] [period avg] [AGGREGATE holdings] [AGGREGATE cost $B] [AGGREGATE avg]
 * 
 * We want the SECOND set of numbers (aggregates)
 */
const R2_BASE = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const PREFIXES = ['new-uploads', 'batch1', 'batch2', 'batch3', 'batch4', 'batch5', 'batch6'];

async function fetch8K(accession) {
  for (const prefix of PREFIXES) {
    const url = `${R2_BASE}/${prefix}/mstr/${accession}.txt`;
    const res = await fetch(url);
    if (res.ok) return { content: await res.text(), prefix };
  }
  return null;
}

function extract(content) {
  const clean = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ');
  
  const results = {};
  
  // Find the last "Aggregate BTC Holdings" (the header row) and get numbers after it
  const lastIdx = clean.lastIndexOf('Aggregate BTC Holdings');
  if (lastIdx === -1) {
    results.error = 'No "Aggregate BTC Holdings" found';
    return results;
  }
  
  // Get 300 chars after the header
  const section = clean.slice(lastIdx, lastIdx + 400);
  
  // The pattern after headers is: [period#] $ [period$] $ [periodAvg] [AGG holdings] $ [AGG cost] $ [AGG avg]
  // We need to find all numbers and pick the right ones
  
  // Holdings: Large number (6+ digits, like 712,647)
  const holdingsMatch = section.match(/(\d{3},\d{3})/g);
  if (holdingsMatch && holdingsMatch.length > 0) {
    // The aggregate holdings is the largest number (or the one > 100,000)
    for (const h of holdingsMatch) {
      const val = parseInt(h.replace(/,/g, ''), 10);
      if (val > 100000) {
        results.holdings = val;
        results.holdingsRaw = h;
        break;
      }
    }
  }
  
  // Cost in billions: Number like 54.19 (2 decimal places, value 40-60 range for MSTR)
  const costMatch = section.match(/\$\s*(\d{2}\.\d{2})/g);
  if (costMatch) {
    // Find the one that looks like total cost (40-70 range typically)
    for (const c of costMatch) {
      const val = parseFloat(c.replace('$', '').trim());
      if (val > 40 && val < 100) {
        results.totalCostBillions = val;
        results.totalCost = Math.round(val * 1_000_000_000);
        break;
      }
    }
  }
  
  // Avg price: Number like 76,037 (5 digits with comma, in $70k-$90k range)
  const avgMatch = section.match(/\$\s*(\d{2},\d{3})/g);
  if (avgMatch) {
    for (const a of avgMatch) {
      const val = parseInt(a.replace(/[$,\s]/g, ''), 10);
      if (val > 50000 && val < 150000) {
        results.avgCost = val;
        results.avgCostRaw = a;
        break;
      }
    }
  }
  
  results._section = section.slice(0, 300);
  return results;
}

async function run() {
  const testFilings = [
    { accession: '0001193125-26-021726', date: '2026-01-26', expected: { holdings: 712647, cost: 54.19, avg: 76037 } },
    { accession: '0001193125-26-001550', date: '2026-01-05', expected: { holdings: 672500, cost: 50.44, avg: 74997 } },
    { accession: '0001050446-26-000012', date: '2026-02-05', expected: { holdings: 713502 } },
  ];
  
  for (const filing of testFilings) {
    console.log('\n' + '='.repeat(70));
    console.log(`8-K: ${filing.accession} (${filing.date})`);
    console.log('Expected:', JSON.stringify(filing.expected));
    console.log('='.repeat(70));
    
    const result = await fetch8K(filing.accession);
    if (!result) {
      console.log('Not found in R2');
      continue;
    }
    
    console.log(`Found in: ${result.prefix} (${result.content.length.toLocaleString()} chars)`);
    
    const extracted = extract(result.content);
    
    console.log('\nExtracted:');
    console.log(`  Holdings: ${extracted.holdings?.toLocaleString() || 'NOT FOUND'} BTC`);
    console.log(`  Total Cost: $${extracted.totalCostBillions}B`);
    console.log(`  Avg Cost: $${extracted.avgCost?.toLocaleString()}`);
    
    // Verify
    if (filing.expected.holdings && extracted.holdings === filing.expected.holdings) {
      console.log('  ✓ Holdings MATCH');
    } else if (filing.expected.holdings) {
      console.log(`  ✗ Holdings mismatch: expected ${filing.expected.holdings}`);
    }
  }
}

run().catch(console.error);
