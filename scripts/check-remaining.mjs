/**
 * Check remaining 424B5s for any more direct offerings
 */

const toCheck = [
  '0001193125-25-170517',  // Jul 31
  '0001193125-25-155880',  // Jul 7
  '0001193125-25-155878',  // Jul 7
  '0001193125-25-124554',  // May 22
  '0001193125-25-109950',  // May 1
  '0001193125-25-050408',  // Mar 10
];

async function check(acc) {
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
  
  // Check if it has underwriter and net proceeds
  const hasUnderwriter = clean.includes('underwriter');
  const isPreliminary = clean.includes('Subject to Completion') || clean.includes('Preliminary Prospectus');
  
  // Get proceeds
  const proceedsMatch = clean.match(/net proceeds to us from this offering will be approximately \$?([\d,.]+)\s*(million|billion)/i);
  let netProceeds = null;
  if (proceedsMatch) {
    netProceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
    if (proceedsMatch[2].toLowerCase() === 'billion') netProceeds *= 1000;
  }
  
  // Get type
  const first2k = clean.slice(0, 2000);
  let type = 'unknown';
  if (first2k.includes('STRE Stock') || first2k.includes('Stream Preferred')) type = 'STRE';
  else if (first2k.includes('STRC Stock') || first2k.includes('Stretch Preferred')) type = 'STRC';
  else if (first2k.includes('STRK Stock') || first2k.includes('Strike Preferred')) type = 'STRK';
  else if (first2k.includes('STRF Stock') || first2k.includes('Strife Preferred')) type = 'STRF';
  else if (first2k.includes('STRD Stock') || first2k.includes('Stride Preferred')) type = 'STRD';
  
  return {
    hasUnderwriter,
    isPreliminary,
    netProceeds,
    type
  };
}

async function run() {
  console.log('Checking remaining 424B5 filings:\n');
  
  for (const acc of toCheck) {
    const info = await check(acc);
    console.log(`${acc}:`);
    console.log(`  Type: ${info.type}`);
    console.log(`  Preliminary: ${info.isPreliminary}`);
    console.log(`  Underwriter: ${info.hasUnderwriter}`);
    console.log(`  Net Proceeds: ${info.netProceeds ? '$' + info.netProceeds + 'M' : 'none'}`);
    
    if (info.hasUnderwriter && info.netProceeds && !info.isPreliminary) {
      console.log('  ** DIRECT OFFERING FOUND **');
    }
    console.log();
    
    await new Promise(r => setTimeout(r, 200));
  }
}

run().catch(console.error);
