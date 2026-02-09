/**
 * Extract early ATM sales (August 2024 $2B program)
 * Before the October 2024 $21B program
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
  const content = await docRes.text();
  
  return {
    content: content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' '),
    docName: doc.name,
  };
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('Extracting early ATM (Aug-Sept 2024)...\n');
  
  const earlySales = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2024-08-01' || recent.filingDate[i] > '2024-10-29') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const result = await fetch8K(recent.accessionNumber[i]);
    if (!result) { console.log('skip'); continue; }
    
    const content = result.content;
    const lower = content.toLowerCase();
    
    // Check for ATM/sale agreement mentions
    if (!lower.includes('sale agreement') && !lower.includes('atm')) {
      console.log('-');
      continue;
    }
    
    // Pattern: "sold an aggregate of X shares...for aggregate net proceeds of $Y"
    const sharesMatch = content.match(/sold\s+(?:an\s+)?aggregate\s+of\s+([\d,]+)\s+Shares[^$]*(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)?/i);
    
    if (sharesMatch) {
      const shares = parseInt(sharesMatch[1].replace(/,/g, ''), 10);
      let proceeds = parseFloat(sharesMatch[2].replace(/,/g, ''));
      const unit = sharesMatch[3]?.toLowerCase();
      if (unit === 'billion') proceeds *= 1e9;
      else if (unit === 'million') proceeds *= 1e6;
      else if (proceeds < 100) proceeds *= 1e9;  // Small number = billions
      else proceeds *= 1e6;  // Assume millions
      
      console.log(`✓ ${shares.toLocaleString()} shares, $${(proceeds/1e6).toFixed(1)}M`);
      
      earlySales.push({
        filingDate: recent.filingDate[i],
        shares,
        proceeds,
        accessionNumber: recent.accessionNumber[i],
        docName: result.docName,
      });
    } else {
      // Try alternate patterns
      const proceedsMatch = content.match(/(?:net|gross)\s+proceeds[^$]*\$\s*([\d,.]+)\s*(billion|million)/i);
      if (proceedsMatch && lower.includes('sale agreement')) {
        let proceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
        const unit = proceedsMatch[2]?.toLowerCase();
        if (unit === 'billion') proceeds *= 1e9;
        else proceeds *= 1e6;
        
        console.log(`✓ (no shares) $${(proceeds/1e6).toFixed(1)}M`);
        
        earlySales.push({
          filingDate: recent.filingDate[i],
          shares: null,
          proceeds,
          accessionNumber: recent.accessionNumber[i],
          docName: result.docName,
        });
      } else {
        console.log('? (ATM mentioned)');
      }
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Early ATM (Aug-Sept 2024): ${earlySales.length} events`);
  console.log('='.repeat(60));
  
  const totalProceeds = earlySales.reduce((s, e) => s + e.proceeds, 0);
  const totalShares = earlySales.reduce((s, e) => s + (e.shares || 0), 0);
  
  console.log(`Total: ${totalShares.toLocaleString()} shares, $${(totalProceeds/1e9).toFixed(3)}B`);
  
  console.log('\nDetailed:');
  for (const e of earlySales) {
    console.log(`  ${e.filingDate}: ${e.shares?.toLocaleString() || 'N/A'} shares, $${(e.proceeds/1e6).toFixed(1)}M`);
  }
}

run().catch(console.error);
