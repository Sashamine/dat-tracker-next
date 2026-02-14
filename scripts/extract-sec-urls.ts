/**
 * Extract SEC Source URLs for Audit
 * 
 * Scans companies.ts and provenance files to extract all SEC URLs
 * and their corresponding cited values for verification.
 */

import * as fs from 'fs';
import * as path from 'path';

interface SecUrlEntry {
  company: string;
  ticker: string;
  field: string;
  url: string;
  citedValue: string | number | null;
  valueField: string;
  source: 'companies.ts' | string;
}

// Read companies.ts as text to extract URLs
const companiesPath = path.join(__dirname, '../src/lib/data/companies.ts');
const companiesContent = fs.readFileSync(companiesPath, 'utf-8');

// Map of source URL fields to their corresponding value fields
const urlToValueMap: Record<string, string> = {
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

const results: SecUrlEntry[] = [];

// Parse companies from the file
// Find all company blocks
const companyRegex = /\{\s*(?:\/\/[^\n]*\n\s*)*id:\s*"([^"]+)"[^}]*?name:\s*"([^"]+)"[^}]*?ticker:\s*"([^"]+)"[^}]*?\}/gs;

// For each URL field type, find all instances
for (const [urlField, valueField] of Object.entries(urlToValueMap)) {
  // Match pattern: urlField: "url"
  const urlRegex = new RegExp(`${urlField}:\\s*["'\`]([^"'\`]+)["'\`]`, 'g');
  
  let match;
  while ((match = urlRegex.exec(companiesContent)) !== null) {
    const url = match[1];
    
    // Only process SEC URLs
    if (!url.includes('sec.gov') && !url.includes('/filings/')) {
      continue;
    }
    
    // Find the company context (look backward for the nearest id: field)
    const beforeUrl = companiesContent.substring(0, match.index);
    const idMatch = beforeUrl.match(/id:\s*"([^"]+)"[^}]*?name:\s*"([^"]+)"[^}]*?ticker:\s*"([^"]+)"[^}]*$/s);
    
    // Simpler approach: find nearest ticker
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
    
    // Find the corresponding value
    let citedValue: string | number | null = null;
    const afterUrl = companiesContent.substring(0, match.index);
    const valueRegex = new RegExp(`${valueField}:\\s*([^,\\n]+)`, 'g');
    const valueMatches = [...afterUrl.matchAll(valueRegex)];
    if (valueMatches.length > 0) {
      const lastMatch = valueMatches[valueMatches.length - 1];
      citedValue = lastMatch[1].trim();
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

// Output results as JSON
console.log(JSON.stringify(results, null, 2));
console.log(`\n// Total SEC URLs found: ${results.length}`);
