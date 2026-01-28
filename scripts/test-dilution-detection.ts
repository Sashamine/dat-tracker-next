/**
 * Test dilution detection across all DAT companies with SEC filings
 */

import { extractShareCounts } from '../src/lib/sec/xbrl-extractor';
import { detectDilutiveInstruments, formatDilutionDetection } from '../src/lib/data/dilutive-instruments';
import { TICKER_TO_CIK } from '../src/lib/sec/sec-edgar';

async function main() {
  // Get all tickers with CIK mappings (US SEC filers)
  const tickers = Object.keys(TICKER_TO_CIK).sort();
  
  console.log(`Testing dilution detection against ${tickers.length} SEC-filing companies\n`);
  console.log('='.repeat(90));
  
  const results: Array<{
    ticker: string;
    basic: number | null;
    diluted: number | null;
    detected: boolean;
    delta: number;
    deltaPct: number;
    asOf: string | null;
  }> = [];

  let successCount = 0;
  let failCount = 0;

  for (const ticker of tickers) {
    process.stdout.write(`Fetching ${ticker.padEnd(8)}... `);
    
    try {
      const shareCounts = await extractShareCounts(ticker);
      
      if (!shareCounts.success) {
        console.log(`❌ ${shareCounts.error}`);
        failCount++;
        continue;
      }

      const detection = detectDilutiveInstruments(
        shareCounts.basicShares,
        shareCounts.dilutedShares,
        ticker,
        shareCounts.asOfDate,
        shareCounts.filingType,
        shareCounts.secUrl
      );

      results.push({
        ticker,
        basic: shareCounts.basicShares,
        diluted: shareCounts.dilutedShares,
        detected: detection.hasDilutiveInstruments,
        delta: detection.delta,
        deltaPct: detection.deltaPct,
        asOf: shareCounts.asOfDate,
      });

      successCount++;

      // Quick status
      const status = detection.hasDilutiveInstruments 
        ? `✓ ${detection.deltaPct.toFixed(1)}% dilution`
        : '○ no dilution';
      console.log(`${status} (${shareCounts.asOfDate})`);

      // Rate limit - SEC wants max 10 req/sec
      await new Promise(r => setTimeout(r, 150));
    } catch (err) {
      console.log(`❌ Error: ${err}`);
      failCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(90));
  console.log('SUMMARY\n');
  
  const withBothValues = results.filter(r => r.basic !== null && r.diluted !== null);
  const withDilution = results.filter(r => r.detected);
  const noDilution = results.filter(r => !r.detected && r.basic !== null);

  console.log(`Total CIK-mapped tickers: ${tickers.length}`);
  console.log(`Successful extractions:   ${successCount}`);
  console.log(`Failed extractions:       ${failCount}`);
  console.log(`Got both share counts:    ${withBothValues.length}`);
  console.log(`Dilution detected:        ${withDilution.length}`);
  console.log(`No dilution (clean):      ${noDilution.length}`);
  
  // Dilution leaderboard
  if (withDilution.length > 0) {
    console.log('\n--- DILUTION LEADERBOARD (sorted by %) ---\n');
    const sorted = withDilution.sort((a, b) => b.deltaPct - a.deltaPct);
    
    console.log('Ticker   Basic         Diluted       Delta         %      As Of');
    console.log('-'.repeat(75));
    
    for (const r of sorted) {
      const basicStr = r.basic ? (r.basic / 1_000_000).toFixed(1).padStart(8) + 'M' : 'N/A'.padStart(9);
      const dilutedStr = r.diluted ? (r.diluted / 1_000_000).toFixed(1).padStart(8) + 'M' : 'N/A'.padStart(9);
      const deltaStr = r.delta >= 1_000_000 
        ? ('+' + (r.delta / 1_000_000).toFixed(1) + 'M').padStart(10)
        : ('+' + r.delta.toLocaleString()).padStart(10);
      const pctStr = r.deltaPct.toFixed(1).padStart(5) + '%';
      const dateStr = r.asOf || 'unknown';
      
      console.log(`${r.ticker.padEnd(8)} ${basicStr}     ${dilutedStr}   ${deltaStr}   ${pctStr}   ${dateStr}`);
    }
  }

  // No dilution list
  if (noDilution.length > 0) {
    console.log('\n--- NO DILUTION DETECTED ---\n');
    console.log(noDilution.map(r => r.ticker).join(', '));
  }
}

main().catch(console.error);
