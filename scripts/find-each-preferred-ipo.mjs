/**
 * Find actual IPO for each preferred class by looking for first mention
 */

const CIK = '1050446';

async function fetch8K(accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  if (!res.ok) return null;
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
  
  // Search for specific preferred classes in 8-Ks
  const classes = [
    { ticker: 'STRK', name: 'Strike', searchDate: '2025-01-01' },
    { ticker: 'STRF', name: 'Strife', searchDate: '2025-03-01' },
    { ticker: 'STRC', name: 'Strive', searchDate: '2025-06-01' },
    { ticker: 'STRD', name: 'Stride', searchDate: '2025-06-01' },
    { ticker: 'STRE', name: 'Stream', searchDate: '2025-09-01' },
  ];
  
  for (const cls of classes) {
    console.log('='.repeat(70));
    console.log(`${cls.ticker} (${cls.name}) - searching from ${cls.searchDate}`);
    console.log('='.repeat(70));
    
    let foundIPO = false;
    
    // Scan from search date forward
    for (let i = recent.form.length - 1; i >= 0; i--) {
      if (recent.form[i] !== '8-K') continue;
      if (recent.filingDate[i] < cls.searchDate) continue;
      if (recent.filingDate[i] > '2025-12-31') continue;  // Stay in 2025
      
      const raw = await fetch8K(recent.accessionNumber[i]);
      if (!raw) continue;
      
      const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
      
      // Check if this mentions the specific ticker
      const hasThisTicker = content.includes(cls.ticker);
      const hasOtherTickers = ['STRK', 'STRF', 'STRC', 'STRD', 'STRE']
        .filter(t => t !== cls.ticker)
        .some(t => content.includes(t));
      
      // Skip if it has multiple tickers (it's a weekly summary, not an IPO)
      if (hasOtherTickers) continue;
      
      if (hasThisTicker) {
        const lower = content.toLowerCase();
        
        // Check for IPO language
        const isIPO = lower.includes('pricing') || 
                      lower.includes('closes') || 
                      lower.includes('initial public offering') ||
                      lower.includes('commenced trading');
        
        if (isIPO) {
          // Extract key info
          const sharesMatch = content.match(/([\d,]+)\s+shares/i);
          const proceedsMatch = content.match(/(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
          
          let proceeds = 0;
          if (proceedsMatch) {
            proceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
            const unit = proceedsMatch[2]?.toLowerCase();
            if (unit === 'billion') proceeds *= 1e9;
            else if (unit === 'million') proceeds *= 1e6;
            else if (proceeds < 1000) proceeds *= 1e6;
          }
          
          console.log(`\nFOUND IPO: ${recent.filingDate[i]}`);
          console.log(`  Shares: ${sharesMatch ? sharesMatch[1] : 'N/A'}`);
          console.log(`  Proceeds: $${(proceeds/1e6).toFixed(1)}M`);
          console.log(`  Accession: ${recent.accessionNumber[i]}`);
          
          // Print relevant excerpt
          const strkIdx = content.indexOf(cls.ticker);
          if (strkIdx > 0) {
            console.log(`  Excerpt: ${content.slice(strkIdx, strkIdx + 300).substring(0, 200)}...`);
          }
          
          foundIPO = true;
          break;
        }
      }
      
      await new Promise(r => setTimeout(r, 50));
    }
    
    if (!foundIPO) {
      console.log(`\nNo dedicated IPO filing found - may be in prospectus or combined filing`);
    }
    
    console.log();
  }
}

run().catch(console.error);
