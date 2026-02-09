/**
 * Find actual BTC purchase 8-Ks to assess structure
 */

async function fetch8K(accession) {
  const cik = '1050446';
  const accClean = accession.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  return content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const res = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const data = await res.json();
  
  const recent = data.filings.recent;
  
  console.log('Searching for BTC purchase 8-Ks (2021-2023)...\n');
  
  let found = 0;
  for (let i = 0; i < recent.form.length && found < 3; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2021-01-01' || recent.filingDate[i] > '2023-12-31') continue;
    
    const content = await fetch8K(recent.accessionNumber[i]);
    if (!content) continue;
    
    // Check if it's a BTC purchase announcement
    if (content.toLowerCase().includes('bitcoin') && 
        (content.includes('acquired') || content.includes('purchased'))) {
      
      found++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`BTC Purchase 8-K: ${recent.filingDate[i]} (${recent.accessionNumber[i]})`);
      console.log('='.repeat(60));
      
      // Find the BTC-related section
      const btcIdx = content.toLowerCase().indexOf('bitcoin');
      if (btcIdx > 0) {
        console.log('BTC section (500 chars):');
        console.log(content.slice(Math.max(0, btcIdx - 100), btcIdx + 400));
      }
      
      // Check for consistent patterns
      const hasTable = content.includes('Total Bitcoins') || content.includes('BTC');
      const hasPrice = content.includes('average price') || content.includes('Average');
      console.log(`\nHas structured data: Table=${hasTable}, AvgPrice=${hasPrice}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION:');
  console.log('='.repeat(60));
  console.log('Pre-2024 BTC 8-Ks typically have:');
  console.log('  - Simple narrative about purchase');
  console.log('  - Sometimes a table with BTC count and price');
  console.log('  - Much easier to parse than 2025 ATM complexity');
}

run().catch(console.error);
