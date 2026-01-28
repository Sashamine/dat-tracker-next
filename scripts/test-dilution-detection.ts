/**
 * Test dilution detection across representative DAT companies
 */

import { extractShareCounts } from '../src/lib/sec/xbrl-extractor';
import { detectDilutiveInstruments, formatDilutionDetection } from '../src/lib/data/dilutive-instruments';

// Representative sample:
// - Large BTC treasury: MSTR
// - Miners: MARA, RIOT, CLSK
// - Small/mid treasury: BTCS, SMLR, KULR
// - Convertible-heavy: UPXI
// - Recent entrant: SNEX (if has CIK)
const TICKERS = [
  'MSTR',  // Large BTC treasury, heavy converts
  'MARA',  // Large miner
  'RIOT',  // Large miner
  'CLSK',  // Mid miner
  'BTCS',  // Small ETH treasury
  'SMLR',  // Small BTC treasury
  'KULR',  // Recent BTC treasury
  'UPXI',  // SOL treasury, convertible-heavy
];

async function main() {
  console.log('Testing dilution detection against SEC XBRL data\n');
  console.log('='.repeat(80));
  
  const results: Array<{
    ticker: string;
    basic: number | null;
    diluted: number | null;
    detected: boolean;
    delta: number;
    deltaPct: number;
  }> = [];

  for (const ticker of TICKERS) {
    console.log(`\nFetching ${ticker}...`);
    
    try {
      const shareCounts = await extractShareCounts(ticker);
      
      if (!shareCounts.success) {
        console.log(`  ❌ Failed: ${shareCounts.error}`);
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
      });

      // Display results
      console.log(`  Basic:   ${shareCounts.basicShares?.toLocaleString() ?? 'NULL'}`);
      console.log(`  Diluted: ${shareCounts.dilutedShares?.toLocaleString() ?? 'NULL'}`);
      console.log(`  As of:   ${shareCounts.asOfDate ?? 'unknown'} (${shareCounts.filingType ?? 'unknown'})`);
      console.log(`  → ${formatDilutionDetection(detection)}`);

      // Rate limit
      await new Promise(r => setTimeout(r, 250));
    } catch (err) {
      console.log(`  ❌ Error: ${err}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY\n');
  
  const withBothValues = results.filter(r => r.basic !== null && r.diluted !== null);
  const withDilution = results.filter(r => r.detected);
  const missingData = results.filter(r => r.basic === null || r.diluted === null);

  console.log(`Total tested:     ${TICKERS.length}`);
  console.log(`Got both values:  ${withBothValues.length}`);
  console.log(`Missing data:     ${missingData.length} (${missingData.map(r => r.ticker).join(', ') || 'none'})`);
  console.log(`Dilution flagged: ${withDilution.length}`);
  
  if (withDilution.length > 0) {
    console.log('\nDilution breakdown:');
    for (const r of withDilution) {
      const deltaStr = r.delta >= 1_000_000 
        ? `${(r.delta / 1_000_000).toFixed(1)}M` 
        : r.delta.toLocaleString();
      console.log(`  ${r.ticker}: +${deltaStr} shares (${r.deltaPct.toFixed(1)}%)`);
    }
  }
}

main().catch(console.error);
