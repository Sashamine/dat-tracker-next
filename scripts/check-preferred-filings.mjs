/**
 * Check specific preferred stock filings to understand the data format
 */

const CIK = '1050446';

async function fetchFiling(accession) {
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
  
  // Find STRK launch filing (Jan 2025)
  console.log('='.repeat(70));
  console.log('STRK LAUNCH - 2025-01-27');
  console.log('='.repeat(70));
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.filingDate[i] === '2025-01-27' && recent.form[i] === '8-K') {
      const raw = await fetchFiling(recent.accessionNumber[i]);
      const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
      
      // Find STRK mentions
      const strkIdx = content.indexOf('STRK');
      if (strkIdx > 0) {
        console.log(content.slice(Math.max(0, strkIdx - 100), strkIdx + 500));
      }
    }
  }
  
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('STRF LAUNCH - 2025-03-25');
  console.log('='.repeat(70));
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.filingDate[i] === '2025-03-25' && recent.form[i] === '8-K') {
      const raw = await fetchFiling(recent.accessionNumber[i]);
      const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
      
      // Find STRF mentions
      const strfIdx = content.indexOf('STRF');
      if (strfIdx > 0) {
        console.log(content.slice(Math.max(0, strfIdx - 100), strfIdx + 500));
      } else {
        console.log('No STRF found, checking for preferred...');
        const prefIdx = content.toLowerCase().indexOf('perpetual preferred');
        if (prefIdx > 0) {
          console.log(content.slice(Math.max(0, prefIdx - 100), prefIdx + 500));
        }
      }
    }
  }
  
  console.log('\n\n');
  console.log('='.repeat(70));
  console.log('CHECKING ALL PREFERRED IPOS');
  console.log('='.repeat(70));
  
  // Key dates for preferred IPOs
  const ipos = [
    { ticker: 'STRK', date: '2025-01-27', name: 'Strike' },
    { ticker: 'STRF', date: '2025-03-25', name: 'Strife' },
    { ticker: 'STRC', date: '2025-07-01', name: 'Strive' },  // Approximate
    { ticker: 'STRD', date: '2025-07-01', name: 'Stride' },  // Approximate
    { ticker: 'STRE', date: '2025-11-01', name: 'Stream' },  // Approximate
  ];
  
  for (const ipo of ipos) {
    // Find first filing mentioning this ticker
    for (let i = recent.form.length - 1; i >= 0; i--) {
      if (recent.filingDate[i] < '2025-01-01') break;
      if (recent.form[i] !== '8-K') continue;
      
      const raw = await fetchFiling(recent.accessionNumber[i]);
      if (!raw) continue;
      
      const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
      
      if (content.includes(ipo.ticker) || content.toLowerCase().includes(ipo.name.toLowerCase())) {
        // Check if it's an IPO announcement
        if (content.toLowerCase().includes('pricing') || 
            content.toLowerCase().includes('initial public offering') ||
            content.toLowerCase().includes('closes')) {
          
          // Extract proceeds
          const proceedsMatch = content.match(/(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
          const sharesMatch = content.match(/(\d{1,3}(?:,\d{3})*)\s+shares/i);
          
          if (proceedsMatch) {
            let proceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
            const unit = proceedsMatch[2]?.toLowerCase();
            if (unit === 'billion') proceeds *= 1000;
            else if (!unit && proceeds > 100) proceeds = proceeds;  // Already in millions
            
            console.log(`\n${ipo.ticker}: First mention ${recent.filingDate[i]}`);
            console.log(`  Proceeds: $${proceeds.toFixed(1)}M`);
            console.log(`  Shares: ${sharesMatch ? sharesMatch[1] : 'N/A'}`);
            break;
          }
        }
      }
      
      await new Promise(r => setTimeout(r, 50));
    }
  }
}

run().catch(console.error);
