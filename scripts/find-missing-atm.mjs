/**
 * Find the ~4 weeks with ATM mentions but no parsed Total line
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
  
  // Dates we flagged as "ATM mentioned but not parsed"
  const missingDates = ['2025-10-06', '2025-08-04', '2025-07-28', '2025-07-07'];
  
  console.log('Investigating missing ATM weeks...\n');
  
  for (const date of missingDates) {
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] !== '8-K' || recent.filingDate[i] !== date) continue;
      
      console.log('='.repeat(60));
      console.log(`${date}`);
      console.log('='.repeat(60));
      
      const raw = await fetch8K(recent.accessionNumber[i]);
      if (!raw) continue;
      
      const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
      const lower = content.toLowerCase();
      
      // Check what kind of filing this is
      const hasATMTable = content.includes('ATM Program Summary') || content.includes('ATM Update');
      const hasNoSales = lower.includes('did not sell') || content.includes('$ -') || content.includes('$-');
      const hasBTCUpdate = lower.includes('btc update') || lower.includes('bitcoin');
      
      console.log(`ATM Table: ${hasATMTable}`);
      console.log(`No Sales: ${hasNoSales}`);
      console.log(`BTC Update: ${hasBTCUpdate}`);
      
      // Try to find any $ amounts near ATM
      const atmIdx = content.indexOf('ATM');
      if (atmIdx > 0) {
        const context = content.slice(atmIdx, atmIdx + 400);
        const amounts = context.match(/\$\s*[\d,.]+/g) || [];
        console.log(`$ amounts near ATM: ${amounts.slice(0, 5).join(', ')}`);
        
        // Check if it's a cumulative summary
        if (context.includes('to date') || context.includes('cumulative') || context.includes('since inception')) {
          console.log('** CUMULATIVE SUMMARY - not a weekly sale **');
        }
      }
      
      // Print excerpt
      if (hasATMTable) {
        const tableIdx = content.indexOf('ATM Program Summary') || content.indexOf('ATM Update');
        console.log(`\nExcerpt: ${content.slice(tableIdx, tableIdx + 300)}...`);
      }
      
      console.log();
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
}

run().catch(console.error);
