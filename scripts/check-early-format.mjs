/**
 * Check what the 2020-2021 "complex" 8-Ks actually look like
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
  
  // Find 2020-2021 BTC 8-Ks
  const earlyFilings = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K' && 
        recent.filingDate[i] >= '2020-08-01' && 
        recent.filingDate[i] < '2022-01-01') {
      earlyFilings.push({ date: recent.filingDate[i], acc: recent.accessionNumber[i] });
    }
  }
  
  console.log(`Checking ${earlyFilings.length} early 8-Ks (2020-2021)...\n`);
  
  // Sample a few
  for (const f of earlyFilings.slice(0, 5)) {
    console.log('='.repeat(70));
    console.log(`${f.date} (${f.acc})`);
    console.log('='.repeat(70));
    
    const raw = await fetch8K(f.acc);
    if (!raw) continue;
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Find bitcoin mentions
    const btcIdx = clean.toLowerCase().indexOf('bitcoin');
    if (btcIdx > 0) {
      console.log('BTC context (800 chars):');
      console.log(clean.slice(Math.max(0, btcIdx - 50), btcIdx + 750));
    } else {
      console.log('No bitcoin mention - first 500 chars:');
      console.log(clean.slice(0, 500));
    }
    console.log();
    
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
