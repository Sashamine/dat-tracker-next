/**
 * Add anchor IDs to SEC filings for proper citation provenance
 * Finds key data sections (BTC holdings, share counts) and adds id attributes
 */

import * as fs from 'fs';
import * as path from 'path';

const MSTR_FILINGS_DIR = path.join(__dirname, '../data/sec/mstr');

interface AnchorConfig {
  // Pattern to find the row/section containing this data
  searchPatterns: string[];
  // ID to add
  anchorId: string;
  // Description for logging
  description: string;
}

const ANCHORS: AnchorConfig[] = [
  {
    searchPatterns: [
      'Approximate number of bitcoins held',
      'number of bitcoins held',
      'NumberOfBitcoinHeld',
    ],
    anchorId: 'btc-holdings',
    description: 'BTC holdings count',
  },
  {
    searchPatterns: [
      'Digital assets carrying value',
      'Digital assets</span>',
    ],
    anchorId: 'digital-assets',
    description: 'Digital assets value',
  },
  {
    searchPatterns: [
      'WeightedAverageNumberOfDilutedSharesOutstanding',
      'Diluted</span>',
      'Diluted shares',
    ],
    anchorId: 'diluted-shares',
    description: 'Diluted shares outstanding',
  },
];

function addAnchorsToFiling(filePath: string): { added: string[]; skipped: string[] } {
  const added: string[] = [];
  const skipped: string[] = [];
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  for (const anchor of ANCHORS) {
    // Check if anchor already exists
    if (content.includes(`id="${anchor.anchorId}"`)) {
      skipped.push(`${anchor.anchorId} (already exists)`);
      continue;
    }
    
    // Find the pattern and add anchor
    for (const pattern of anchor.searchPatterns) {
      const idx = content.indexOf(pattern);
      if (idx !== -1) {
        // Find the containing <tr> or <td> tag
        let tagStart = content.lastIndexOf('<tr', idx);
        if (tagStart === -1) {
          tagStart = content.lastIndexOf('<td', idx);
        }
        if (tagStart === -1) {
          tagStart = content.lastIndexOf('<p', idx);
        }
        
        if (tagStart !== -1) {
          // Find the end of the opening tag
          const tagEnd = content.indexOf('>', tagStart);
          if (tagEnd !== -1) {
            // Insert id attribute before the closing >
            const beforeTag = content.slice(0, tagEnd);
            const afterTag = content.slice(tagEnd);
            
            // Check if there's already an id
            const tagContent = content.slice(tagStart, tagEnd);
            if (!tagContent.includes(' id=')) {
              content = beforeTag + ` id="${anchor.anchorId}"` + afterTag;
              added.push(anchor.anchorId);
              modified = true;
              break;
            }
          }
        }
      }
    }
    
    if (!added.includes(anchor.anchorId) && !skipped.some(s => s.startsWith(anchor.anchorId))) {
      skipped.push(`${anchor.anchorId} (pattern not found)`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return { added, skipped };
}

function processAllFilings() {
  const subDirs = ['10k', '10q', '8k'];
  let totalAdded = 0;
  let totalSkipped = 0;
  
  for (const subDir of subDirs) {
    const dirPath = path.join(MSTR_FILINGS_DIR, subDir);
    if (!fs.existsSync(dirPath)) continue;
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      console.log(`\nProcessing: ${subDir}/${file}`);
      
      const { added, skipped } = addAnchorsToFiling(filePath);
      
      if (added.length > 0) {
        console.log(`  ✅ Added: ${added.join(', ')}`);
        totalAdded += added.length;
      }
      if (skipped.length > 0) {
        console.log(`  ⏭️  Skipped: ${skipped.join(', ')}`);
        totalSkipped += skipped.length;
      }
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Total anchors added: ${totalAdded}`);
  console.log(`Total skipped: ${totalSkipped}`);
}

// Run
processAllFilings();
