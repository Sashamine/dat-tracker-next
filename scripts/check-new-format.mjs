/**
 * Check the newest table format (late 2025 / 2026)
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
  
  // Check recent filings
  const dates = ['2026-01-20', '2025-12-08', '2025-11-17'];
  
  for (const targetDate of dates) {
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
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Find ATM section
    const atmIdx = content.indexOf('ATM Update');
    if (atmIdx > 0) {
      const section = content.slice(atmIdx, atmIdx + 2000);
      console.log(section);
      
      // Try to find shares pattern
      console.log('\n--- Pattern Analysis ---');
      
      // New patterns to try
      const patterns = [
        /MSTR Stock\s+(\d{1,3}(?:,\d{3})*)/i,
        /STRK Stock\s+(\d{1,3}(?:,\d{3})*)/i,
        /(\d{1,3}(?:,\d{3})*)\s+MSTR Stock/i,
        /(\d{1,3}(?:,\d{3})*)\s+shares/i,
      ];
      
      for (const p of patterns) {
        const match = section.match(p);
        if (match) console.log(`Pattern ${p}: ${match[0]}`);
      }
    }
    
    console.log();
    await new Promise(r => setTimeout(r, 300));
  }
}

run().catch(console.error);
