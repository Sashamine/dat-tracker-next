/**
 * Debug 8-K structure
 */
const R2_BASE = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

async function run() {
  const url = `${R2_BASE}/batch3/mstr/0001193125-26-021726.txt`;
  const content = await (await fetch(url)).text();
  const clean = content.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  // Find all "As of" sections
  console.log('Looking for table structure...\n');
  
  // The structure should be:
  // "As of [date]" followed by headers: "Aggregate BTC Holdings", "Aggregate Purchase Price (in billions)", "Average Purchase Price"
  // Then the row values
  
  const asOfPattern = /As of (\w+ \d+, 202\d)/g;
  let match;
  while ((match = asOfPattern.exec(clean)) !== null) {
    console.log(`Found "As of ${match[1]}" at position ${match.index}`);
    
    // Get the next 800 chars
    const section = clean.slice(match.index, match.index + 800);
    
    // Look for numbers in this section
    const numbers = section.match(/\d{1,3}(?:,\d{3})+|\d+\.\d+/g);
    console.log('  Numbers found:', numbers?.slice(0, 10));
    console.log();
  }
  
  // Also look for the specific pattern
  const holdingsIdx = clean.lastIndexOf('Aggregate BTC Holdings');
  if (holdingsIdx > 0) {
    console.log('\nLast "Aggregate BTC Holdings" at:', holdingsIdx);
    const after = clean.slice(holdingsIdx, holdingsIdx + 500);
    console.log('After:', after);
  }
}

run().catch(console.error);
