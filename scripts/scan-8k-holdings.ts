#!/usr/bin/env npx tsx
/**
 * Scan Recent 8-K Filings for Holdings Data
 *
 * Fetches recent 8-K filings from SEC EDGAR and runs the regex extractor
 * to find crypto holdings data. Reports findings for human review.
 *
 * Usage:
 *   npx tsx scripts/scan-8k-holdings.ts              # All companies, last 30 days
 *   npx tsx scripts/scan-8k-holdings.ts --ticker MSTR # Single company
 *   npx tsx scripts/scan-8k-holdings.ts --days 7      # Last 7 days
 *   npx tsx scripts/scan-8k-holdings.ts --dry-run     # Show what would be scanned
 */

import { allCompanies } from '../src/lib/data/companies';
import { extractHoldingsRegex, getBestResult } from '../src/lib/sec/holdings-regex-extractor';
import { cleanHtmlText } from '../src/lib/sec/content-extractor';
import { parseItemsString, filterByItemCodes } from '../src/lib/sec/item-filter';

const SEC_USER_AGENT = 'dat-tracker admin@dat-tracker.com';
const SEC_RATE_LIMIT = 300; // ms between requests

// ============================================
// SEC EDGAR Helpers
// ============================================

async function fetchSEC(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'application/json',
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface Filing8K {
  ticker: string;
  accessionNumber: string;
  filedDate: string;
  items: string[];
  primaryDocument: string;
  cik: string;
}

// ============================================
// Find 8-K filings for a company
// ============================================

async function getRecent8Ks(
  ticker: string,
  cik: string,
  sinceDaysAgo: number
): Promise<Filing8K[]> {
  const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  const resp = await fetchSEC(url);
  if (!resp.ok) {
    console.error(`  SEC API error for ${ticker} (CIK ${cik}): ${resp.status}`);
    return [];
  }

  const data = await resp.json();
  const recent = data.filings?.recent;
  if (!recent) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - sinceDaysAgo);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const filings: Filing8K[] = [];
  const count = Math.min(recent.form?.length || 0, 50);

  for (let i = 0; i < count; i++) {
    const form = recent.form[i];
    const filedDate = recent.filingDate[i];

    // Only 8-K and 8-K/A
    if (!form.startsWith('8-K')) continue;
    if (filedDate < cutoff) break; // Past our window

    const items = parseItemsString(recent.items?.[i]);
    const filter = filterByItemCodes(items);

    // Only include Tier 1 and Tier 2 filings
    if (!filter.shouldProcess) continue;

    filings.push({
      ticker,
      accessionNumber: recent.accessionNumber[i],
      filedDate,
      items,
      primaryDocument: recent.primaryDocument[i],
      cik: paddedCik,
    });
  }

  return filings;
}

// ============================================
// Fetch and extract from a single 8-K
// ============================================

async function extractFromFiling(
  filing: Filing8K,
  expectedAsset: string
): Promise<{
  filing: Filing8K;
  results: ReturnType<typeof extractHoldingsRegex>;
  best: ReturnType<typeof getBestResult>;
  text: string;
}> {
  const accClean = filing.accessionNumber.replace(/-/g, '');
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(filing.cik)}/${accClean}`;
  const docUrl = `${baseUrl}/${filing.primaryDocument}`;

  const resp = await fetch(docUrl, {
    headers: { 'User-Agent': SEC_USER_AGENT },
  });

  if (!resp.ok) {
    return { filing, results: [], best: null, text: '' };
  }

  const html = await resp.text();
  const results = extractHoldingsRegex(html, expectedAsset);
  const best = getBestResult(results, expectedAsset);

  return { filing, results, best, text: cleanHtmlText(html).substring(0, 500) };
}

// ============================================
// Main
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const tickerArg = args.find((_, i) => args[i - 1] === '--ticker');
  const daysArg = parseInt(args.find((_, i) => args[i - 1] === '--days') || '30');
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(70));
  console.log('8-K Holdings Scanner');
  console.log('='.repeat(70));
  console.log(`  Period: last ${daysArg} days`);
  console.log(`  Ticker: ${tickerArg || 'all companies'}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'full scan'}`);
  console.log();

  // Get companies with CIKs
  const companies = allCompanies.filter(c => {
    if (!c.secCik) return false;
    if (tickerArg && c.ticker !== tickerArg.toUpperCase()) return false;
    return true;
  });

  console.log(`Scanning ${companies.length} companies...\n`);

  let totalFilings = 0;
  let totalExtracted = 0;
  const findings: Array<{
    ticker: string;
    asset: string;
    accession: string;
    filedDate: string;
    items: string[];
    holdings: number | null;
    type: string | null;
    transactionAmount: number | null;
    costUsd: number | null;
    asOfDate: string | null;
    confidence: number;
    pattern: string;
  }> = [];

  for (const company of companies) {
    await sleep(SEC_RATE_LIMIT);

    const filings8k = await getRecent8Ks(company.ticker, company.secCik!, daysArg);

    if (filings8k.length === 0) continue;

    console.log(`${company.ticker}: ${filings8k.length} recent 8-K(s)`);
    totalFilings += filings8k.length;

    if (dryRun) {
      for (const f of filings8k) {
        console.log(`  ${f.filedDate} | Items: ${f.items.join(',')} | ${f.accessionNumber}`);
      }
      continue;
    }

    for (const filing of filings8k) {
      await sleep(SEC_RATE_LIMIT);

      const { best } = await extractFromFiling(filing, company.asset);

      if (best && best.confidence >= 0.7) {
        totalExtracted++;
        findings.push({
          ticker: company.ticker,
          asset: company.asset,
          accession: filing.accessionNumber,
          filedDate: filing.filedDate,
          items: filing.items,
          holdings: best.holdings,
          type: best.type,
          transactionAmount: best.transactionAmount,
          costUsd: best.costUsd,
          asOfDate: best.asOfDate,
          confidence: best.confidence,
          pattern: best.patternName,
        });

        const val = best.holdings ?? best.transactionAmount;
        console.log(
          `  ✓ ${filing.filedDate} | ${best.type}: ${val?.toLocaleString()} ${company.asset}` +
          ` (conf: ${(best.confidence * 100).toFixed(0)}%, pattern: ${best.patternName})` +
          (best.asOfDate ? ` as-of: ${best.asOfDate}` : '') +
          (best.costUsd ? ` cost: $${(best.costUsd / 1e6).toFixed(1)}M` : '')
        );
      } else {
        console.log(`  - ${filing.filedDate} | Items: ${filing.items.join(',')} | No holdings data found`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Companies scanned: ${companies.length}`);
  console.log(`  8-K filings found: ${totalFilings}`);
  console.log(`  Holdings extracted: ${totalExtracted}`);

  if (findings.length > 0) {
    console.log('\nFINDINGS:');
    console.log('-'.repeat(70));
    for (const f of findings) {
      const val = f.holdings ?? f.transactionAmount;
      const label = f.type === 'total' ? 'TOTAL' : f.type === 'purchase' ? 'BUY' : 'SELL';
      console.log(
        `  ${f.ticker.padEnd(8)} ${f.filedDate} [${label}] ${val?.toLocaleString()} ${f.asset}` +
        ` (${(f.confidence * 100).toFixed(0)}%)` +
        (f.costUsd ? ` $${(f.costUsd / 1e6).toFixed(1)}M` : '') +
        (f.asOfDate ? ` as-of ${f.asOfDate}` : '')
      );
    }

    // Compare with current holdings
    console.log('\nCOMPARISON WITH CURRENT DATA:');
    console.log('-'.repeat(70));
    for (const f of findings.filter(f => f.type === 'total' && f.holdings)) {
      const company = companies.find(c => c.ticker === f.ticker);
      if (!company) continue;

      const current = company.holdings;
      const extracted = f.holdings!;
      const diff = extracted - current;
      const pct = current > 0 ? ((diff / current) * 100).toFixed(1) : 'N/A';

      if (diff !== 0) {
        console.log(
          `  ${f.ticker.padEnd(8)} Current: ${current.toLocaleString()} | Extracted: ${extracted.toLocaleString()}` +
          ` | Δ ${diff > 0 ? '+' : ''}${diff.toLocaleString()} (${pct}%)`
        );
      } else {
        console.log(`  ${f.ticker.padEnd(8)} ✓ Matches current data: ${current.toLocaleString()} ${f.asset}`);
      }
    }
  }
}

main().catch(console.error);
