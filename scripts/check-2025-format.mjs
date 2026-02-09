/**
 * Check format of unparsed 2025 8-Ks
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
  
  // Check a few unparsed 2025 filings
  const toCheck = ['2025-04-07', '2025-05-05', '2025-06-09', '2025-10-06'];
  
  for (const targetDate of toCheck) {
    let acc = null;
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '8-K' && recent.filingDate[i] === targetDate) {
        acc = recent.accessionNumber[i];
        break;
      }
    }
    if (!acc) continue;
    
    console.log('='.repeat(80));
    console.log(`${targetDate} (${acc})`);
    console.log('='.repeat(80));
    
    const raw = await fetch8K(acc);
    if (!raw) continue;
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Find bitcoin context
    const btcIdx = clean.toLowerCase().indexOf('bitcoin');
    if (btcIdx > 0) {
      console.log(clean.slice(Math.max(0, btcIdx - 50), btcIdx + 800));
    }
    console.log();
    
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
