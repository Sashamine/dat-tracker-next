/**
 * Check 8-K weekly updates for ATM sales data
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
  
  // Check a recent weekly 8-K
  const targetDates = ['2025-05-05', '2025-06-09', '2025-10-27'];
  
  for (const targetDate of targetDates) {
    let acc = null;
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '8-K' && recent.filingDate[i] === targetDate) {
        acc = recent.accessionNumber[i];
        break;
      }
    }
    if (!acc) continue;
    
    console.log('='.repeat(80));
    console.log(`${targetDate}`);
    console.log('='.repeat(80));
    
    const raw = await fetch8K(acc);
    if (!raw) continue;
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Look for ATM/stock sales data
    const atmIdx = clean.toLowerCase().indexOf('atm');
    if (atmIdx > 0) {
      // Find the broader context including tables
      const start = Math.max(0, atmIdx - 200);
      const end = Math.min(clean.length, atmIdx + 1500);
      console.log(clean.slice(start, end));
    }
    
    console.log();
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
