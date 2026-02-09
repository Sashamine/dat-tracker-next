/**
 * Investigate all unparsed BTC-mentioning 8-Ks
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
  return await docRes.text();
}

// Known parsed dates (from successful extraction)
const parsedDates = new Set([
  '2020-08-11', '2020-09-15', '2020-12-04',
  '2021-01-22', '2021-02-02', '2021-03-01', '2021-03-05', '2021-03-12',
  '2021-04-05', '2021-05-13', '2021-05-18', '2021-08-24', '2021-09-13',
  '2021-11-29', '2021-12-09', '2021-12-30',
  '2022-02-01', '2022-04-05', '2022-06-29', '2022-09-20', '2022-12-28',
  '2023-03-27', '2023-04-05', '2023-06-28', '2023-09-25', '2023-11-30', '2023-12-27',
  '2024-02-26', '2024-03-11', '2024-03-19', '2024-06-20', '2024-09-13', '2024-09-20',
  '2024-11-12', '2024-11-18', '2024-11-25', '2024-12-02', '2024-12-09', '2024-12-16',
  '2024-12-23', '2024-12-30',
]);

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('Investigating unparsed BTC-mentioning 8-Ks...\n');
  
  const unparsed = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2020-08-01' || recent.filingDate[i] > '2024-12-31') continue;
    if (parsedDates.has(recent.filingDate[i])) continue;
    
    const raw = await fetch8K(recent.accessionNumber[i]);
    if (!raw) continue;
    
    const clean = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
    
    if (clean.toLowerCase().includes('bitcoin')) {
      unparsed.push({
        date: recent.filingDate[i],
        acc: recent.accessionNumber[i],
        content: clean,
      });
    }
    
    await new Promise(r => setTimeout(r, 150));
  }
  
  console.log(`Found ${unparsed.length} unparsed BTC-mentioning 8-Ks\n`);
  
  for (const filing of unparsed) {
    console.log('='.repeat(80));
    console.log(`${filing.date} (${filing.acc})`);
    console.log('='.repeat(80));
    
    const content = filing.content.toLowerCase();
    
    // Categorize
    const categories = [];
    if (content.includes('convertible') || content.includes('notes')) categories.push('DEBT');
    if (content.includes('offering')) categories.push('OFFERING');
    if (content.includes('purchase') && content.includes('bitcoin')) categories.push('PURCHASE?');
    if (content.includes('sold') || content.includes('sale')) categories.push('SALE?');
    if (content.includes('stock split')) categories.push('SPLIT');
    if (content.includes('atm') || content.includes('at-the-market')) categories.push('ATM');
    
    console.log(`Categories: ${categories.join(', ') || 'UNKNOWN'}`);
    
    // Find bitcoin context
    const btcIdx = content.indexOf('bitcoin');
    const context = filing.content.slice(Math.max(0, btcIdx - 100), btcIdx + 600);
    console.log(`\nContext:\n${context}\n`);
  }
}

run().catch(console.error);
