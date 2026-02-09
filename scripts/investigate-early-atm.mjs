/**
 * Investigate early ATM disclosures (2024) to find the format
 * The 2024 Common ATM ($21B) was established Oct 30, 2024
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
  
  // Check 8-Ks from late 2024 through early 2025
  const targetDates = [
    '2024-11-12', '2024-11-18', '2024-11-25', '2024-12-02', 
    '2024-12-09', '2024-12-16', '2025-01-06', '2025-01-13',
    '2025-01-21', '2025-01-27', '2025-02-10', '2025-02-24',
  ];
  
  for (const targetDate of targetDates) {
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
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Check for ATM mentions
    const hasATM = clean.toLowerCase().includes('atm') || clean.toLowerCase().includes('at-the-market');
    const hasSale = clean.toLowerCase().includes('sale agreement') || clean.toLowerCase().includes('sold');
    const hasProceeds = clean.toLowerCase().includes('proceeds');
    
    console.log(`ATM: ${hasATM}, Sale: ${hasSale}, Proceeds: ${hasProceeds}`);
    
    // Look for equity sale patterns
    if (hasATM || hasSale) {
      // Find relevant section
      const atmIdx = clean.toLowerCase().indexOf('atm');
      const saleIdx = clean.toLowerCase().indexOf('sale agreement');
      const startIdx = Math.min(
        atmIdx > 0 ? atmIdx : 9999,
        saleIdx > 0 ? saleIdx : 9999
      );
      
      if (startIdx < 9999) {
        console.log('\nContext:');
        console.log(clean.slice(Math.max(0, startIdx - 100), startIdx + 800));
      }
    }
    
    // Also look for shares sold patterns
    const sharesMatch = clean.match(/sold\s+(?:approximately\s+)?([\d,]+)\s+shares/i);
    const proceedsMatch = clean.match(/(?:net|gross)\s+proceeds\s+of\s+(?:approximately\s+)?\$([\d,.]+)\s*(million|billion)/i);
    
    if (sharesMatch) console.log(`\nShares sold: ${sharesMatch[1]}`);
    if (proceedsMatch) console.log(`Proceeds: $${proceedsMatch[1]} ${proceedsMatch[2]}`);
    
    console.log();
    await new Promise(r => setTimeout(r, 200));
  }
}

run().catch(console.error);
