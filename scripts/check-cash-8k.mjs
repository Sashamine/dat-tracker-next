async function run() {
  const acc = '0001193125-26-001550';
  const cik = '1050446';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await indexRes.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  console.log('Document:', doc?.name);
  
  if (doc) {
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
    const res = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
    const content = await res.text();
    const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    // Show first 3000 chars to see what this 8-K is about
    console.log('\nFirst 3000 chars:');
    console.log(clean.slice(0, 3000));
  }
}

run().catch(console.error);
