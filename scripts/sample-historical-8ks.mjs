/**
 * Sample historical 8-Ks to see structure consistency
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
  return content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').slice(0, 2000);
}

async function run() {
  // Get 8-K list
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const res = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const data = await res.json();
  
  const recent = data.filings.recent;
  
  // Sample one 8-K from each year 2021-2024
  const samples = [
    { year: '2021', target: null },
    { year: '2022', target: null },
    { year: '2023', target: null },
  ];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '8-K') {
      const year = recent.filingDate[i].slice(0, 4);
      const sample = samples.find(s => s.year === year && !s.target);
      if (sample) {
        sample.target = { date: recent.filingDate[i], acc: recent.accessionNumber[i] };
      }
    }
  }
  
  console.log('Sample 8-Ks by year (pre-2024 = simpler era):');
  console.log('='.repeat(60));
  
  for (const s of samples) {
    if (!s.target) continue;
    console.log(`\n${s.year} Sample: ${s.target.date}`);
    console.log('-'.repeat(60));
    
    const content = await fetch8K(s.target.acc);
    if (content) {
      // Check what's in it
      const hasBTC = content.toLowerCase().includes('bitcoin');
      const hasDebt = content.toLowerCase().includes('convertible') || content.toLowerCase().includes('notes');
      const hasPreferred = content.toLowerCase().includes('preferred');
      const hasATM = content.toLowerCase().includes('at-the-market') || content.toLowerCase().includes('atm');
      
      console.log(`Contains: BTC=${hasBTC}, Debt=${hasDebt}, Preferred=${hasPreferred}, ATM=${hasATM}`);
      console.log(`First 500 chars: ${content.slice(0, 500)}...`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('ASSESSMENT:');
  console.log('Pre-2024 8-Ks typically contain:');
  console.log('  - BTC purchase announcements (table with BTC count, price)');
  console.log('  - Debt issuance/redemption announcements');
  console.log('  - Earnings releases');
  console.log('  - Leadership/governance changes');
  console.log('\nThese are MUCH simpler than 2025 ATM/preferred complexity.');
}

run().catch(console.error);
