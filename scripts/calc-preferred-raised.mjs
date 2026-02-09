/**
 * Calculate preferred stock raised from latest 8-K
 */

async function getLatestAvailability() {
  const url = 'https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/index.json';
  const indexRes = await fetch(url, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/${doc.name}`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  const clean = content.replace(/<[^>]*>/g, '|').replace(/\s+/g, ' ');
  
  const result = {};
  const types = ['STRF', 'STRC', 'STRK', 'STRD'];
  
  for (const type of types) {
    const idx = clean.indexOf(type + ' Stock');
    if (idx < 0) continue;
    
    const afterType = clean.slice(idx, idx + 300);
    // Find all numbers after $ signs
    const nums = [];
    const regex = /\$\|*([\d,.]+)/g;
    let m;
    while ((m = regex.exec(afterType)) !== null) {
      nums.push(parseFloat(m[1].replace(/,/g, '')));
    }
    
    // Last dollar amount should be "Available for Issuance"
    if (nums.length > 0) {
      result[type] = nums[nums.length - 1];
    }
  }
  
  return result;
}

async function run() {
  console.log('Fetching latest 8-K availability data...\n');
  
  const available = await getLatestAvailability();
  console.log('Available for Issuance (from Jan 26 2026 8-K):');
  for (const [type, amt] of Object.entries(available)) {
    console.log(`  ${type}: $${amt.toLocaleString()}M`);
  }
  
  // Known ATM authorization sizes from 424B5 filings
  const authorizations = {
    STRK: 21000,  // $21B from multiple filings
    STRF: 2100,   // $2.1B from May 2025
    STRD: 4200,   // $4.2B (need to verify)
    STRC: 4200    // $4.2B from Nov 2025
  };
  
  console.log('\nATM Authorizations:');
  for (const [type, amt] of Object.entries(authorizations)) {
    console.log(`  ${type}: $${amt.toLocaleString()}M`);
  }
  
  console.log('\n=== PREFERRED STOCK RAISED ===');
  console.log('(Authorization - Available = Raised)\n');
  
  let total = 0;
  for (const type of ['STRK', 'STRF', 'STRD', 'STRC']) {
    const auth = authorizations[type] || 0;
    const avail = available[type] || 0;
    const raised = auth - avail;
    
    if (raised > 0) {
      console.log(`${type}: $${auth.toLocaleString()}M - $${avail.toLocaleString()}M = $${raised.toFixed(1)}M raised`);
      total += raised;
    } else {
      console.log(`${type}: $${avail.toLocaleString()}M available (auth unknown or exceeded)`);
    }
  }
  
  console.log(`\n==> TOTAL PREFERRED RAISED: $${(total/1000).toFixed(2)}B`);
  console.log('\nNote: This uses ATM availability method. May not capture direct offerings.');
}

run().catch(console.error);
