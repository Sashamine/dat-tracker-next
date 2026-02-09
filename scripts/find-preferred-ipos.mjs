/**
 * Find IPO/initial offering dates and proceeds for each preferred class
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
  
  console.log('Finding preferred stock IPOs...\n');
  
  const ipos = {
    STRK: { name: 'Strike (8%)', date: null, proceeds: 0, shares: 0, found: false },
    STRF: { name: 'Strife (10%)', date: null, proceeds: 0, shares: 0, found: false },
    STRC: { name: 'Strive', date: null, proceeds: 0, shares: 0, found: false },
    STRD: { name: 'Stride', date: null, proceeds: 0, shares: 0, found: false },
    STRE: { name: 'Stream (EUR)', date: null, proceeds: 0, shares: 0, found: false },
  };
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2025-01-01') continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    const lower = content.toLowerCase();
    
    // Check for IPO keywords
    const isClosing = lower.includes('closes') && lower.includes('offering');
    const isPricing = lower.includes('pricing') && lower.includes('offering');
    const isIPO = lower.includes('initial public offering');
    
    if (!isClosing && !isPricing && !isIPO) continue;
    
    for (const [ticker, data] of Object.entries(ipos)) {
      if (data.found) continue;
      
      // Check if this filing mentions this ticker
      const tickerPattern = new RegExp(`\\b${ticker}\\b`, 'i');
      const namePattern = new RegExp(data.name.split(' ')[0], 'i');
      
      if (!tickerPattern.test(content) && !namePattern.test(content)) continue;
      
      // Extract shares issued
      const sharesPatterns = [
        /issued\s+and\s+sold\s+(?:an\s+aggregate\s+of\s+)?([\d,]+)\s+shares/i,
        /([\d,]+)\s+shares\s+of\s+(?:Series|its)\s+[A-Z]/i,
        /offering\s+of\s+([\d,]+)\s+shares/i,
        /([\d,]+)\s+shares\s+were\s+(?:issued|sold)/i,
      ];
      
      let shares = 0;
      for (const pattern of sharesPatterns) {
        const match = content.match(pattern);
        if (match) {
          shares = parseInt(match[1].replace(/,/g, ''), 10);
          if (shares > 100000) break;  // Reasonable IPO size
        }
      }
      
      // Extract proceeds
      const proceedsPatterns = [
        /(?:net|gross)\s+proceeds[^$€]*[\$€]\s*([\d,.]+)\s*(billion|million)?/i,
        /aggregate\s+(?:net\s+)?proceeds[^$€]*[\$€]\s*([\d,.]+)\s*(billion|million)?/i,
        /proceeds\s+(?:of|from)[^$€]*[\$€]\s*([\d,.]+)\s*(billion|million)?/i,
      ];
      
      let proceeds = 0;
      for (const pattern of proceedsPatterns) {
        const match = content.match(pattern);
        if (match) {
          proceeds = parseFloat(match[1].replace(/,/g, ''));
          const unit = match[2]?.toLowerCase();
          if (unit === 'billion') proceeds *= 1e9;
          else if (unit === 'million') proceeds *= 1e6;
          else if (proceeds < 1000) proceeds *= 1e6;
          
          // Convert EUR to USD for STRE
          if (ticker === 'STRE' || content.includes('€')) {
            proceeds *= 1.08;
          }
          
          if (proceeds > 10e6) break;  // Reasonable IPO size
        }
      }
      
      if (proceeds > 10e6 || shares > 100000) {
        console.log(`${recent.filingDate[i]} - ${ticker} IPO: ${shares.toLocaleString()} shares, $${(proceeds/1e6).toFixed(1)}M`);
        
        if (!data.found || proceeds > data.proceeds) {
          data.date = recent.filingDate[i];
          data.proceeds = proceeds;
          data.shares = shares;
          data.found = true;
          data.accession = recent.accessionNumber[i];
        }
      }
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('PREFERRED STOCK IPO SUMMARY');
  console.log('='.repeat(70));
  
  let totalIPO = 0;
  for (const [ticker, data] of Object.entries(ipos)) {
    console.log(`\n${ticker} (${data.name}):`);
    if (data.found) {
      console.log(`  IPO Date: ${data.date}`);
      console.log(`  Shares: ${data.shares.toLocaleString()}`);
      console.log(`  Proceeds: $${(data.proceeds/1e6).toFixed(1)}M`);
      totalIPO += data.proceeds;
    } else {
      console.log(`  Not found`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL IPO PROCEEDS: $${(totalIPO/1e6).toFixed(1)}M`);
  console.log('='.repeat(70));
}

run().catch(console.error);
