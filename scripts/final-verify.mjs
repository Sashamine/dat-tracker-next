/**
 * Get correct net proceeds for each verified direct offering
 */

const offerings = [
  { date: '2025-11-07', acc: '0001193125-25-272591' },
  { date: '2025-07-25', acc: '0001193125-25-165531' },
  { date: '2025-06-06', acc: '0001193125-25-137186' },
  { date: '2025-03-21', acc: '0001193125-25-060332' },
  { date: '2025-02-03', acc: '0001193125-25-018819' },
];

async function getDetails(acc) {
  const cik = '1050446';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  
  const docRes = await fetch(`https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`, 
    { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Get type from first 2000 chars
  const first2k = clean.slice(0, 2000);
  let type = 'unknown';
  if (first2k.includes('STRE Stock') || first2k.includes('Stream Preferred')) type = 'STRE';
  else if (first2k.includes('STRC Stock') || first2k.includes('Stretch Preferred')) type = 'STRC';
  else if (first2k.includes('STRK Stock') || first2k.includes('Strike Preferred')) type = 'STRK';
  else if (first2k.includes('STRF Stock') || first2k.includes('Strife Preferred')) type = 'STRF';
  else if (first2k.includes('STRD Stock') || first2k.includes('Stride Preferred')) type = 'STRD';
  
  // Get shares
  const sharesMatch = first2k.match(/([\d,]+)\s+Shares/);
  const shares = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : null;
  
  // Find "net proceeds to us from this offering will be approximately X"
  const proceedsMatch = clean.match(/net proceeds to us from this offering will be approximately \$?([\d,.]+)\s*(million|billion)/i);
  let netProceeds = null;
  if (proceedsMatch) {
    netProceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
    if (proceedsMatch[2].toLowerCase() === 'billion') netProceeds *= 1000;
  }
  
  return { type, shares, netProceeds };
}

async function run() {
  console.log('Final verification of direct offerings:\n');
  console.log('='.repeat(70));
  
  let total = 0;
  const results = [];
  
  for (const o of offerings) {
    const info = await getDetails(o.acc);
    console.log(`${o.date} ${info.type}:`);
    console.log(`  Shares: ${info.shares?.toLocaleString()}`);
    console.log(`  Net Proceeds: $${info.netProceeds?.toLocaleString()}M`);
    console.log(`  Accession: ${o.acc}`);
    console.log();
    
    if (info.netProceeds) {
      total += info.netProceeds;
      results.push({ ...o, ...info });
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('='.repeat(70));
  console.log('SUMMARY - DIRECT UNDERWRITTEN OFFERINGS:');
  console.log('='.repeat(70));
  
  for (const r of results) {
    console.log(`${r.date} ${r.type}: $${r.netProceeds.toLocaleString()}M (${r.shares?.toLocaleString()} shares) [${r.acc}]`);
  }
  
  console.log(`\nTotal Direct Offerings: $${(total/1000).toFixed(3)}B`);
  
  // Add ATM sales
  const atmSales = 1913; // from earlier calculation
  console.log(`ATM Sales (from 8-K): $${(atmSales/1000).toFixed(3)}B`);
  console.log(`\nGRAND TOTAL: $${((total + atmSales)/1000).toFixed(3)}B`);
  console.log(`Target: $8.38B`);
  console.log(`Gap: $${(((total + atmSales)/1000) - 8.38).toFixed(3)}B`);
}

run().catch(console.error);
