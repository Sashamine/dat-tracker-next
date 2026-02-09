/**
 * Test extraction on a single filing
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// R2 bucket
const R2_BASE_URL = "https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev";
const R2_PREFIXES = ["new-uploads", "batch1", "batch2", "batch3", "batch4", "batch5", "batch6"];

// Test filing
const TEST_FILING = {
  ticker: "MSTR",
  cik: "1050446",
  accession: "0001193125-25-262568",
  filingType: "10-Q",
  filedAt: "2025-11-03"
};

async function fetchFromR2(ticker, accession) {
  for (const prefix of R2_PREFIXES) {
    const url = `${R2_BASE_URL}/${prefix}/${ticker.toLowerCase()}/${accession}.txt`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`✓ Found in R2: ${prefix}/${ticker}/${accession}`);
        return await res.text();
      }
    } catch {
      // Try next
    }
  }
  console.log(`✗ Not found in R2, trying SEC...`);
  return null;
}

async function fetchXBRL(cik, accession) {
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik.padStart(10, "0")}.json`;
  console.log(`Fetching XBRL from SEC: ${url}`);
  
  const res = await fetch(url, {
    headers: { "User-Agent": "DAT-Tracker research@dat-tracker.com" }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch XBRL: ${res.status}`);
  }
  
  const data = await res.json();
  
  // Flatten facts for this accession
  const facts = [];
  for (const [namespace, nsFacts] of Object.entries(data.facts)) {
    for (const [factName, factData] of Object.entries(nsFacts)) {
      const units = factData.units || {};
      for (const [unit, values] of Object.entries(units)) {
        for (const v of values) {
          if (v.accn === accession) {
            facts.push({
              fact: `${namespace}:${factName}`,
              value: v.val,
              unit,
              periodEnd: v.end,
              periodStart: v.start,
              form: v.form
            });
          }
        }
      }
    }
  }
  
  console.log(`✓ Found ${facts.length} XBRL facts for this accession`);
  return facts;
}

// Extraction rules for MSTR
const MSTR_RULES = {
  holdings: {
    xbrl: ["mstr:BitcoinHoldings", "mstr:DigitalAssetsBitcoin"],
    textAnchor: "bitcoin",
  },
  debt: {
    xbrl: ["us-gaap:LongTermDebt"],
    periodType: "instant"
  },
  preferred: {
    xbrl: ["us-gaap:ProceedsFromIssuanceOfPreferredStockAndPreferenceStock"],
    periodType: "duration"
  },
  shares: {
    xbrl: ["us-gaap:WeightedAverageNumberOfSharesOutstandingBasic"],
    periodType: "duration"
  },
  cash: {
    xbrl: ["us-gaap:CashAndCashEquivalentsAtCarryingValue"],
    periodType: "instant"
  }
};

function extractFromXBRL(facts, rules) {
  const results = {};
  
  for (const [metric, rule] of Object.entries(rules)) {
    // Find matching fact
    for (const xbrlFact of (rule.xbrl || [])) {
      const factName = xbrlFact.replace("us-gaap:", "").replace("mstr:", "");
      
      // Find all matching facts
      const matches = facts.filter(f => f.fact.includes(factName));
      
      if (matches.length > 0) {
        // Get the most recent one (by period end)
        const sorted = matches.sort((a, b) => 
          new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
        );
        
        const best = sorted[0];
        results[metric] = {
          value: best.value,
          fact: best.fact,
          periodEnd: best.periodEnd,
          periodStart: best.periodStart,
          unit: best.unit,
          allMatches: matches.length
        };
        break;
      }
    }
  }
  
  return results;
}

async function run() {
  console.log("=".repeat(60));
  console.log("Testing extraction on MSTR Q3 2025 10-Q");
  console.log("Accession:", TEST_FILING.accession);
  console.log("=".repeat(60));
  console.log();
  
  // Step 1: Try to fetch from R2
  console.log("1. Checking R2 cache...");
  const r2Content = await fetchFromR2(TEST_FILING.ticker, TEST_FILING.accession);
  if (r2Content) {
    console.log(`   Content length: ${r2Content.length} chars`);
  }
  console.log();
  
  // Step 2: Fetch XBRL from SEC
  console.log("2. Fetching XBRL facts...");
  const xbrlFacts = await fetchXBRL(TEST_FILING.cik, TEST_FILING.accession);
  console.log();
  
  // Step 3: Extract metrics
  console.log("3. Extracting metrics...");
  const extracted = extractFromXBRL(xbrlFacts, MSTR_RULES);
  console.log();
  
  // Step 4: Display results
  console.log("=".repeat(60));
  console.log("EXTRACTION RESULTS");
  console.log("=".repeat(60));
  
  for (const [metric, data] of Object.entries(extracted)) {
    console.log();
    console.log(`${metric.toUpperCase()}:`);
    console.log(`  Value: ${data.value.toLocaleString()} ${data.unit}`);
    console.log(`  XBRL Fact: ${data.fact}`);
    console.log(`  Period: ${data.periodStart || 'instant'} → ${data.periodEnd}`);
    console.log(`  Matches found: ${data.allMatches}`);
  }
  
  // Show what's missing
  const missing = Object.keys(MSTR_RULES).filter(m => !extracted[m]);
  if (missing.length > 0) {
    console.log();
    console.log("MISSING METRICS:", missing.join(", "));
    console.log("(May need text extraction from 8-K or different XBRL fact names)");
  }
  
  // Show some sample XBRL facts for debugging
  console.log();
  console.log("=".repeat(60));
  console.log("SAMPLE XBRL FACTS (for debugging)");
  console.log("=".repeat(60));
  
  // Show facts with "bitcoin" or "digital" in name
  const btcFacts = xbrlFacts.filter(f => 
    f.fact.toLowerCase().includes("bitcoin") || 
    f.fact.toLowerCase().includes("digital")
  );
  if (btcFacts.length > 0) {
    console.log("\nBitcoin/Digital asset facts:");
    btcFacts.forEach(f => {
      console.log(`  ${f.fact}: ${f.value.toLocaleString()} (${f.periodEnd})`);
    });
  } else {
    console.log("\nNo bitcoin/digital facts found. Checking for custom namespace...");
    const customFacts = xbrlFacts.filter(f => !f.fact.startsWith("us-gaap:") && !f.fact.startsWith("dei:"));
    console.log(`Found ${customFacts.length} custom namespace facts`);
    customFacts.slice(0, 10).forEach(f => {
      console.log(`  ${f.fact}: ${f.value}`);
    });
  }
}

run().catch(console.error);
