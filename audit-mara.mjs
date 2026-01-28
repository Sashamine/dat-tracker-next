// MARA SEC Filing Audit
const CIK = '0001507605';

const response = await fetch(`https://data.sec.gov/submissions/CIK${CIK}.json`, {
  headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
});
const data = await response.json();

console.log('Company:', data.name);
console.log('CIK:', data.cik);
console.log('');

// Count filings by type
const filings = data.filings.recent;
const counts = {};
filings.form.forEach(f => { counts[f] = (counts[f] || 0) + 1; });

console.log('Filing Counts:');
['10-K', '10-Q', '8-K', '8-K/A'].forEach(type => {
  if (counts[type]) console.log(`  ${type}: ${counts[type]}`);
});

// List recent 10-K and 10-Q filings
console.log('\nRecent 10-K/10-Q Filings:');
for (let i = 0; i < filings.form.length && i < 100; i++) {
  const form = filings.form[i];
  if (form === '10-K' || form === '10-Q') {
    const date = filings.filingDate[i];
    const accession = filings.accessionNumber[i];
    console.log(`  ${date} | ${form.padEnd(5)} | ${accession}`);
  }
}

// Count 8-Ks by year
console.log('\n8-K Filings by Year:');
const eightKsByYear = {};
for (let i = 0; i < filings.form.length; i++) {
  if (filings.form[i] === '8-K') {
    const year = filings.filingDate[i].substring(0, 4);
    eightKsByYear[year] = (eightKsByYear[year] || 0) + 1;
  }
}
Object.entries(eightKsByYear).sort((a,b) => b[0].localeCompare(a[0])).forEach(([year, count]) => {
  console.log(`  ${year}: ${count} 8-Ks`);
});

// Check XBRL data availability
console.log('\n--- Checking XBRL Data ---');
const xbrlResponse = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`, {
  headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
});
const xbrlData = await xbrlResponse.json();

// Check for crypto-related fields
const gaap = xbrlData.facts?.['us-gaap'] || {};
const cryptoFields = Object.keys(gaap).filter(k => 
  k.toLowerCase().includes('crypto') || 
  k.toLowerCase().includes('digital') ||
  k.toLowerCase().includes('bitcoin')
);
console.log('Crypto-related XBRL fields:', cryptoFields.length > 0 ? cryptoFields.join(', ') : 'None found');

// Check shares outstanding
const shares = xbrlData.facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares || [];
const latestShares = shares.filter(e => ['10-K','10-Q'].includes(e.form)).sort((a,b) => b.end.localeCompare(a.end))[0];
console.log('\nLatest Shares (XBRL):', latestShares?.val?.toLocaleString(), 'as of', latestShares?.end);

// Check diluted shares
const diluted = gaap.WeightedAverageNumberOfDilutedSharesOutstanding?.units?.shares || [];
const latestDiluted = diluted.filter(e => ['10-K','10-Q'].includes(e.form)).sort((a,b) => b.end.localeCompare(a.end))[0];
console.log('Latest Diluted Shares (XBRL):', latestDiluted?.val?.toLocaleString(), 'as of', latestDiluted?.end);

// Check for digital assets
const digitalAssets = gaap.DigitalAssets?.units?.USD || gaap.DigitalAssetsFairValue?.units?.USD || [];
if (digitalAssets.length > 0) {
  const latest = digitalAssets.filter(e => ['10-K','10-Q'].includes(e.form)).sort((a,b) => b.end.localeCompare(a.end))[0];
  console.log('Digital Assets (XBRL):', latest ? `$${(latest.val/1e6).toFixed(2)}M as of ${latest.end}` : 'N/A');
}
