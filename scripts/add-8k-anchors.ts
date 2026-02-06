/**
 * Add btc-holdings anchors to specific cited 8-K filings
 */

import * as fs from 'fs';
import * as path from 'path';

const SEC_DIR = path.join(__dirname, '../data/sec/mstr/8k');

// Files to update with their search patterns
const FILES_TO_UPDATE = [
  {
    file: '8k-2020-09-14-244732.html',
    searchPattern: 'bitcoin serving as the primary treasury reserve asset',
    description: 'Initial BTC purchase announcement'
  },
  {
    file: '8k-2024-11-18-260452.html', 
    searchPattern: 'Total Bitcoin Holdings',
    description: '331,200 BTC holdings'
  },
  {
    file: '8k-2026-01-05-001550.html',
    searchPattern: 'BTC Updates',
    description: '672,500 BTC holdings'
  },
  {
    file: '8k-2026-01-05.html',
    searchPattern: 'BTC Updates', 
    description: '672,500 BTC holdings (alt)'
  },
  {
    file: '8k-2026-01-12-009811.html',
    searchPattern: 'BTC Update<',
    description: 'Jan 12 BTC update'
  },
  {
    file: '8k-2026-01-12.html',
    searchPattern: 'BTC Update<',
    description: 'Jan 12 BTC update (alt)'
  },
  {
    file: '8k-2026-01-20-016002.html',
    searchPattern: 'BTC Update<',
    description: 'Jan 20 BTC update'  
  },
  {
    file: '8k-2026-01-20.html',
    searchPattern: 'BTC Update<',
    description: 'Jan 20 BTC update (alt)'
  },
  {
    file: '8k-2026-01-26-021726.html',
    searchPattern: 'BTC Update<',
    description: 'Jan 26 BTC update'
  },
  {
    file: '8k-2026-01-26.html', 
    searchPattern: 'BTC Update<',
    description: 'Jan 26 BTC update (alt)'
  },
  {
    file: '8k-2026-02-02-032731.html',
    searchPattern: 'BTC Update<',
    description: 'Feb 2 BTC update'
  },
  {
    file: '8k-2026-02-02.html',
    searchPattern: 'BTC Update<', 
    description: 'Feb 2 BTC update (alt)'
  },
  // Additional 8-Ks with BTC updates (not in holdings-history but linked from filings)
  {
    file: '8k-2025-11-03-261714.html',
    searchPattern: 'BTC Update<',
    description: 'Nov 3 2025 BTC update'
  },
  {
    file: '8k-2025-11-03a.html',
    searchPattern: 'BTC Update<',
    description: 'Nov 3 2025 BTC update (a)'
  },
  {
    file: '8k-2025-11-03b.html',
    searchPattern: 'BTC Update<',
    description: 'Nov 3 2025 BTC update (b)'
  },
];

function addAnchorToFile(filename: string, searchPattern: string): boolean {
  const filePath = path.join(SEC_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  File not found: ${filename}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if anchor already exists
  if (content.includes('id="btc-holdings"')) {
    console.log(`  ⏭️  ${filename}: anchor already exists`);
    return false;
  }
  
  // Find the pattern
  const idx = content.indexOf(searchPattern);
  if (idx === -1) {
    console.log(`  ⚠️  ${filename}: pattern "${searchPattern}" not found`);
    return false;
  }
  
  // Find the containing <p>, <tr>, or <td> tag
  let tagStart = -1;
  for (const tag of ['<p ', '<tr ', '<td ', '<div ']) {
    const pos = content.lastIndexOf(tag, idx);
    if (pos !== -1 && (tagStart === -1 || pos > tagStart)) {
      tagStart = pos;
    }
  }
  
  if (tagStart === -1) {
    console.log(`  ⚠️  ${filename}: no containing tag found`);
    return false;
  }
  
  // Find the end of the opening tag
  const tagEnd = content.indexOf('>', tagStart);
  if (tagEnd === -1) {
    console.log(`  ⚠️  ${filename}: malformed tag`);
    return false;
  }
  
  // Check if there's already an id
  const tagContent = content.slice(tagStart, tagEnd);
  if (tagContent.includes(' id=')) {
    // Replace existing id or add after it
    console.log(`  ⚠️  ${filename}: tag already has an id, skipping`);
    return false;
  }
  
  // Insert id attribute
  const beforeTag = content.slice(0, tagEnd);
  const afterTag = content.slice(tagEnd);
  content = beforeTag + ' id="btc-holdings"' + afterTag;
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✅ ${filename}: added anchor`);
  return true;
}

console.log('Adding btc-holdings anchors to cited 8-K filings...\n');

let added = 0;
for (const { file, searchPattern, description } of FILES_TO_UPDATE) {
  console.log(`Processing: ${file} (${description})`);
  if (addAnchorToFile(file, searchPattern)) {
    added++;
  }
}

console.log(`\nDone! Added ${added} anchors.`);
