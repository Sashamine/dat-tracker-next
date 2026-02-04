const fs = require('fs');

let content = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf8');
let tagged = 0;

// Split into lines for easier processing
const lines = content.split('\n');
const newLines = lines.map(line => {
  // Skip if already has sourceType
  if (line.includes('sourceType')) return line;
  
  // Skip if not a data line
  if (!line.includes('date:') || !line.includes('holdings:')) return line;
  
  let sourceType = null;
  
  // Check for SEC filing patterns (10-Q, 10-K, 8-K, Q1-Q4, FY, Annual)
  if (/10-[QK]|8-K/i.test(line)) {
    sourceType = 'sec-filing';
  }
  // Q1/Q2/Q3/Q4 followed by year are typically SEC quarterly filings
  else if (/Q[1-4]\s*20\d{2}/i.test(line)) {
    sourceType = 'sec-filing';
  }
  // FY or Annual reports are SEC filings
  else if (/FY\s*20\d{2}|Annual/i.test(line)) {
    sourceType = 'sec-filing';
  }
  // Check for press release
  else if (/press release/i.test(line)) {
    sourceType = 'press-release';
  }
  // Initial purchase or announcement patterns
  else if (/Initial|announcement/i.test(line)) {
    sourceType = 'press-release';
  }
  // Estimated or Est patterns are company-reported
  else if (/\best\b|estimated/i.test(line)) {
    sourceType = 'company-reported';
  }
  // Check for company-reported patterns
  else if (/company|website|dashboard/i.test(line)) {
    sourceType = 'company-reported';
  }
  
  if (sourceType && (line.includes('},') || line.endsWith('}'))) {
    tagged++;
    // Insert sourceType before the closing brace
    return line.replace(/(\s*\},?)$/, `, sourceType: "${sourceType}"$1`);
  }
  
  return line;
});

fs.writeFileSync('src/lib/data/holdings-history.ts', newLines.join('\n'));
console.log(`Tagged ${tagged} entries`);
