/**
 * Sample ALL BTC purchase 8-Ks from 2020-2024 to verify pattern consistency
 */

async function fetch8K(accession) {
  const cik = '1050446';
  const accClean = accession.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  if (!doc) return null;
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const content = await docRes.text();
  return content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
}

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const res = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const data = await res.json();
  
  const recent = data.filings.recent;
  
  console.log('Analyzing ALL BTC-related 8-Ks (2020-2024)...\n');
  
  const results = {
    simple: [],      // "acquired X bitcoins for $Y" pattern
    table: [],       // Has HTML table structure
    complex: [],     // Neither simple nor table
    notBTC: [],      // 8-K but not about BTC
  };
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2020-01-01' || recent.filingDate[i] > '2024-12-31') continue;
    
    process.stdout.write(`${recent.filingDate[i]}... `);
    
    const content = await fetch8K(recent.accessionNumber[i]);
    if (!content) {
      console.log('skip');
      continue;
    }
    
    const lowerContent = content.toLowerCase();
    const hasBTC = lowerContent.includes('bitcoin');
    
    if (!hasBTC) {
      results.notBTC.push(recent.filingDate[i]);
      console.log('not BTC');
      continue;
    }
    
    // Check for simple pattern
    const simplePattern = /acquired approximately ([\d,]+) bitcoins? for approximately \$([\d,.]+) (million|billion)/i;
    const simpleMatch = content.match(simplePattern);
    
    // Check for table pattern
    const hasTable = content.includes('Total Bitcoins') || 
                     content.includes('Aggregate Purchase') ||
                     (content.includes('BTC') && content.includes('Average'));
    
    if (simpleMatch) {
      results.simple.push({
        date: recent.filingDate[i],
        acc: recent.accessionNumber[i],
        btc: simpleMatch[1],
        cost: simpleMatch[2] + ' ' + simpleMatch[3]
      });
      console.log(`SIMPLE: ${simpleMatch[1]} BTC`);
    } else if (hasTable) {
      results.table.push(recent.filingDate[i]);
      console.log('TABLE format');
    } else {
      results.complex.push({
        date: recent.filingDate[i],
        preview: content.slice(0, 200)
      });
      console.log('COMPLEX/OTHER');
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`Simple narrative pattern: ${results.simple.length} filings`);
  console.log(`Table format: ${results.table.length} filings`);
  console.log(`Complex/other BTC: ${results.complex.length} filings`);
  console.log(`Not BTC-related: ${results.notBTC.length} filings`);
  
  const total = results.simple.length + results.table.length + results.complex.length;
  const easyPct = ((results.simple.length + results.table.length) / total * 100).toFixed(0);
  
  console.log(`\nEasy to parse (simple + table): ${easyPct}% of BTC 8-Ks`);
  
  if (results.complex.length > 0) {
    console.log('\nComplex filings to review:');
    results.complex.forEach(c => console.log(`  ${c.date}: ${c.preview.slice(0, 100)}...`));
  }
}

run().catch(console.error);
