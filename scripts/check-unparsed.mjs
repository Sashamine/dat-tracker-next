/**
 * Check the format of unparsed early 8-Ks
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
  return await docRes.text();
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const res = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const data = await res.json();
  
  const recent = data.filings.recent;
  
  // Find early unparsed ones
  const unparsed = [
    '2020-08-11',  // First BTC purchase announcement
    '2020-09-14',
    '2020-12-04',
    '2021-02-17',
    '2021-05-18',
  ];
  
  for (const targetDate of unparsed) {
    const idx = recent.filingDate.indexOf(targetDate);
    if (idx < 0) continue;
    
    // Find the 8-K
    let accession = null;
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '8-K' && recent.filingDate[i] === targetDate) {
        accession = recent.accessionNumber[i];
        break;
      }
    }
    
    if (!accession) continue;
    
    console.log('='.repeat(70));
    console.log(`${targetDate} (${accession})`);
    console.log('='.repeat(70));
    
    const raw = await fetch8K(accession);
    if (!raw) continue;
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    const btcIdx = clean.toLowerCase().indexOf('bitcoin');
    if (btcIdx > 0) {
      console.log(clean.slice(Math.max(0, btcIdx - 50), btcIdx + 800));
    }
    console.log();
    
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
