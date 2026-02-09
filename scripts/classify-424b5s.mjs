/**
 * Properly classify all preferred 424B5 filings
 */

async function fetchAndAnalyze(accession) {
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
  
  // Determine security type
  let type = null;
  if (clean.includes('STRE Stock') || clean.includes('Stream Preferred')) type = 'STRE';
  else if (clean.includes('STRK Stock') || clean.includes('Strike Preferred')) type = 'STRK';
  else if (clean.includes('STRF Stock') || clean.includes('Strife Preferred')) type = 'STRF';
  else if (clean.includes('STRD Stock') || clean.includes('Stride Preferred')) type = 'STRD';
  else if (clean.includes('STRC Stock') || clean.includes('Stretch Preferred')) type = 'STRC';
  else if (clean.includes('Class A Common Stock')) type = 'MSTR';
  
  if (!type || type === 'MSTR') return null;
  
  // Check if preliminary
  const isPreliminary = clean.includes('Subject to Completion') || clean.includes('Preliminary Prospectus');
  
  // Check if ATM registration vs direct offering
  const isATMReg = clean.includes('may offer and sell') && clean.includes('from time to time') && clean.includes('up to $');
  
  // Look for actual proceeds
  let netProceeds = null;
  let grossProceeds = null;
  let shares = null;
  
  // Net proceeds pattern
  const netMatch = clean.match(/net proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)?/i);
  if (netMatch) {
    netProceeds = parseFloat(netMatch[1].replace(/,/g, ''));
    if (netMatch[2]?.toLowerCase() === 'billion') netProceeds *= 1000;
  }
  
  // Shares pattern  
  const sharesMatch = clean.match(/(?:offering|sold)\s+([\d,]+)\s+shares/i) ||
                      clean.match(/([\d,]+)\s+Shares\s+[\d.]+%\s+Series/i);
  if (sharesMatch) {
    shares = parseInt(sharesMatch[1].replace(/,/g, ''), 10);
    grossProceeds = shares * 100 / 1e6; // in millions
  }
  
  return {
    type,
    isPreliminary,
    isATMReg,
    shares,
    grossProceeds,
    netProceeds
  };
}

async function run() {
  // Get all 424B5 filings
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  const filings = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] === '424B5' && recent.filingDate[i] >= '2025-01-01') {
      filings.push({
        date: recent.filingDate[i],
        accession: recent.accessionNumber[i]
      });
    }
  }
  
  console.log(`Analyzing ${filings.length} 424B5 filings from 2025+\n`);
  
  const directOfferings = [];
  const atmRegistrations = [];
  
  for (const f of filings) {
    process.stdout.write(`${f.date}... `);
    
    const info = await fetchAndAnalyze(f.accession);
    
    if (!info) {
      console.log('not preferred');
      continue;
    }
    
    if (info.isPreliminary) {
      console.log(`${info.type} preliminary`);
      continue;
    }
    
    if (info.isATMReg) {
      console.log(`${info.type} ATM registration`);
      atmRegistrations.push({ ...f, ...info });
    } else if (info.netProceeds || info.shares) {
      console.log(`${info.type} DIRECT: ${info.shares?.toLocaleString() || '?'} shares, $${info.netProceeds || info.grossProceeds}M`);
      directOfferings.push({ ...f, ...info });
    } else {
      console.log(`${info.type} unknown type`);
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DIRECT OFFERINGS (actual capital raised)');
  console.log('='.repeat(60));
  
  let totalDirect = 0;
  for (const o of directOfferings) {
    const amount = o.netProceeds || o.grossProceeds || 0;
    console.log(`${o.date} ${o.type}: ${o.shares?.toLocaleString() || '?'} shares, $${amount.toFixed(1)}M [${o.accession}]`);
    totalDirect += amount;
  }
  console.log(`\nTotal Direct Offerings: $${(totalDirect/1000).toFixed(2)}B`);
  
  console.log('\n' + '='.repeat(60));
  console.log('ATM REGISTRATIONS (capacity, not sales)');
  console.log('='.repeat(60));
  
  for (const a of atmRegistrations) {
    console.log(`${a.date} ${a.type} [${a.accession}]`);
  }
}

run().catch(console.error);
