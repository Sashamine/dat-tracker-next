/**
 * Check the 2022-03-29 Silvergate loan filing
 */

async function run() {
  const acc = '0001193125-22-087494';
  const cik = '1050446';
  const accClean = acc.replace(/-/g, '');
  
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/index.json`;
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const index = await res.json();
  
  const doc = index.directory.item.find(d => d.name.endsWith('.htm') && !d.name.includes('ex'));
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const raw = await docRes.text();
  const content = raw.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  console.log('2022-03-29 Silvergate Loan Filing:');
  console.log('='.repeat(70));
  
  // Look for loan amount
  const loanIdx = content.toLowerCase().indexOf('loan');
  if (loanIdx > 0) {
    console.log(content.slice(Math.max(0, loanIdx - 50), loanIdx + 800));
  }
  
  // Look for specific amounts
  const amountMatch = content.match(/\$([\d,.]+) (million|billion)/gi);
  if (amountMatch) {
    console.log('\nAmounts mentioned:', amountMatch.join(', '));
  }
}

run().catch(console.error);
