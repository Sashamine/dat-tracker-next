/**
 * Test text extraction from MSTR 8-K
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const R2_BASE_URL = "https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev";
const R2_PREFIXES = ["new-uploads", "batch1", "batch2", "batch3", "batch4", "batch5", "batch6"];

// Recent MSTR 8-Ks with BTC updates
const TEST_8KS = [
  { accession: "0001193125-26-022803", date: "2026-02-03", desc: "Feb 2026 BTC Update" },
  { accession: "0001193125-26-014261", date: "2026-01-21", desc: "Jan 2026 BTC Update" },
  { accession: "0001193125-26-006236", date: "2026-01-06", desc: "Jan 2026 BTC Update" },
];

// Text extraction patterns
const PATTERNS = {
  holdings: {
    anchor: "Aggregate BTC Holdings",
    patterns: [
      /(\d{1,3}(?:,\d{3})*)\s*(?:BTC|bitcoin)/i,
      /Aggregate BTC Holdings[^\d]*(\d{1,3}(?:,\d{3})*)/i,
      /(?:holds?|holding|acquired)[^\d]*(\d{1,3}(?:,\d{3})*)\s*(?:BTC|bitcoin)/i,
    ]
  },
  totalCost: {
    anchor: "Aggregate Purchase Price",
    patterns: [
      /Aggregate Purchase Price[^\d]*\$?([\d.]+)\s*billion/i,
      /approximately \$?([\d.]+)\s*billion/i,
      /\$?([\d.]+)\s*billion[^\n]*(?:cost|purchase|spent)/i,
    ]
  },
  avgCost: {
    anchor: "Average Purchase Price",
    patterns: [
      /Average Purchase Price[^\d]*\$?([\d,]+)/i,
      /average[^\d]*\$?([\d,]+)\s*per\s*(?:BTC|bitcoin)/i,
    ]
  }
};

async function fetchFromR2(ticker, accession) {
  // Try with and without uppercase ticker
  const tickers = [ticker.toLowerCase(), ticker.toUpperCase()];
  
  for (const t of tickers) {
    for (const prefix of R2_PREFIXES) {
      const url = `${R2_BASE_URL}/${prefix}/${t}/${accession}.txt`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          console.log(`  ✓ Found: ${prefix}/${t}/${accession}`);
          return await res.text();
        }
      } catch {}
    }
  }
  return null;
}

function extractQuote(text, matchIndex, matchLength, contextChars = 100) {
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + matchLength + contextChars);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function extractMetrics(text) {
  const results = {};
  
  // Clean text (remove HTML tags if present)
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  
  for (const [metric, config] of Object.entries(PATTERNS)) {
    // First, find anchor location
    const anchorIndex = cleanText.toLowerCase().indexOf(config.anchor.toLowerCase());
    
    if (anchorIndex === -1) {
      results[metric] = { found: false, reason: `Anchor "${config.anchor}" not found` };
      continue;
    }
    
    // Search near the anchor
    const searchStart = Math.max(0, anchorIndex - 200);
    const searchEnd = Math.min(cleanText.length, anchorIndex + 500);
    const searchRegion = cleanText.slice(searchStart, searchEnd);
    
    // Try each pattern
    for (const pattern of config.patterns) {
      const match = searchRegion.match(pattern);
      if (match) {
        const rawValue = match[1];
        let value;
        
        if (metric === 'totalCost') {
          value = parseFloat(rawValue) * 1_000_000_000;
        } else if (metric === 'avgCost') {
          value = parseFloat(rawValue.replace(/,/g, ''));
        } else {
          value = parseInt(rawValue.replace(/,/g, ''), 10);
        }
        
        results[metric] = {
          found: true,
          value,
          rawValue,
          anchor: config.anchor,
          quote: extractQuote(cleanText, anchorIndex, config.anchor.length, 150),
          pattern: pattern.toString()
        };
        break;
      }
    }
    
    if (!results[metric]) {
      results[metric] = { 
        found: false, 
        reason: 'No pattern matched',
        searchRegion: searchRegion.slice(0, 300) + '...'
      };
    }
  }
  
  return results;
}

async function run() {
  console.log("=".repeat(70));
  console.log("Testing 8-K Text Extraction for MSTR");
  console.log("=".repeat(70));
  
  for (const filing of TEST_8KS) {
    console.log();
    console.log(`\n${"─".repeat(70)}`);
    console.log(`8-K: ${filing.accession} (${filing.date})`);
    console.log(`Desc: ${filing.desc}`);
    console.log("─".repeat(70));
    
    // Fetch from R2
    console.log("Fetching from R2...");
    const content = await fetchFromR2("MSTR", filing.accession);
    
    if (!content) {
      console.log("  ✗ Not found in R2");
      continue;
    }
    
    console.log(`  Content length: ${content.length.toLocaleString()} chars`);
    
    // Extract
    const extracted = extractMetrics(content);
    
    console.log("\nExtracted:");
    for (const [metric, result] of Object.entries(extracted)) {
      if (result.found) {
        console.log(`  ✓ ${metric}: ${result.value.toLocaleString()}`);
        console.log(`    Raw: "${result.rawValue}"`);
        console.log(`    Quote: "...${result.quote.slice(0, 100)}..."`);
      } else {
        console.log(`  ✗ ${metric}: ${result.reason}`);
        if (result.searchRegion) {
          console.log(`    Search region: "${result.searchRegion.slice(0, 150)}..."`);
        }
      }
    }
  }
}

run().catch(console.error);
