const fs = require('fs');

const inputPath = 'C:/Users/edwin/dat-tracker-next/public/sec/mstr/8k/8k-2026-01-26.html';
const outputPath = 'C:/Users/edwin/dat-tracker-next/public/sec/mstr/8k-annotated/8k-2026-01-26.html';

let content = fs.readFileSync(inputPath, 'utf8');

// Add id to ATM Update paragraph - using a more flexible pattern
content = content.replace(
  /<p style="font-size:10pt;margin-top:0;line-height:1\.3225;font-family:Times New Roman;margin-bottom:8pt;text-align:left;"><span style="[^"]*">ATM Update<\/span><\/p>/,
  (match) => match.replace('<p style=', '<p id="dat-atm-sales" style=')
);

// Update BTC holdings id to match our dat- convention
content = content.replace('id="btc-holdings"', 'id="dat-btc-holdings"');

fs.writeFileSync(outputPath, content, 'utf8');

console.log('Annotated file written to:', outputPath);
console.log('Changes made:');
console.log('  - Added id="dat-atm-sales" to ATM Update paragraph');
console.log('  - Changed id="btc-holdings" to id="dat-btc-holdings"');
