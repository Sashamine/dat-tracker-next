/**
 * Backfill Holdings from SEC Filings (8-K and 10-Q)
 *
 * - 8-K filings: Press releases with holdings announcements
 * - 10-Q filings: Quarterly balance sheets with digital asset line items
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';

const { Pool } = pg;

const TICKER_TO_CIK = {
  "MSTR": "0001050446",
  "MARA": "0001507605",
  "RIOT": "0001167419",
  "CLSK": "0001785459",
  "HUT": "0001964789",
  "CORZ": "0001878848",
  "BTDR": "0001899123",
  "COIN": "0001679788",
  "ASST": "0001920406",
  "KULR": "0001662684",
  "DJT": "0001849635",
  "BMNR": "0001866292",
  "SBET": "0001869198",
};

async function fetchSECSubmissions(cik) {
  const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker contact@example.com' },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchFilingIndex(cik, accessionNumber) {
  // Fetch the filing index to find all documents
  const accNum = accessionNumber.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNum}/index.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker contact@example.com' },
  });
  if (!response.ok) return null;
  return response.json();
}

async function fetchDocument(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker contact@example.com' },
  });
  if (!response.ok) return null;
  const content = await response.text();
  // Clean HTML
  return content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function extractHoldingsWithClaude(text, companyName, ticker, asset, filingType = '8-K') {
  const client = new Anthropic();

  // Different prompts for different filing types
  const prompt = filingType === '10-Q' || filingType === '10-K'
    ? `Analyze this ${filingType} quarterly/annual filing for ${companyName} (${ticker}).

Find the TOTAL ${asset} holdings from the balance sheet or notes. Look for:
- "Digital assets" line item (may be in thousands, e.g., "$5,247,000" = $5.247B)
- Number of ${asset} held (e.g., "X bitcoin" or "X BTC")
- Fair value of ${asset} holdings
- Notes to financial statements mentioning ${asset} quantity

If you find a dollar amount but no quantity, look for the ${asset} price mentioned and calculate quantity.

TEXT:
---
${text.substring(0, 30000)}
---

Return JSON only:
{
  "holdings": <number of ${asset} coins, not dollar value>,
  "holdingsValueUsd": <dollar value if found>,
  "asOfDate": "<YYYY-MM-DD or null - the period end date>",
  "confidence": <0.0-1.0>,
  "quote": "<exact quote showing holdings or calculation used>"
}`
    : `Analyze this press release/8-K filing for ${companyName} (${ticker}).

Find the TOTAL ${asset} holdings. Look for phrases like:
- "holds X bitcoin" or "held X BTC"
- "treasury of X bitcoin"
- "total bitcoin holdings of X"
- "X BTC on balance sheet"

TEXT:
---
${text.substring(0, 25000)}
---

Return JSON only:
{
  "holdings": <number or null>,
  "asOfDate": "<YYYY-MM-DD or null>",
  "confidence": <0.0-1.0>,
  "quote": "<exact quote showing holdings>"
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error(`  Claude error: ${error.message}`);
  }
  return null;
}

async function processCompany(ticker, asset, currentHoldings) {
  const cik = TICKER_TO_CIK[ticker];
  if (!cik) return { ticker, status: 'no_cik' };

  console.log(`\n${ticker}: Fetching SEC data...`);

  const data = await fetchSECSubmissions(cik);
  if (!data?.filings?.recent) return { ticker, status: 'no_data' };

  const recent = data.filings.recent;
  const cikNum = cik.replace(/^0+/, '');

  // Find recent filings (last 180 days for 10-Q, 90 days for 8-K)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const oneEightyDaysAgo = new Date();
  oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

  // First try 8-K filings (more recent, announcement-based)
  for (let i = 0; i < Math.min(30, recent.form.length); i++) {
    if (recent.form[i] !== '8-K') continue;

    const filingDate = new Date(recent.filingDate[i]);
    if (filingDate < ninetyDaysAgo) break;

    const accNum = recent.accessionNumber[i];
    console.log(`  Checking 8-K from ${recent.filingDate[i]}...`);

    // Fetch filing index to find EX-99 press releases
    const indexData = await fetchFilingIndex(cikNum, accNum);
    if (!indexData?.directory?.item) continue;

    // Look for press release exhibits, shareholder letters, announcements
    const exhibits = indexData.directory.item.filter(item =>
      item.name.match(/ex99|ex-99|press|release|shareholder|letter|announce|earnings/i) &&
      item.name.match(/\.htm$/i)
    );

    for (const exhibit of exhibits) {
      const accNumClean = accNum.replace(/-/g, '');
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNumClean}/${exhibit.name}`;

      const content = await fetchDocument(docUrl);
      if (!content || content.length < 500) continue;

      // Check for crypto mentions
      const lowerContent = content.toLowerCase();
      const hasCrypto = ['bitcoin', 'btc', 'digital asset', 'cryptocurrency', 'ethereum', 'eth'].some(
        kw => lowerContent.includes(kw)
      );
      if (!hasCrypto) continue;

      console.log(`  Found crypto mention in ${exhibit.name}`);

      const extraction = await extractHoldingsWithClaude(content, data.name, ticker, asset, '8-K');

      if (extraction?.holdings && extraction.holdings > 0) {
        return {
          ticker,
          status: 'success',
          filingType: '8-K',
          currentHoldings,
          newHoldings: extraction.holdings,
          filingDate: recent.filingDate[i],
          asOfDate: extraction.asOfDate,
          confidence: extraction.confidence,
          quote: extraction.quote?.substring(0, 150),
          source: docUrl,
        };
      }
    }

    await new Promise(r => setTimeout(r, 300)); // Rate limit
  }

  // If no 8-K found, try 10-Q filings (quarterly balance sheets)
  console.log(`  No 8-K holdings found, checking 10-Q filings...`);

  for (let i = 0; i < Math.min(20, recent.form.length); i++) {
    if (recent.form[i] !== '10-Q' && recent.form[i] !== '10-K') continue;

    const filingDate = new Date(recent.filingDate[i]);
    if (filingDate < oneEightyDaysAgo) break;

    const accNum = recent.accessionNumber[i];
    const formType = recent.form[i];
    console.log(`  Checking ${formType} from ${recent.filingDate[i]}...`);

    // Fetch filing index
    const indexData = await fetchFilingIndex(cikNum, accNum);
    if (!indexData?.directory?.item) continue;

    // Look for the main filing document (htm file with company name or 10-q/10-k in name)
    const docs = indexData.directory.item.filter(item =>
      item.name.match(/\.htm$/i) &&
      (item.name.match(/10-?[qk]/i) || item.type === '10-Q' || item.type === '10-K' ||
       item.name.includes(ticker.toLowerCase()) || item.size > 100000)
    );

    // Sort by size descending (main document is usually largest)
    docs.sort((a, b) => (b.size || 0) - (a.size || 0));

    for (const doc of docs.slice(0, 2)) { // Check top 2 largest docs
      const accNumClean = accNum.replace(/-/g, '');
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNumClean}/${doc.name}`;

      const content = await fetchDocument(docUrl);
      if (!content || content.length < 1000) continue;

      // Check for crypto/digital asset mentions
      const lowerContent = content.toLowerCase();
      const hasCrypto = ['bitcoin', 'btc', 'digital asset', 'cryptocurrency', 'ethereum', 'eth'].some(
        kw => lowerContent.includes(kw)
      );
      if (!hasCrypto) continue;

      console.log(`  Found crypto mention in ${doc.name}`);

      const extraction = await extractHoldingsWithClaude(content, data.name, ticker, asset, formType);

      if (extraction?.holdings && extraction.holdings > 0) {
        return {
          ticker,
          status: 'success',
          filingType: formType,
          currentHoldings,
          newHoldings: extraction.holdings,
          filingDate: recent.filingDate[i],
          asOfDate: extraction.asOfDate,
          confidence: extraction.confidence,
          quote: extraction.quote?.substring(0, 200),
          source: docUrl,
        };
      }
    }

    await new Promise(r => setTimeout(r, 300)); // Rate limit
  }

  return { ticker, status: 'no_holdings_found' };
}

// Companies to check (updated Jan 17, 2026)
const COMPANIES = [
  { ticker: 'MARA', asset: 'BTC', holdings: 52850 },
  { ticker: 'RIOT', asset: 'BTC', holdings: 19287 },
  { ticker: 'CLSK', asset: 'BTC', holdings: 13099 },
  { ticker: 'HUT', asset: 'BTC', holdings: 13696 },
  { ticker: 'CORZ', asset: 'BTC', holdings: 2116 },
  { ticker: 'BTDR', asset: 'BTC', holdings: 2470 },
  { ticker: 'MSTR', asset: 'BTC', holdings: 687410 },
  { ticker: 'ASST', asset: 'BTC', holdings: 12798 },
  { ticker: 'KULR', asset: 'BTC', holdings: 1021 },
  { ticker: 'BMNR', asset: 'ETH', holdings: 4144000 },
  { ticker: 'SBET', asset: 'ETH', holdings: 863424 },
];

async function insertHoldingsSnapshot(pool, ticker, holdings, filingDate, sourceUrl, confidence, quote, filingType = '8-K') {
  try {
    // Get company ID
    const companyResult = await pool.query(
      'SELECT id FROM companies WHERE ticker = $1',
      [ticker]
    );
    if (companyResult.rows.length === 0) {
      console.log(`    Company ${ticker} not found in database`);
      return false;
    }
    const companyId = companyResult.rows[0].id;

    // Map filing type to DB enum
    const sourceType = filingType === '10-Q' ? '10-Q filing' : filingType === '10-K' ? '10-K filing' : '8-K filing';

    // Insert holdings snapshot with auto-approve (SEC filings are trusted)
    await pool.query(`
      INSERT INTO holdings_snapshots (
        company_id, holdings, source, snapshot_date, source_url,
        source_text, extraction_confidence, status, auto_approved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', true)
      ON CONFLICT (company_id, snapshot_date, source)
      DO UPDATE SET
        holdings = EXCLUDED.holdings,
        source_url = EXCLUDED.source_url,
        extraction_confidence = EXCLUDED.extraction_confidence,
        updated_at = NOW()
    `, [companyId, holdings, sourceType, filingDate, sourceUrl, quote?.substring(0, 500), confidence]);

    // The trigger will auto-update companies.current_holdings
    return true;
  } catch (error) {
    console.log(`    DB error for ${ticker}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== 8-K Holdings Backfill ===');

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  const results = [];
  let dbUpdates = 0;

  try {
    for (const company of COMPANIES) {
      const result = await processCompany(company.ticker, company.asset, company.holdings);
      results.push(result);

      if (result.status === 'success') {
        const change = result.newHoldings - result.currentHoldings;
        const pct = ((change / result.currentHoldings) * 100).toFixed(1);
        console.log(`  ✓ ${result.newHoldings.toLocaleString()} ${company.asset} (${pct > 0 ? '+' : ''}${pct}%)`);
        console.log(`    Quote: "${result.quote}"`);

        // Insert into database
        const inserted = await insertHoldingsSnapshot(
          pool,
          result.ticker,
          result.newHoldings,
          result.filingDate || result.asOfDate,
          result.source,
          result.confidence,
          result.quote,
          result.filingType
        );
        if (inserted) {
          dbUpdates++;
          console.log(`    ✓ Saved to database`);
        }
      } else {
        console.log(`  ✗ ${result.status}`);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    // Print summary
    const updates = results.filter(r => r.status === 'success');
    console.log('\n=== Summary ===');
    console.log(`Found: ${updates.length} holdings updates`);
    console.log(`Saved to DB: ${dbUpdates}`);

    if (updates.length > 0) {
      console.log('\nUpdates applied:');
      for (const u of updates) {
        console.log(`  ${u.ticker}: ${u.currentHoldings.toLocaleString()} → ${u.newHoldings.toLocaleString()} (${u.filingDate})`);
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
