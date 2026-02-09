/**
 * Check all 424B5 filings to understand ATM structure
 */

const CIK = '1050446';

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  console.log('All 424B5 filings since 2020:\n');
  
  let count = 0;
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== '424B5') continue;
    if (recent.filingDate[i] < '2020-08-01') continue;
    
    count++;
    console.log(`${recent.filingDate[i]} - ${recent.accessionNumber[i]}`);
    console.log(`  Description: ${recent.primaryDocument[i]}`);
  }
  
  console.log(`\nTotal: ${count} 424B5 filings`);
  
  // ATM programs are typically announced via 8-K then supplemented via 424B5
  // Let's check the 8-Ks for ATM program announcements
  console.log('\n\n8-Ks mentioning ATM programs:\n');
  
  for (let i = 0; i < recent.form.length && i < 500; i++) {
    if (recent.form[i] !== '8-K') continue;
    if (recent.filingDate[i] < '2023-01-01') continue;
    
    // Check description
    const desc = recent.primaryDocument[i]?.toLowerCase() || '';
    if (desc.includes('atm') || desc.includes('market')) {
      console.log(`${recent.filingDate[i]} - ${recent.primaryDocument[i]}`);
    }
  }
}

run().catch(console.error);
