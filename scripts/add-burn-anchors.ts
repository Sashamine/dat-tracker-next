/**
 * Add operating-burn anchors to 10-Q and 10-K filings
 * Targets the "Net cash used in operating activities" line in cash flow statements
 */

import * as fs from 'fs';
import * as path from 'path';

const SEC_DIR = path.join(__dirname, '../data/sec/mstr');
const FILING_TYPES = ['10q', '10k'];

// Search patterns for operating cash flow line
const SEARCH_PATTERNS = [
  'Net cash used in operating activities',
  'Net cash provided by (used in) operating activities',
  'Net cash provided by operating activities',
];

function addAnchorToFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if anchor already exists
  if (content.includes('id="operating-burn"')) {
    console.log(`  ⏭️  ${path.basename(filePath)}: anchor already exists`);
    return false;
  }
  
  // Try each search pattern
  for (const pattern of SEARCH_PATTERNS) {
    const idx = content.indexOf(pattern);
    if (idx === -1) continue;
    
    // Find the containing <tr> or <td> tag
    let tagStart = -1;
    for (const tag of ['<tr ', '<tr\n', '<td ']) {
      const pos = content.lastIndexOf(tag, idx);
      if (pos !== -1 && (tagStart === -1 || pos > tagStart)) {
        tagStart = pos;
      }
    }
    
    if (tagStart === -1) continue;
    
    // Find the end of the opening tag
    const tagEnd = content.indexOf('>', tagStart);
    if (tagEnd === -1) continue;
    
    // Check if there's already an id
    const tagContent = content.slice(tagStart, tagEnd);
    if (tagContent.includes(' id=')) {
      console.log(`  ⚠️  ${path.basename(filePath)}: tag already has an id`);
      continue;
    }
    
    // Insert id attribute
    const beforeTag = content.slice(0, tagEnd);
    const afterTag = content.slice(tagEnd);
    content = beforeTag + ' id="operating-burn"' + afterTag;
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ ${path.basename(filePath)}: added anchor at "${pattern}"`);
    return true;
  }
  
  console.log(`  ⚠️  ${path.basename(filePath)}: no matching pattern found`);
  return false;
}

console.log('Adding operating-burn anchors to 10-Q and 10-K filings...\n');

let added = 0;
let processed = 0;

for (const type of FILING_TYPES) {
  const dir = path.join(SEC_DIR, type);
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  console.log(`Processing ${type.toUpperCase()} filings (${files.length} files):`);
  
  for (const file of files) {
    processed++;
    if (addAnchorToFile(path.join(dir, file))) {
      added++;
    }
  }
  console.log('');
}

console.log(`Done! Processed ${processed} files, added ${added} anchors.`);
