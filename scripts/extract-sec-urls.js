/**
 * Extract SEC Source URLs for Audit
 */

const fs = require('fs');
const path = require('path');

// Read companies.ts
const companiesPath = path.join(__dirname, '../src/lib/data/companies.ts');
const companiesContent = fs.readFileSync(companiesPath, 'utf-8');

// Map of source URL fields to their corresponding value fields
const urlToValueMap = {
  'holdingsSourceUrl': 'holdings',
  'sharesSourceUrl': 'sharesForMnav',
  'burnSourceUrl': 'quarterlyBurnUsd',
  'cashSourceUrl': 'cashReserves',
  'debtSourceUrl': 'totalDebt',
  'costBasisSourceUrl': 'costBasisAvg',
  'stakingSourceUrl': 'stakingPct',
  'capitalRaisedAtmSourceUrl': 'capitalRaisedAtm',
  'capitalRaisedPipeSourceUrl': 'capitalRaisedPipe',
  'capitalRaisedConvertsSourceUrl': 'capitalRaisedConverts',
  'preferredSourceUrl': 'preferredEquity',
  'cashObligationsSourceUrl': 'cashObligationsAnnual',
};

const results = [];

// For each URL field type, find all instances
for (const [urlField, valueField] of Object.entries(urlToValueMap)) {
  // Match pattern: urlField: "url"
  const urlRegex = new RegExp(`${urlField}:\\s*["'\`]([^"'\`]+)["'\`]`, 'g');
  
  let match;
  while ((match = urlRegex.exec(companiesContent)) !== null) {
    const url = match[1];
    
    // Only process SEC URLs (sec.gov or /filings/)
    if (!url.includes('sec.gov') && !url.includes('/filings/')) {
      continue;
    }
    
    // Find the company context - look backward for ticker
    const beforeUrl = companiesContent.substring(0, match.index);
    const lines = beforeUrl.split('\n');
    let ticker = 'UNKNOWN';
    let company = 'UNKNOWN';
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const tickerMatch = lines[i].match(/ticker:\s*["']([^"']+)["']/);
      if (tickerMatch) {
        ticker = tickerMatch[1];
        break;
      }
    }
    
    for (let i = lines.length - 1; i >= 0; i--) {
      const nameMatch = lines[i].match(/name:\s*["']([^"']+)["']/);
      if (nameMatch) {
        company = nameMatch[1];
        break;
      }
    }
    
    // Find corresponding value - search backward in same block
    let citedValue = null;
    
    // Find the start of this company block (last occurrence of "id:")
    const blockStart = beforeUrl.lastIndexOf('id:');
    if (blockStart !== -1) {
      const blockContent = beforeUrl.substring(blockStart);
      const valueRegex = new RegExp(`${valueField}:\\s*([^,\\n]+)`);
      const valueMatch = blockContent.match(valueRegex);
      if (valueMatch) {
        citedValue = valueMatch[1].trim();
      }
    }
    
    results.push({
      company,
      ticker,
      field: urlField,
      url,
      citedValue,
      valueField,
      source: 'companies.ts',
    });
  }
}

// Output results
console.log(JSON.stringify(results, null, 2));
console.error(`\nTotal SEC URLs found: ${results.length}`);
