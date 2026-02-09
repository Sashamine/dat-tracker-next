/**
 * Parse ATM table from 8-K with proper HTML handling
 */

function decodeEntities(str) {
  return str
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(code));
}

async function run() {
  const url = 'https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/index.json';
  const indexRes = await fetch(url, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/${doc.name}`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  
  // Decode entities first, then strip tags
  const decoded = decodeEntities(content);
  const clean = decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  console.log('Parsing ATM table from Jan 26, 2026 8-K...\n');
  
  const results = {};
  const types = ['STRF', 'STRC', 'STRK', 'STRD'];
  
  for (const type of types) {
    const idx = clean.indexOf(type + ' Stock');
    if (idx < 0) {
      console.log(`${type}: not found`);
      continue;
    }
    
    // Get 300 chars after the type name
    const section = clean.slice(idx, idx + 300);
    
    // Parse the table row: Type | Shares | $ Notional | $ Proceeds | $ Available
    // Numbers after $ signs
    const dollars = [];
    const regex = /\$\s*([\d,.-]+)/g;
    let m;
    while ((m = regex.exec(section)) !== null) {
      const val = m[1].replace(/,/g, '');
      if (val !== '-' && val !== '') {
        dollars.push(parseFloat(val));
      }
    }
    
    // Also get share count (number not preceded by $)
    const sharesMatch = section.match(/Stock\s+([\d,]+)\s+\$/);
    const shares = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : 0;
    
    // Last valid dollar amount is "Available"
    const available = dollars.length > 0 ? dollars[dollars.length - 1] : null;
    
    results[type] = {
      shares,
      available,
      raw: section.slice(0, 120)
    };
    
    console.log(`${type}:`);
    console.log(`  Shares sold: ${shares.toLocaleString()}`);
    console.log(`  Available: $${available?.toLocaleString() || '?'}M`);
    console.log(`  Raw: ${section.slice(0, 80)}...`);
    console.log();
  }
  
  // Known ATM sizes
  const authSizes = {
    STRK: 21000,  // Multiple tranches
    STRF: 2100,
    STRD: 4200,
    STRC: 4200
  };
  
  console.log('='.repeat(50));
  console.log('PREFERRED RAISED = Authorization - Available');
  console.log('='.repeat(50));
  
  let total = 0;
  for (const type of types) {
    const auth = authSizes[type] || 0;
    const avail = results[type]?.available || 0;
    const raised = auth - avail;
    
    console.log(`${type}: $${auth}M auth - $${avail}M avail = $${raised.toFixed(1)}M`);
    total += raised;
  }
  
  console.log(`\nTOTAL PREFERRED: $${(total/1000).toFixed(2)}B`);
}

run().catch(console.error);
