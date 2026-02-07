const fs = require('fs');
const content = fs.readFileSync('src/lib/data/companies.ts', 'utf8');

// Extract company blocks
const companyRegex = /{\s*id:\s*["']([^"']+)["'][^}]*?ticker:\s*["']([^"']+)["'][^}]*?}/gs;

// Find all sourceUrl fields with their context
const urlRegex = /(\w+Source):\s*["']([^"']+)["'],?\s*\n\s*(\w+SourceUrl):\s*["']([^"']+)["']/g;

const issues = [];
let match;

// Reset and find patterns
const lines = content.split('\n');
let currentTicker = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track current ticker
  const tickerMatch = line.match(/ticker:\s*["']([^"']+)["']/);
  if (tickerMatch) {
    currentTicker = tickerMatch[1];
  }
  
  // Check for sourceUrl fields
  const urlMatch = line.match(/(\w+SourceUrl):\s*["']([^"']+)["']/);
  if (urlMatch && currentTicker) {
    const field = urlMatch[1];
    const url = urlMatch[2];
    
    // Get the description from previous line
    const prevLine = lines[i-1] || '';
    const descMatch = prevLine.match(/(\w+Source):\s*["']([^"']+)["']/);
    const desc = descMatch ? descMatch[2] : 'N/A';
    
    // Check for category errors
    const errors = [];
    
    // Check if URL format is valid SEC archive path
    if (url.includes('sec.gov/Archives/edgar/data')) {
      const accMatch = url.match(/\/(\d{10,})\/([^\/]+)\/?$/);
      if (accMatch) {
        const accession = accMatch[2];
        // Accession should be 18 digits or formatted like 0001234567-XX-XXXXXX
        if (!/^\d{18}$/.test(accession) && !/^\d{10}-\d{2}-\d{6}$/.test(accession)) {
          errors.push('Invalid accession format: ' + accession);
        }
      }
    }
    
    // Check for browse-edgar (search page, not a document)
    if (url.includes('browse-edgar?action=getcompany')) {
      errors.push('Points to search page, not specific document');
    }
    
    // Check for mismatched field vs URL content
    if (field === 'holdingsSourceUrl' && desc.toLowerCase().includes('10-q') && !url.includes('10')) {
      errors.push('Desc says 10-Q but URL might not match');
    }
    
    // Check if URL ends with just a CIK (no accession)
    if (url.match(/edgar\/data\/\d+\/?$/)) {
      errors.push('URL points to company page, not specific filing');
    }
    
    // Check for generic SEDAR landing page
    if (url === 'https://www.sedarplus.ca/landingpage/') {
      errors.push('Generic SEDAR landing page, not specific filing');
    }
    
    if (errors.length > 0) {
      issues.push({
        ticker: currentTicker,
        field,
        desc: desc.substring(0, 60),
        url: url.substring(0, 80),
        errors
      });
    }
  }
}

console.log('=== CATEGORY ERRORS ===\n');
console.log('Found ' + issues.length + ' potential issues:\n');

for (const issue of issues) {
  console.log(issue.ticker + ' | ' + issue.field);
  console.log('  Desc: ' + issue.desc);
  console.log('  URL: ' + issue.url);
  console.log('  Errors: ' + issue.errors.join(', '));
  console.log('');
}
