/**
 * Check Sept 2024 filings in detail
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
  
  // Find September 2024 8-Ks
  const targets = [];
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K' && 
        recent.filingDate[i] >= '2024-09-01' && 
        recent.filingDate[i] <= '2024-09-30') {
      targets.push({
        date: recent.filingDate[i],
        acc: recent.accessionNumber[i],
      });
    }
  }
  
  console.log(`Found ${targets.length} September 2024 8-Ks\n`);
  
  for (const t of targets) {
    console.log('='.repeat(70));
    console.log(`${t.date}`);
    console.log('='.repeat(70));
    
    const raw = await fetch8K(t.acc);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Print first 1500 chars
    console.log(content.slice(0, 1500));
    console.log();
    
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
