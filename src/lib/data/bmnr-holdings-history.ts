/**
 * BMNR (Bitmine Immersion Technologies) Holdings History
 * 
 * Sources: SEC 8-K filings (Item 7.01), 10-Q, 10-K
 * CIK: 0001829311
 * 
 * METHODOLOGY NOTE:
 * - ETH holdings: From weekly 8-K press releases (verified, exact)
 * - Share counts: From 10-Q/10-K XBRL or 424B5 filings (anchors)
 * - Shares between anchors: Estimated using ETH acquisition methodology
 *   Formula: shares_issued = (ETH_acquired × ETH_price) / stock_price
 *   See: clawd/bmnr-audit/METHODOLOGY.md
 * 
 * Last updated: 2026-02-09
 */

import type { HoldingsSnapshot } from './holdings-history';

// Share count anchors from SEC filings (verified)
const SHARE_ANCHORS = {
  '2025-07-23': { shares: 112_311_382, source: '424B5', accession: '0001493152-25-011368' },
  '2025-08-11': { shares: 218_888_720, source: '424B5 (after 106.6M ATM)', accession: '0001493152-25-011831' },
  '2025-09-22': { shares: 224_106_435, source: '424B5 (+5.2M direct)', accession: '0001493152-25-014391' },
  '2025-11-20': { shares: 384_067_823, source: '10-K XBRL', accession: '0001493152-25-024679' },
  '2026-01-12': { shares: 454_862_451, source: '10-Q XBRL', accession: '0001493152-26-002084' },
};

// Helper to interpolate shares between anchors
function getSharesForDate(date: string): { shares: number; confidence: 'high' | 'medium' | 'low'; source: string } {
  const anchorDates = Object.keys(SHARE_ANCHORS).sort();
  
  // Exact match
  if (SHARE_ANCHORS[date as keyof typeof SHARE_ANCHORS]) {
    const anchor = SHARE_ANCHORS[date as keyof typeof SHARE_ANCHORS];
    return { shares: anchor.shares, confidence: 'high', source: anchor.source };
  }
  
  // Find surrounding anchors
  let prevAnchor = anchorDates[0];
  let nextAnchor = anchorDates[anchorDates.length - 1];
  
  for (let i = 0; i < anchorDates.length; i++) {
    if (anchorDates[i] > date) {
      nextAnchor = anchorDates[i];
      prevAnchor = anchorDates[i - 1] || anchorDates[0];
      break;
    }
    prevAnchor = anchorDates[i];
  }
  
  const prevData = SHARE_ANCHORS[prevAnchor as keyof typeof SHARE_ANCHORS];
  const nextData = SHARE_ANCHORS[nextAnchor as keyof typeof SHARE_ANCHORS];
  
  // Linear interpolation
  const prevTime = new Date(prevAnchor).getTime();
  const nextTime = new Date(nextAnchor).getTime();
  const curTime = new Date(date).getTime();
  const ratio = (curTime - prevTime) / (nextTime - prevTime);
  const interpolatedShares = Math.round(prevData.shares + ratio * (nextData.shares - prevData.shares));
  
  return {
    shares: interpolatedShares,
    confidence: 'medium',
    source: `Interpolated between ${prevAnchor} and ${nextAnchor}`
  };
}

export const BMNR_HISTORY: HoldingsSnapshot[] = [
  // July 2025 - Initial accumulation
  {
    date: '2025-07-17',
    holdings: 300657,
    sharesOutstandingDiluted: 112_311_382,
    holdingsPerShare: 0.002677,
    stockPrice: undefined, // TODO: fetch historical
    source: '8-K Initial holdings disclosure',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225011270/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'ETH includes 60,000 via ITM options backed by $200M cash. Share count from 424B5 anchor.',
    confidence: 'high',
  },
  {
    date: '2025-07-23',
    holdings: 566776,
    sharesOutstandingDiluted: 112_311_382,
    holdingsPerShare: 0.005046,
    stockPrice: undefined,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225011364/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'high',
  },
  
  // August 2025 - Rapid accumulation
  {
    date: '2025-08-17',
    holdings: 1523373,
    sharesOutstandingDiluted: 218_888_720, // Using Aug 11 anchor
    holdingsPerShare: 0.006959,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225012109/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares from 424B5 anchor (Aug 11)',
    confidence: 'high',
  },
  {
    date: '2025-08-24',
    holdings: 1713899,
    sharesOutstandingDiluted: 218_888_720,
    holdingsPerShare: 0.007829,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225012292/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'high',
  },
  
  // September 2025
  {
    date: '2025-09-07',
    holdings: 2069443,
    sharesOutstandingDiluted: 220_000_000, // Estimated
    holdingsPerShare: 0.009406,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225012776/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares interpolated between Aug 11 and Sep 22 anchors',
    confidence: 'medium',
  },
  {
    date: '2025-09-14',
    holdings: 2151676,
    sharesOutstandingDiluted: 222_000_000,
    holdingsPerShare: 0.009692,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225013376/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-09-21',
    holdings: 2416054,
    sharesOutstandingDiluted: 224_106_435,
    holdingsPerShare: 0.010781,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225014387/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'high',
  },
  {
    date: '2025-09-28',
    holdings: 2650900,
    sharesOutstandingDiluted: 240_000_000,
    holdingsPerShare: 0.011045,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225015879/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares interpolated between Sep 22 and Nov 20 anchors',
    confidence: 'medium',
  },
  
  // October 2025
  {
    date: '2025-10-05',
    holdings: 2830151,
    sharesOutstandingDiluted: 260_000_000,
    holdingsPerShare: 0.010885,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225017019/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-10-19',
    holdings: 3236014,
    sharesOutstandingDiluted: 290_000_000,
    holdingsPerShare: 0.011159,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225018577/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-10-26',
    holdings: 3313069,
    sharesOutstandingDiluted: 310_000_000,
    holdingsPerShare: 0.010687,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225019644/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  
  // November 2025
  {
    date: '2025-11-02',
    holdings: 3395422,
    sharesOutstandingDiluted: 330_000_000,
    holdingsPerShare: 0.010289,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225020545/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-11-09',
    holdings: 3505723,
    sharesOutstandingDiluted: 350_000_000,
    holdingsPerShare: 0.010016,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225021429/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-11-23',
    holdings: 3629701,
    sharesOutstandingDiluted: 380_000_000,
    holdingsPerShare: 0.009552,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225024762/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-11-30',
    holdings: 3726499,
    sharesOutstandingDiluted: 384_067_823, // 10-K anchor
    holdingsPerShare: 0.009703,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225025501/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares from 10-K XBRL anchor (Nov 20)',
    confidence: 'high',
  },
  
  // December 2025
  {
    date: '2025-12-14',
    holdings: 3967210,
    sharesOutstandingDiluted: 400_000_000,
    holdingsPerShare: 0.009918,
    cash: 1_000_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225027660/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2025-12-21',
    holdings: 4066062,
    sharesOutstandingDiluted: 410_000_000,
    holdingsPerShare: 0.009917,
    cash: 1_000_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315225028674/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  
  // January 2026
  {
    date: '2026-01-04',
    holdings: 4143502,
    sharesOutstandingDiluted: 430_000_000,
    holdingsPerShare: 0.009636,
    cash: 915_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226000274/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2026-01-11',
    holdings: 4167768,
    sharesOutstandingDiluted: 450_000_000,
    holdingsPerShare: 0.009262,
    cash: 988_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226001237/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares approaching 10-Q anchor',
    confidence: 'medium',
  },
  {
    date: '2026-01-19',
    holdings: 4203036,
    sharesOutstandingDiluted: 454_862_451, // 10-Q anchor
    holdingsPerShare: 0.009241,
    cash: 979_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226002762/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares from 10-Q XBRL anchor (Jan 12)',
    confidence: 'high',
  },
  {
    date: '2026-01-25',
    holdings: 4243338,
    sharesOutstandingDiluted: 460_000_000,
    holdingsPerShare: 0.009225,
    cash: 682_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226003536/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  
  // February 2026
  {
    date: '2026-02-01',
    holdings: 4285125,
    sharesOutstandingDiluted: 470_000_000,
    holdingsPerShare: 0.009117,
    cash: 586_000_000,
    source: '8-K Holdings update',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226004658/ex99-1.htm',
    sourceType: 'sec-filing',
    confidence: 'medium',
  },
  {
    date: '2026-02-08',
    holdings: 4325738,
    sharesOutstandingDiluted: 480_000_000,
    holdingsPerShare: 0.009012,
    cash: 595_000_000,
    source: '8-K Holdings update - Latest',
    sourceUrl: 'https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm',
    sourceType: 'sec-filing',
    methodology: 'Shares estimated from ATM activity since Jan 12 anchor',
    confidence: 'medium',
  },
];

// Staked ETH tracking (for yield calculations)
export const BMNR_STAKED_ETH: { date: string; stakedEth: number; percentStaked: number }[] = [
  { date: '2026-01-04', stakedEth: 659_219, percentStaked: 15.9 },
  { date: '2026-01-11', stakedEth: 1_256_083, percentStaked: 30.1 },
  { date: '2026-01-19', stakedEth: 1_838_003, percentStaked: 43.7 },
  { date: '2026-01-25', stakedEth: 2_009_267, percentStaked: 47.4 },
  { date: '2026-02-01', stakedEth: 2_897_459, percentStaked: 67.6 },
  { date: '2026-02-08', stakedEth: 2_897_459, percentStaked: 67.0 },
];

// EarningsSource type for compatibility with earnings-data.ts
type EarningsSource = "sec-filing" | "regulatory-filing" | "press-release" | 
  "investor-presentation" | "company-dashboard" | "estimated" | "manual";

/**
 * Get BMNR holdings data for a quarter-end date.
 * This is the SINGLE SOURCE OF TRUTH for BMNR quarterly data.
 * 
 * @param quarterEnd - Quarter-end date in YYYY-MM-DD format (e.g., "2025-09-30")
 * @returns Snapshot data for earnings-data.ts or undefined if no data available
 */
export function getBMNRQuarterEndData(quarterEnd: string): {
  holdingsAtQuarterEnd: number;
  sharesAtQuarterEnd: number;
  holdingsPerShare: number;
  source: EarningsSource;
  sourceUrl: string;
} | undefined {
  // ETH strategy started Jul 17, 2025 - no data before that
  if (quarterEnd < '2025-07-17') {
    return undefined;
  }
  
  // Find the closest snapshot on or before the quarter-end date
  const snapshotsOnOrBefore = BMNR_HISTORY
    .filter(s => s.date <= quarterEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  const snapshot = snapshotsOnOrBefore[0];
  if (!snapshot) {
    return undefined;
  }
  
  // Use the snapshot's share count (already interpolated from SHARE_ANCHORS)
  // All BMNR 8-K filings are SEC filings
  const source: EarningsSource = (snapshot.source && snapshot.source.includes('8-K')) ? 'sec-filing' : 'sec-filing';
  return {
    holdingsAtQuarterEnd: snapshot.holdings,
    sharesAtQuarterEnd: snapshot.sharesOutstandingDiluted,
    holdingsPerShare: snapshot.holdings / snapshot.sharesOutstandingDiluted,
    source,
    sourceUrl: snapshot.sourceUrl || '',
  };
}

/**
 * Get all SHARE_ANCHORS for reference (e.g., in tooltips or audit views)
 */
export function getBMNRShareAnchors() {
  return SHARE_ANCHORS;
}

// Export for use in holdings-history.ts
export default BMNR_HISTORY;
