#!/usr/bin/env node
/**
 * Get RIOT filings for historical data entries
 */

const CIK = '0001167419';

async function main() {
  const url = `https://data.sec.gov/submissions/CIK${CIK}.json`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'DAT-Tracker' } });
  const data = await resp.json();
  
  const filings = data.filings.recent;
  
  // Entries we need to find filings for
  const needed = [
    { date: '2022-12-31', type: '10-K', period: '2022' },
    { date: '2023-12-31', type: '10-K', period: '2023' },
    { date: '2024-03-31', type: '10-Q', period: 'Q1 2024' },
    { date: '2024-06-30', type: '10-Q', period: 'Q2 2024' },
    { date: '2024-09-30', type: '10-Q', period: 'Q3 2024' },
    { date: '2024-12-31', type: '10-K', period: '2024' },
    { date: '2025-03-31', type: '10-Q', period: 'Q1 2025' },
    { date: '2025-06-30', type: '10-Q', period: 'Q2 2025' },
    { date: '2025-09-30', type: '10-Q', period: 'Q3 2025' },
  ];
  
  console.log('RIOT Filing Mapping:\n');
  
  for (const need of needed) {
    // Find matching filing
    for (let i = 0; i < filings.form.length; i++) {
      const form = filings.form[i];
      const reportDate = filings.reportDate?.[i];
      
      if (form === need.type && reportDate === need.date) {
        console.log(`${need.date} (${need.period}):`);
        console.log(`  Form: ${form}`);
        console.log(`  Filed: ${filings.filingDate[i]}`);
        console.log(`  Accession: ${filings.accessionNumber[i]}`);
        console.log(`  Primary: ${filings.primaryDocument[i]}`);
        console.log('');
        break;
      }
    }
  }
}

main().catch(console.error);
