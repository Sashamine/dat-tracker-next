/**
 * Check 10-Q for cumulative preferred stock data
 */

const CIK = '1050446';

async function fetchFiling(accession) {
  const accClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  if (!res.ok) return null;
  const index = await res.json();
  
  // Find the main 10-Q document
  const doc = index.directory.item.find(d => 
    d.name.endsWith('.htm') && 
    (d.name.includes('mstr-') || d.name.includes('10q'))
  );
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
  
  // Find Q3 2025 10-Q
  console.log('Looking for Q3 2025 10-Q...\n');
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '10-Q') continue;
    if (recent.filingDate[i] < '2025-10-01') continue;
    
    console.log(`Found 10-Q: ${recent.filingDate[i]} (${recent.accessionNumber[i]})`);
    
    const raw = await fetchFiling(recent.accessionNumber[i]);
    if (!raw) { console.log('Could not fetch'); continue; }
    
    const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Search for preferred stock section
    const prefIdx = content.toLowerCase().indexOf('preferred stock');
    
    if (prefIdx > 0) {
      // Look for each class
      const classes = ['STRK', 'STRF', 'STRC', 'STRD'];
      
      for (const cls of classes) {
        const clsIdx = content.indexOf(cls);
        if (clsIdx > 0) {
          // Get context around this mention
          const context = content.slice(clsIdx, clsIdx + 500);
          
          // Look for shares outstanding
          const sharesMatch = context.match(/([\d,]+)\s+shares/i);
          const proceedsMatch = context.match(/(?:net\s+)?proceeds[^$]*\$\s*([\d,.]+)/i);
          
          if (sharesMatch || proceedsMatch) {
            console.log(`\n${cls}:`);
            if (sharesMatch) console.log(`  Shares: ${sharesMatch[1]}`);
            if (proceedsMatch) console.log(`  Proceeds ref: $${proceedsMatch[1]}`);
            console.log(`  Context: ${context.slice(0, 200)}...`);
          }
        }
      }
    }
    
    // Also look for Series A Perpetual Preferred Stock
    const seriesIdx = content.toLowerCase().indexOf('series a perpetual');
    if (seriesIdx > 0) {
      console.log('\n\nSeries A Perpetual Preferred context:');
      console.log(content.slice(seriesIdx, seriesIdx + 800));
    }
    
    break;  // Just check the first 10-Q
  }
}

run().catch(console.error);
