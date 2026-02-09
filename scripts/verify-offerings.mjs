/**
 * Manually verify the direct offerings that had reasonable values
 */

const toVerify = [
  { date: '2025-11-07', acc: '0001193125-25-272591', claimed: 'STRE $608M' },
  { date: '2025-07-25', acc: '0001193125-25-165531', claimed: 'STRC $2.474B' },
  { date: '2025-06-06', acc: '0001193125-25-137186', claimed: 'STRK $979M' },
  { date: '2025-03-21', acc: '0001193125-25-060332', claimed: 'STRK $711M' },
  { date: '2025-02-03', acc: '0001193125-25-018819', claimed: 'STRK $563M' },
];

async function verify(acc) {
  const cik = '1050446';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Get type from the title area (first 2000 chars)
  const first2k = clean.slice(0, 2000);
  let type = 'unknown';
  if (first2k.includes('STRE Stock') || first2k.includes('Stream Preferred')) type = 'STRE';
  else if (first2k.includes('STRC Stock') || first2k.includes('Stretch Preferred')) type = 'STRC';
  else if (first2k.includes('STRK Stock') || first2k.includes('Strike Preferred')) type = 'STRK';
  else if (first2k.includes('STRF Stock') || first2k.includes('Strife Preferred')) type = 'STRF';
  else if (first2k.includes('STRD Stock') || first2k.includes('Stride Preferred')) type = 'STRD';
  
  // Get shares from title
  const sharesMatch = first2k.match(/([\d,]+)\s+Shares/);
  const shares = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : null;
  
  // Get net proceeds - look for the first occurrence with a reasonable value
  const netMatch = clean.match(/net proceeds[^$]*\$\s*([\d,.]+)\s*(million|billion)/i);
  let netProceeds = null;
  if (netMatch) {
    netProceeds = parseFloat(netMatch[1].replace(/,/g, ''));
    if (netMatch[2].toLowerCase() === 'billion') netProceeds *= 1000;
  }
  
  return { type, shares, netProceeds };
}

async function run() {
  console.log('Verifying direct offerings...\n');
  console.log('='.repeat(70));
  
  let total = 0;
  const verified = [];
  
  for (const item of toVerify) {
    const info = await verify(item.acc);
    const proceeds = info.netProceeds || 0;
    
    console.log(`${item.date}: ${info.type}`);
    console.log(`  Shares: ${info.shares?.toLocaleString() || '?'}`);
    console.log(`  Net Proceeds: $${info.netProceeds?.toLocaleString() || '?'}M`);
    console.log(`  Accession: ${item.acc}`);
    console.log();
    
    if (proceeds > 0 && proceeds < 10000) { // Sanity check - under $10B
      total += proceeds;
      verified.push({ ...item, ...info });
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('='.repeat(70));
  console.log('VERIFIED DIRECT OFFERINGS:');
  console.log('='.repeat(70));
  
  for (const v of verified) {
    console.log(`${v.date} ${v.type}: $${v.netProceeds?.toLocaleString()}M (${v.shares?.toLocaleString() || '?'} shares)`);
  }
  
  console.log(`\nTotal from direct offerings: $${(total/1000).toFixed(2)}B`);
}

run().catch(console.error);
