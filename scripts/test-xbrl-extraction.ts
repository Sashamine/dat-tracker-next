#!/usr/bin/env npx ts-node
/**
 * Test script for XBRL extraction
 *
 * Usage:
 *   npx ts-node scripts/test-xbrl-extraction.ts CLSK
 *   npx ts-node scripts/test-xbrl-extraction.ts --scan   # Scan all tickers
 */

import { extractXBRLOnly, runXBRLScan, checkTickerForSecUpdate } from '../src/lib/sec-auto-update/index.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts TICKER');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts --scan');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts --check TICKER');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts CLSK');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts --scan');
    console.log('  npx ts-node scripts/test-xbrl-extraction.ts --check CLSK');
    process.exit(1);
  }

  if (args[0] === '--scan') {
    // Scan all tickers
    console.log('Running XBRL scan on all tickers...\n');
    const { results, summary } = await runXBRLScan();

    console.log('\n=== Results with Bitcoin Holdings ===');
    for (const [ticker, result] of results) {
      if (result.success && result.bitcoinHoldings !== undefined) {
        console.log(`${ticker}: $${(result.bitcoinHoldings / 1e6).toFixed(1)}M BTC (${result.bitcoinHoldingsDate})`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total: ${summary.total}`);
    console.log(`With Bitcoin: ${summary.withBitcoin}`);
    console.log(`With Shares: ${summary.withShares}`);
    console.log(`With Debt: ${summary.withDebt}`);
    console.log(`Failed: ${summary.failed}`);
  }
  else if (args[0] === '--check') {
    // Full check (XBRL + LLM) for a single ticker
    const ticker = args[1]?.toUpperCase();
    if (!ticker) {
      console.error('Error: Please provide a ticker');
      process.exit(1);
    }

    console.log(`Running full hybrid check for ${ticker}...\n`);
    const result = await checkTickerForSecUpdate(ticker, { dryRun: true });

    console.log('\n=== Result ===');
    console.log(JSON.stringify(result, null, 2));
  }
  else {
    // Single ticker XBRL extraction
    const ticker = args[0].toUpperCase();
    console.log(`Testing XBRL extraction for ${ticker}...\n`);

    const result = await extractXBRLOnly(ticker);

    console.log('=== XBRL Extraction Result ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n=== Summary ===');
      if (result.bitcoinHoldings !== undefined) {
        console.log(`Bitcoin Holdings: $${result.bitcoinHoldings.toLocaleString()} (${result.bitcoinHoldingsDate})`);
      } else {
        console.log('Bitcoin Holdings: Not found in XBRL');
      }

      if (result.sharesOutstanding !== undefined) {
        console.log(`Shares Outstanding: ${result.sharesOutstanding.toLocaleString()}`);
      }

      if (result.totalDebt !== undefined) {
        console.log(`Total Debt: $${result.totalDebt.toLocaleString()}`);
      }

      if (result.cashAndEquivalents !== undefined) {
        console.log(`Cash: $${result.cashAndEquivalents.toLocaleString()}`);
      }

      if (result.accessionNumber) {
        console.log(`Source: ${result.filingType} (${result.accessionNumber})`);
      }
    } else {
      console.log(`\nError: ${result.error}`);
    }
  }
}

main().catch(console.error);
