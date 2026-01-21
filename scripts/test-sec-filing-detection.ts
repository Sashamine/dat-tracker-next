/**
 * Test SEC 8-K filing detection (no LLM needed)
 *
 * This tests just the filing detection part of the adapter.
 */

import { searchFilingDocuments, TICKER_TO_CIK } from '../src/lib/monitoring/sources/sec-edgar';

async function fetchSECSubmissions(cik: string): Promise<any> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status}`);
  }

  return response.json();
}

async function main() {
  const ticker = process.argv[2] || 'MSTR';
  const cik = TICKER_TO_CIK[ticker.toUpperCase()];

  if (!cik) {
    console.error(`No CIK found for ${ticker}`);
    console.log('Available tickers:', Object.keys(TICKER_TO_CIK).join(', '));
    process.exit(1);
  }

  console.log(`Testing SEC filing detection for ${ticker} (CIK: ${cik})`);
  console.log('='.repeat(60));

  // Fetch recent filings
  console.log('\nFetching SEC submissions...');
  const data = await fetchSECSubmissions(cik);

  if (!data?.filings?.recent) {
    console.error('No filings data found');
    process.exit(1);
  }

  const recent = data.filings.recent;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 60); // Last 60 days
  const sinceDateStr = sinceDate.toISOString().split('T')[0];

  console.log(`\nLooking for 8-K filings since ${sinceDateStr}...`);

  // Find 8-K filings
  const eightKFilings: Array<{ accessionNumber: string; filingDate: string }> = [];
  const count = Math.min(recent.form.length, 50);

  for (let i = 0; i < count; i++) {
    const formType = recent.form[i];
    const filingDate = recent.filingDate[i];

    if (formType === '8-K' && filingDate >= sinceDateStr) {
      eightKFilings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate,
      });
    }
  }

  console.log(`Found ${eightKFilings.length} 8-K filings\n`);

  if (eightKFilings.length === 0) {
    console.log('No recent 8-K filings found.');
    return;
  }

  // Check each filing for crypto content
  console.log('Checking filings for crypto content...');
  console.log('-'.repeat(60));

  let foundCryptoContent = false;
  const asset = ticker === 'SBET' ? 'ETH' : 'BTC'; // Simple asset detection

  for (const filing of eightKFilings.slice(0, 5)) {
    console.log(`\n${filing.filingDate} - ${filing.accessionNumber}`);

    const result = await searchFilingDocuments(ticker, cik, filing.accessionNumber, asset);

    if (result) {
      console.log(`  ✓ Found crypto content!`);
      console.log(`  URL: ${result.documentUrl}`);
      console.log(`  Content preview: ${result.content.substring(0, 200)}...`);
      foundCryptoContent = true;
    } else {
      console.log(`  ✗ No crypto content found`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log(foundCryptoContent
    ? '✓ SEC filing detection is working - found crypto content in 8-K filings'
    : '✗ No crypto content found in recent 8-K filings'
  );
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
