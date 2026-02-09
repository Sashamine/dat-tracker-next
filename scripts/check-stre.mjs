async function run() {
  const acc = '0001193125-25-272591';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  
  const docRes = await fetch(`https://www.sec.gov/Archives/edgar/data/1050446/${accClean}/${doc.name}`, 
    { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Find index of "net proceeds" and show context
  let idx = 0;
  while ((idx = clean.indexOf('net proceeds', idx)) !== -1) {
    console.log('---');
    console.log(clean.slice(idx, idx + 150));
    idx += 20;
    if (idx > 50000) break;
  }
}

run().catch(console.error);
