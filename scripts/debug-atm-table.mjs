/**
 * Debug the ATM table structure to understand column positions
 */

const CIK = '1050446';

async function fetch8K(accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  return await docRes.text();
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  // Check 2025-06-09 which has clear table structure
  let acc = null;
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K' && recent.filingDate[i] === '2025-06-09') {
      acc = recent.accessionNumber[i];
      break;
    }
  }
  
  const raw = await fetch8K(acc);
  const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  console.log('ATM TABLE STRUCTURE ANALYSIS');
  console.log('='.repeat(70));
  console.log('\nLooking for table headers and data patterns...\n');
  
  // Find the ATM section
  const atmIdx = clean.indexOf('ATM Program Summary');
  if (atmIdx > 0) {
    const section = clean.slice(atmIdx, atmIdx + 2500);
    console.log('ATM Section:');
    console.log('-'.repeat(70));
    console.log(section);
    console.log('-'.repeat(70));
    
    // The table structure is:
    // Headers: "Shares Sold" | "Notional Value" | "Net Proceeds" | "Available for Issuance"
    // Then for each program: shares | notional | proceeds | available
    
    // Let's find specific patterns
    console.log('\n\nColumn headers found:');
    const headers = ['Shares Sold', 'Notional Value', 'Net Proceeds', 'Available for Issuance'];
    for (const h of headers) {
      console.log(`  ${h}: ${section.includes(h) ? '✓' : '✗'}`);
    }
    
    // For STRK ATM row: "STRK ATM 626,639 STRK Shares $62.7 $66.4 $20,616.8"
    // The pattern is: program name, shares count, shares type, then $ amounts in order
    // $62.7 = Notional, $66.4 = Net Proceeds, $20,616.8 = Available
    
    console.log('\n\nPattern for each ATM row:');
    console.log('  [Program] [Count] [Type] Shares $[Notional] $[NetProceeds] $[Available]');
    console.log('\nExample: STRK ATM 626,639 STRK Shares $62.7 $66.4 $20,616.8');
    console.log('  - Notional: $62.7M');
    console.log('  - Net Proceeds: $66.4M');  
    console.log('  - Available: $20,616.8M');
    
    // The key insight: the $ amounts are in COLUMN ORDER
    // We want the 2nd $ amount (Net Proceeds), not the 3rd (Available)
  }
}

run().catch(console.error);
