/**
 * Extract MARA SEC XBRL History
 * 
 * Pulls all quarterly data from SEC XBRL API for MARA Holdings
 * Output: Structured data for mara-sec-history.ts
 */

const CIK = '0001507605';

async function fetchXBRL() {
  console.log('Fetching MARA XBRL data from SEC...\n');
  
  const response = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${CIK}.json`, {
    headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
  });
  
  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status}`);
  }
  
  return response.json();
}

function extractQuarterlyData(xbrl) {
  const gaap = xbrl.facts?.['us-gaap'] || {};
  const dei = xbrl.facts?.['dei'] || {};
  
  // Fields to extract
  const fields = {
    // Shares
    basicShares: dei.EntityCommonStockSharesOutstanding?.units?.shares || [],
    dilutedShares: gaap.WeightedAverageNumberOfDilutedSharesOutstanding?.units?.shares || [],
    
    // Crypto assets
    cryptoFairValue: gaap.CryptoAssetFairValue?.units?.USD || [],
    cryptoFairValueCurrent: gaap.CryptoAssetFairValueCurrent?.units?.USD || [],
    cryptoCost: gaap.CryptoAssetCost?.units?.USD || [],
    cryptoMining: gaap.CryptoAssetMining?.units?.USD || [],
    cryptoPurchase: gaap.CryptoAssetPurchase?.units?.USD || [],
    
    // Balance sheet
    cash: gaap.CashAndCashEquivalentsAtCarryingValue?.units?.USD || [],
    totalAssets: gaap.Assets?.units?.USD || [],
    
    // Debt
    longTermDebt: gaap.LongTermDebt?.units?.USD || [],
    convertibleNotes: gaap.ConvertibleNotesPayable?.units?.USD || [],
    totalDebt: gaap.DebtCurrent?.units?.USD || [],
    
    // Income
    revenue: gaap.Revenues?.units?.USD || [],
    netIncome: gaap.NetIncomeLoss?.units?.USD || [],
  };
  
  // Get unique quarter-end dates from 10-K and 10-Q filings
  const quarterEnds = new Set();
  
  Object.values(fields).forEach(entries => {
    entries.forEach(e => {
      if (['10-K', '10-Q', '10-K/A', '10-Q/A'].includes(e.form)) {
        quarterEnds.add(e.end);
      }
    });
  });
  
  // Sort dates descending
  const sortedDates = Array.from(quarterEnds).sort((a, b) => b.localeCompare(a));
  
  console.log(`Found ${sortedDates.length} quarter-end dates\n`);
  
  // Extract data for each quarter
  const quarters = [];
  
  for (const date of sortedDates) {
    const quarter = { date };
    
    // Helper to get value for a date
    const getValue = (entries, preferredForms = ['10-Q', '10-K']) => {
      const matching = entries
        .filter(e => e.end === date && preferredForms.some(f => e.form.startsWith(f)))
        .sort((a, b) => b.filed.localeCompare(a.filed)); // Most recent filing first
      return matching[0]?.val;
    };
    
    // Extract each field
    quarter.basicShares = getValue(fields.basicShares);
    quarter.dilutedShares = getValue(fields.dilutedShares);
    quarter.cryptoFairValue = getValue(fields.cryptoFairValue);
    quarter.cryptoFairValueCurrent = getValue(fields.cryptoFairValueCurrent);
    quarter.cryptoCost = getValue(fields.cryptoCost);
    quarter.cash = getValue(fields.cash);
    quarter.longTermDebt = getValue(fields.longTermDebt);
    quarter.convertibleNotes = getValue(fields.convertibleNotes);
    quarter.revenue = getValue(fields.revenue);
    quarter.netIncome = getValue(fields.netIncome);
    
    // Only include quarters with meaningful data
    if (quarter.basicShares || quarter.cryptoFairValue || quarter.cash) {
      quarters.push(quarter);
    }
  }
  
  return quarters;
}

function formatOutput(quarters) {
  console.log('='.repeat(80));
  console.log('MARA SEC XBRL Quarterly History');
  console.log('='.repeat(80));
  console.log('');
  
  // Table header
  console.log('Date       | Basic Shares  | Diluted Shares | Crypto FV      | Cash           | Debt');
  console.log('-'.repeat(95));
  
  quarters.slice(0, 20).forEach(q => {
    const basic = q.basicShares ? (q.basicShares / 1e6).toFixed(1) + 'M' : 'N/A';
    const diluted = q.dilutedShares ? (q.dilutedShares / 1e6).toFixed(1) + 'M' : 'N/A';
    const crypto = q.cryptoFairValue ? '$' + (q.cryptoFairValue / 1e6).toFixed(1) + 'M' : 
                   (q.cryptoFairValueCurrent ? '$' + (q.cryptoFairValueCurrent / 1e6).toFixed(1) + 'M' : 'N/A');
    const cash = q.cash ? '$' + (q.cash / 1e6).toFixed(1) + 'M' : 'N/A';
    const debt = q.longTermDebt ? '$' + (q.longTermDebt / 1e6).toFixed(1) + 'M' : 
                 (q.convertibleNotes ? '$' + (q.convertibleNotes / 1e6).toFixed(1) + 'M' : 'N/A');
    
    console.log(`${q.date} | ${basic.padStart(12)} | ${diluted.padStart(14)} | ${crypto.padStart(14)} | ${cash.padStart(14)} | ${debt}`);
  });
  
  console.log('');
  console.log('='.repeat(80));
  console.log('TypeScript Output for mara-sec-history.ts:');
  console.log('='.repeat(80));
  console.log('');
  
  // Generate TypeScript
  console.log('export const MARA_SEC_HISTORY: SecQuarterlySnapshot[] = [');
  
  quarters.slice(0, 20).forEach(q => {
    const parts = [];
    parts.push(`date: "${q.date}"`);
    if (q.basicShares) parts.push(`basicShares: ${q.basicShares.toLocaleString().replace(/,/g, '_')}`);
    if (q.dilutedShares) parts.push(`dilutedShares: ${q.dilutedShares.toLocaleString().replace(/,/g, '_')}`);
    if (q.cryptoFairValue) parts.push(`cryptoFairValue: ${q.cryptoFairValue.toLocaleString().replace(/,/g, '_')}`);
    if (q.cryptoFairValueCurrent) parts.push(`cryptoFairValueCurrent: ${q.cryptoFairValueCurrent.toLocaleString().replace(/,/g, '_')}`);
    if (q.cryptoCost) parts.push(`cryptoCost: ${q.cryptoCost.toLocaleString().replace(/,/g, '_')}`);
    if (q.cash) parts.push(`cash: ${q.cash.toLocaleString().replace(/,/g, '_')}`);
    if (q.longTermDebt) parts.push(`longTermDebt: ${q.longTermDebt.toLocaleString().replace(/,/g, '_')}`);
    if (q.convertibleNotes) parts.push(`convertibleNotes: ${q.convertibleNotes.toLocaleString().replace(/,/g, '_')}`);
    
    console.log(`  { ${parts.join(', ')} },`);
  });
  
  console.log('];');
}

// Main
const xbrl = await fetchXBRL();
const quarters = extractQuarterlyData(xbrl);
formatOutput(quarters);
