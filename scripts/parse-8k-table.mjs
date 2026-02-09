/**
 * Parse the ATM table from the latest 8-K to get preferred availability
 */

async function run() {
  const url = 'https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/index.json';
  const indexRes = await fetch(url, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/${doc.name}`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  
  // Replace HTML tags with pipe separators
  const clean = content
    .replace(/<[^>]*>/g, '|')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/\|+/g, '|')
    .replace(/\| /g, '|')
    .replace(/ \|/g, '|');
  
  console.log('Looking for preferred stock table...\n');
  
  // Find each preferred type and extract its row data
  const types = ['STRF Stock', 'STRC Stock', 'STRK Stock', 'STRD Stock', 'STRE Stock'];
  
  for (const type of types) {
    const idx = clean.indexOf(type);
    if (idx < 0) {
      console.log(`${type}: not found`);
      continue;
    }
    
    // Get the row data after the type name (should be: shares | $ notional | $ proceeds | $ available)
    const afterType = clean.slice(idx + type.length, idx + type.length + 200);
    
    // Extract all dollar amounts
    const dollarAmounts = afterType.match(/\$\s*[\d,.-]+/g) || [];
    
    console.log(`${type}:`);
    console.log(`  Raw: ${afterType.slice(0, 100)}`);
    console.log(`  Dollar amounts: ${dollarAmounts.join(', ')}`);
    console.log();
  }
}

run().catch(console.error);
