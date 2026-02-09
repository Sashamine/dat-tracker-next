async function run() {
  const acc = '0001193125-25-165531';
  const accClean = acc.replace(/-/g, '');
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/d852456d424b5.htm`;
  const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await res.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Look for proceeds
  const proceedsIdx = clean.indexOf('net proceeds');
  if (proceedsIdx > 0) {
    console.log('Net proceeds context:');
    console.log(clean.slice(proceedsIdx, proceedsIdx + 300));
  }
  
  // Check for ATM language
  console.log('\n---');
  console.log('Has "from time to time":', clean.includes('from time to time'));
  console.log('Has "may offer and sell":', clean.includes('may offer and sell'));
  console.log('Has "is offering":', clean.includes('is offering'));
  
  // Look for underwriter
  const uwIdx = clean.indexOf('underwriter');
  if (uwIdx > 0) {
    console.log('\nUnderwriter context:');
    console.log(clean.slice(uwIdx, uwIdx + 200));
  }
}

run().catch(console.error);
