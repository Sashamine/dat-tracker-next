/**
 * Find all direct underwritten preferred offerings
 */

async function checkFiling(accession) {
  const cik = '1050446';
  const accClean = accession.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Must have underwriter to be direct offering
  if (!clean.includes('underwriter')) return null;
  
  // Determine security type
  let type = null;
  if (clean.includes('STRE Stock') || clean.includes('Stream Preferred')) type = 'STRE';
  else if (clean.includes('STRK Stock') || clean.includes('Strike Preferred')) type = 'STRK';
  else if (clean.includes('STRF Stock') || clean.includes('Strife Preferred')) type = 'STRF';
  else if (clean.includes('STRD Stock') || clean.includes('Stride Preferred')) type = 'STRD';
  else if (clean.includes('STRC Stock') || clean.includes('Stretch Preferred')) type = 'STRC';
  
  if (!type) return null;
  
  // Skip preliminaries
  if (clean.includes('Subject to Completion') || clean.includes('Preliminary Prospectus')) {
    return null;
  }
  
  // Extract net proceeds
  let netProceeds = null;
  const netMatch = clean.match(/net proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)?/i);
  if (netMatch) {
    netProceeds = parseFloat(netMatch[1].replace(/,/g, ''));
    if (netMatch[2]?.toLowerCase() === 'billion') netProceeds *= 1000;
    // If no unit and value is small, assume millions
    if (!netMatch[2] && netProceeds < 100) netProceeds *= 1000; // probably billions written as X.XXX
  }
  
  // Extract shares
  let shares = null;
  const sharesMatch = clean.match(/([\d,]+)\s+Shares\s+[\d.]+%?\s*(?:Variable Rate\s+)?Series/i);
  if (sharesMatch) {
    shares = parseInt(sharesMatch[1].replace(/,/g, ''), 10);
  }
  
  return { type, shares, netProceeds };
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const filings424B5 = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '424B5' && recent.filingDate[i] >= '2025-01-01') {
      filings424B5.push({
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i]
      });
    }
  }
  
  console.log(`Checking ${filings424B5.length} 424B5 filings for direct offerings...\n`);
  
  const directOfferings = [];
  
  for (const f of filings424B5) {
    process.stdout.write(`${f.date}... `);
    
    const info = await checkFiling(f.accession);
    
    if (info) {
      console.log(`${info.type} DIRECT: ${info.shares?.toLocaleString() || '?'} shares, $${info.netProceeds}M net`);
      directOfferings.push({ ...f, ...info });
    } else {
      console.log('skip');
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DIRECT UNDERWRITTEN PREFERRED OFFERINGS');
  console.log('='.repeat(60));
  
  let total = 0;
  for (const o of directOfferings) {
    console.log(`${o.date} ${o.type}: ${o.shares?.toLocaleString() || '?'} shares, $${o.netProceeds?.toFixed(1) || '?'}M [${o.accession}]`);
    total += o.netProceeds || 0;
  }
  
  console.log(`\nTotal Direct Offerings: $${(total/1000).toFixed(2)}B`);
}

run().catch(console.error);
