/**
 * Extract MARA 8-K Filing List
 * 
 * Gets all 8-K filings for MARA to identify BTC purchases, ATM sales, debt events
 */

const CIK = '0001507605';

async function fetchFilings() {
  console.log('Fetching MARA filing list from SEC...\n');
  
  const response = await fetch(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
    headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
  });
  
  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status}`);
  }
  
  return response.json();
}

function extract8Ks(data) {
  const filings = data.filings.recent;
  const eightKs = [];
  
  for (let i = 0; i < filings.form.length; i++) {
    if (filings.form[i] === '8-K') {
      eightKs.push({
        date: filings.filingDate[i],
        accession: filings.accessionNumber[i],
        primaryDoc: filings.primaryDocument[i],
        description: filings.primaryDocDescription[i] || '',
        items: filings.items?.[i] || '',
      });
    }
  }
  
  return eightKs;
}

function categorize8K(filing) {
  const desc = (filing.description + ' ' + filing.items).toLowerCase();
  
  if (desc.includes('bitcoin') || desc.includes('btc') || desc.includes('crypto')) {
    return 'BTC';
  }
  if (desc.includes('atm') || desc.includes('at-the-market') || desc.includes('equity distribution')) {
    return 'ATM';
  }
  if (desc.includes('convert') || desc.includes('note') || desc.includes('debt') || desc.includes('offering')) {
    return 'DEBT';
  }
  if (desc.includes('director') || desc.includes('officer') || desc.includes('compensation')) {
    return 'CORP';
  }
  if (desc.includes('result') || desc.includes('earning') || desc.includes('financial')) {
    return 'EARNINGS';
  }
  return 'OTHER';
}

// Main
const data = await fetchFilings();
const eightKs = extract8Ks(data);

console.log(`Found ${eightKs.length} 8-K filings for MARA\n`);

// Filter to 2024-2025 for relevance
const recent = eightKs.filter(f => f.date >= '2024-01-01');

console.log('='.repeat(100));
console.log('MARA 8-K Filings (2024-2025)');
console.log('='.repeat(100));
console.log('');
console.log('Date       | Category | Accession              | Items');
console.log('-'.repeat(100));

recent.forEach(f => {
  const category = categorize8K(f);
  const accessionClean = f.accession.replace(/-/g, '');
  const secUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${f.primaryDoc}`;
  console.log(`${f.date} | ${category.padEnd(8)} | ${f.accession} | ${f.items || 'N/A'}`);
});

console.log('');
console.log('='.repeat(100));
console.log('Summary by Category:');
console.log('='.repeat(100));

const byCategory = {};
recent.forEach(f => {
  const cat = categorize8K(f);
  byCategory[cat] = (byCategory[cat] || 0) + 1;
});

Object.entries(byCategory).sort((a,b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count} filings`);
});

// List potential BTC-related filings
console.log('');
console.log('='.repeat(100));
console.log('Potential BTC-Related Filings (need manual review):');
console.log('='.repeat(100));

const btcRelated = recent.filter(f => {
  const cat = categorize8K(f);
  return cat === 'BTC' || cat === 'EARNINGS' || cat === 'OTHER';
});

btcRelated.slice(0, 20).forEach(f => {
  const accessionClean = f.accession.replace(/-/g, '');
  console.log(`\n${f.date}: ${f.accession}`);
  console.log(`  Items: ${f.items || 'N/A'}`);
  console.log(`  URL: https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${f.primaryDoc}`);
});
