/**
 * Investigate the ~$10B gap in ATM extraction
 * Extracted: $31.6B, Calculated: ~$41B
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
  console.log('Investigating ATM gap...\n');
  
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  // Find all 8-Ks with ATM content that we might have missed
  console.log('8-Ks mentioning ATM but possibly not fully parsed:\n');
  
  const missed = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-10-01') continue;
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) continue;
    
    const content = result.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    const lower = content.toLowerCase();
    
    // Check if it has ATM content
    const hasATM = lower.includes('atm update') || lower.includes('atm program');
    if (!hasATM) continue;
    
    // Check if it has shares sold pattern
    const hasNarrativeShares = /sold an aggregate of ([\d,]+) Shares/i.test(content);
    const hasTableShares = /(\d{1,3}(?:,\d{3})*)\s+(?:MSTR|STRK|STRF|STRC|STRD)\s+Shares/i.test(content);
    const hasTotal = /Total\s+\$\s*([\d,.]+)/i.test(content);
    
    // Check for "no sales" patterns
    const noSales = lower.includes('did not sell any shares') || 
                    lower.includes('no shares') ||
                    content.includes('Total - ') ||
                    content.includes('Total $0') ||
                    content.includes('Total $ -');
    
    console.log(`${recent.filingDate[i]}: Narrative=${hasNarrativeShares}, Table=${hasTableShares}, Total=${hasTotal}, NoSales=${noSales}`);
    
    // If has ATM but no clear extraction path
    if (!hasNarrativeShares && !hasTotal && !noSales) {
      missed.push({
        date: recent.filingDate[i],
        acc: recent.accessionNumber[i],
        hasTableShares,
      });
    }
    
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`Potentially missed ATM filings: ${missed.length}`);
  console.log('='.repeat(70));
  
  // Look at a few missed ones in detail
  for (const m of missed.slice(0, 5)) {
    console.log(`\n--- ${m.date} ---`);
    
    const result = await fetch8K(m.acc);
    if (!result) continue;
    
    const content = result.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Find ATM section
    const atmIdx = content.indexOf('ATM');
    if (atmIdx > 0) {
      console.log(content.slice(atmIdx, atmIdx + 1000));
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Also check if there are 10-Q disclosures we should look at
  console.log('\n\n10-Q filings (may have cumulative ATM data):');
  for (let i = 0; i < recent.form.length && i < 20; i++) {
    if (recent.form[i] === '10-Q' || recent.form[i] === '10-K') {
      console.log(`  ${recent.filingDate[i]} - ${recent.form[i]}`);
    }
  }
}

run().catch(console.error);
