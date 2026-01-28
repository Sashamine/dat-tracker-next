/**
 * Test point-in-time vs weighted average share extraction
 */

import { extractShareCounts, extractPointInTimeShares } from '../src/lib/sec/xbrl-extractor';

const TICKERS = ['BTCS', 'MSTR', 'MARA', 'UPXI', 'RIOT', 'CLSK'];

async function main() {
  console.log('Comparing point-in-time vs weighted average shares\n');
  console.log('='.repeat(100));
  console.log('Ticker   Weighted Avg     Point-in-Time    Diff      Fallback?   Concept');
  console.log('-'.repeat(100));

  for (const ticker of TICKERS) {
    const weighted = await extractShareCounts(ticker);
    const pointInTime = await extractPointInTimeShares(ticker);

    const wBasic = weighted.basicShares;
    const pit = pointInTime.sharesOutstanding;

    const wStr = wBasic ? (wBasic / 1_000_000).toFixed(1).padStart(8) + 'M' : 'N/A'.padStart(9);
    const pStr = pit ? (pit / 1_000_000).toFixed(1).padStart(10) + 'M' : 'N/A'.padStart(11);
    
    let diffStr = '   -';
    if (wBasic && pit && !pointInTime.isWeightedAverageFallback) {
      const diff = pit - wBasic;
      const diffPct = ((diff / wBasic) * 100).toFixed(1);
      diffStr = diff >= 0 ? `+${diffPct}%` : `${diffPct}%`;
    }
    
    const fallback = pointInTime.isWeightedAverageFallback ? 'YES' : 'no';
    const concept = pointInTime.concept?.split(':')[1]?.substring(0, 25) || 'N/A';

    console.log(`${ticker.padEnd(8)} ${wStr}       ${pStr}      ${diffStr.padStart(8)}   ${fallback.padEnd(9)}   ${concept}`);

    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n* Fallback = weighted average used when point-in-time not available in XBRL');
}

main().catch(console.error);
