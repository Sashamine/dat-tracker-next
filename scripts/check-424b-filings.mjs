/**
 * Check 424B5 filings for preferred stock IPO details
 */

const CIK = '1050446';

async function fetchFiling(accession) {
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
  
  console.log('Checking 424B5 filings for preferred IPOs...\n');
  
  const ipos = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (!['424B5', '424B3'].includes(recent.form[i])) continue;
    if (recent.filingDate[i] < '2025-01-01') continue;
    
    const raw = await fetchFiling(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Check for preferred stock
    if (!content.toLowerCase().includes('preferred stock')) continue;
    
    // Determine which class
    let ticker = null;
    if (content.includes('STRK') && !content.includes('STRF') && !content.includes('STRC') && !content.includes('STRD')) {
      ticker = 'STRK';
    } else if (content.includes('STRF') && !content.includes('STRK') && !content.includes('STRC') && !content.includes('STRD')) {
      ticker = 'STRF';
    } else if (content.includes('STRC') && !content.includes('STRK') && !content.includes('STRF') && !content.includes('STRD')) {
      ticker = 'STRC';
    } else if (content.includes('STRD') && !content.includes('STRK') && !content.includes('STRF') && !content.includes('STRC')) {
      ticker = 'STRD';
    } else if (content.includes('STRE') || content.toLowerCase().includes('stream')) {
      ticker = 'STRE';
    }
    
    // For the first few 424B5s, extract offering details
    const sharesMatch = content.match(/(?:offering|selling)\s+([\d,]+)\s+shares/i) ||
                        content.match(/([\d,]+)\s+shares\s+of/i);
    
    const priceMatch = content.match(/\$\s*([\d.]+)\s+per\s+share/i) ||
                       content.match(/offering\s+price[^$]*\$\s*([\d.]+)/i);
    
    const proceedsMatch = content.match(/(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
    
    let shares = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : 0;
    let price = priceMatch ? parseFloat(priceMatch[1]) : 0;
    let proceeds = 0;
    
    if (proceedsMatch) {
      proceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
      const unit = proceedsMatch[2]?.toLowerCase();
      if (unit === 'billion') proceeds *= 1e9;
      else if (unit === 'million') proceeds *= 1e6;
      else if (proceeds < 1000) proceeds *= 1e6;
    }
    
    if (proceeds > 10e6 || shares > 100000) {
      console.log(`${recent.filingDate[i]} [${recent.form[i]}]: ${ticker || 'Multiple'}`);
      console.log(`  Shares: ${shares.toLocaleString()}`);
      console.log(`  Price: $${price.toFixed(2)}`);
      console.log(`  Proceeds: $${(proceeds/1e6).toFixed(1)}M`);
      console.log();
      
      if (ticker) {
        ipos.push({
          date: recent.filingDate[i],
          ticker,
          shares,
          price,
          proceeds,
          accession: recent.accessionNumber[i],
        });
      }
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  // Dedupe and summarize
  console.log('='.repeat(70));
  console.log('PREFERRED IPO SUMMARY (from 424B5)');
  console.log('='.repeat(70));
  
  const byTicker = {};
  for (const ipo of ipos) {
    if (!byTicker[ipo.ticker] || ipo.proceeds > byTicker[ipo.ticker].proceeds) {
      byTicker[ipo.ticker] = ipo;
    }
  }
  
  let total = 0;
  for (const [ticker, ipo] of Object.entries(byTicker)) {
    console.log(`\n${ticker}:`);
    console.log(`  IPO Date: ${ipo.date}`);
    console.log(`  Shares: ${ipo.shares.toLocaleString()}`);
    console.log(`  Price: $${ipo.price.toFixed(2)}`);
    console.log(`  Proceeds: $${(ipo.proceeds/1e6).toFixed(1)}M`);
    total += ipo.proceeds;
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL IPO PROCEEDS: $${(total/1e9).toFixed(2)}B`);
  console.log('='.repeat(70));
}

run().catch(console.error);
