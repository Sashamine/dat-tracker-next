/**
 * Extract preferred stock sales from ATM tables
 * The weekly 8-Ks have tables with all programs including STRK, STRF, STRC, STRD
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

function extractProgramData(content) {
  const programs = {};
  
  // Format 1: "STRK ATM 575,392 STRK Shares $ 57.5 $ 57.5 $ 19,342.3"
  // Format 2: "STRK Stock 38,796 $ - $ 3.5 $ 19,423.4"
  
  const tickers = ['STRK', 'STRF', 'STRC', 'STRD'];
  
  for (const ticker of tickers) {
    // Try both formats
    // Old: "TICKER ATM X TICKER Shares $ face $ net $ available"
    // New: "TICKER Stock X $ face $ net $ available"
    
    const patterns = [
      // Old format: captures shares and net proceeds
      new RegExp(`${ticker}\\s+ATM\\s+([\\d,]+)\\s+${ticker}\\s+Shares[^$]*\\$\\s*[\\d,.]+\\s*\\$\\s*([\\d,.]+)`, 'i'),
      // New format  
      new RegExp(`${ticker}\\s+Stock\\s+([\\d,]+)[^$]*\\$\\s*[\\d,.\\-]+\\s*\\$\\s*([\\d,.]+)`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const shares = parseInt(match[1].replace(/,/g, ''), 10);
        const netProceeds = parseFloat(match[2].replace(/,/g, '')) * 1e6;  // Convert from millions
        
        if (shares > 0 && netProceeds > 0) {
          programs[ticker] = { shares, netProceeds };
        }
        break;
      }
    }
  }
  
  return programs;
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('Extracting preferred stock from ATM tables...\n');
  
  const allEvents = [];
  const totals = {
    STRK: { shares: 0, proceeds: 0 },
    STRF: { shares: 0, proceeds: 0 },
    STRC: { shares: 0, proceeds: 0 },
    STRD: { shares: 0, proceeds: 0 },
  };
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2025-01-01') continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    if (!content.includes('ATM Program Summary') && !content.includes('ATM Update')) continue;
    
    const programs = extractProgramData(content);
    
    if (Object.keys(programs).length > 0) {
      const event = {
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i],
        ...programs,
      };
      allEvents.push(event);
      
      const parts = [];
      for (const [ticker, data] of Object.entries(programs)) {
        parts.push(`${ticker}: ${data.shares.toLocaleString()} / $${(data.netProceeds/1e6).toFixed(1)}M`);
        totals[ticker].shares += data.shares;
        totals[ticker].proceeds += data.netProceeds;
      }
      
      console.log(`${recent.filingDate[i]}: ${parts.join(' | ')}`);
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('PREFERRED STOCK FROM ATM TABLES');
  console.log('='.repeat(70));
  
  let totalProceeds = 0;
  let totalShares = 0;
  
  for (const [ticker, data] of Object.entries(totals)) {
    if (data.shares > 0) {
      console.log(`\n${ticker}:`);
      console.log(`  Shares: ${data.shares.toLocaleString()}`);
      console.log(`  Net Proceeds: $${(data.proceeds/1e6).toFixed(1)}M`);
      totalProceeds += data.proceeds;
      totalShares += data.shares;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL: ${totalShares.toLocaleString()} shares, $${(totalProceeds/1e9).toFixed(2)}B`);
  console.log('='.repeat(70));
  console.log('\nNote: This is ATM sales only. IPO proceeds are separate.');
}

run().catch(console.error);
