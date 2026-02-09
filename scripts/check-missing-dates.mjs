/**
 * Check all filings on the missing dates
 */

const CIK = '1050446';

async function run() {
  const subUrl = 'https://data.sec.gov/submissions/CIK0001050446.json';
  const subRes = await fetch(subUrl, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const subData = await subRes.json();
  
  const recent = subData.filings.recent;
  
  const missingDates = ['2025-10-06', '2025-08-04', '2025-07-28', '2025-07-07'];
  
  console.log('Filings on missing dates:\n');
  
  for (const date of missingDates) {
    console.log(`${date}:`);
    let found = false;
    
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.filingDate[i] === date) {
        console.log(`  ${recent.form[i]} - ${recent.accessionNumber[i]}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log('  No filings');
    }
    console.log();
  }
}

run().catch(console.error);
