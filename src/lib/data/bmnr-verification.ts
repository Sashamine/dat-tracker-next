/**
 * BMNR Data Verification Engine
 * ===============================
 *
 * Cross-checks press release data against XBRL quarter-end totals.
 *
 * Verification approach:
 * 1. XBRL quarterly data (bmnr-sec-history.ts) is SOURCE OF TRUTH
 *    - Machine-readable from SEC filings
 *    - Full audit trail
 *
 * 2. Press release data (holdings-history.ts) is UNVERIFIED
 *    - 92% from press releases (audit finding)
 *    - Only 1 of 12 data points from SEC 10-K
 *    - Potential for timing lags, rounding, errors
 *
 * Cross-checks performed:
 * - ETH Holdings: Compare press release vs XBRL quarter-end
 * - Shares: Compare estimated shares vs XBRL shares outstanding
 * - Source tracking: Flag which data points are SEC-verified
 *
 * Known issues (from BMNR-AUDIT.md):
 * - 810% share dilution unexplained (50M → 455M)
 * - No ATM tracking despite $10B program
 * - Press releases may have timing lags (report dates vary)
 * - Round numbers in press releases suggest estimates
 *
 * Any discrepancy > 5% triggers a warning.
 */

import { BMNR_SEC_HISTORY, type BMNRSecFiling, getBMNRSharesPostSplit } from "./bmnr-sec-history";

// Import holdings history type
interface HoldingsHistoryEntry {
  date: string;
  holdings: number;
  sharesOutstandingDiluted?: number;
  holdingsPerShare?: number;
  source: string;
  sharesSource?: string;
}

// BMNR holdings history from holdings-history.ts (subset for verification)
const BMNR_HOLDINGS_HISTORY: HoldingsHistoryEntry[] = [
  { date: "2025-07-17", holdings: 300657, shares: 50_000_000, holdingsPerShare: 0.006013, source: "Press release" },
  { date: "2025-08-10", holdings: 1150263, shares: 150_000_000, holdingsPerShare: 0.007668, source: "Press release" },
  { date: "2025-08-17", holdings: 1523373, shares: 180_000_000, holdingsPerShare: 0.008463, source: "Press release" },
  { date: "2025-08-24", holdings: 1713899, shares: 221_515_180, holdingsPerShare: 0.007738, source: "Press release" },
  { date: "2025-09-07", holdings: 2069443, shares: 260_000_000, holdingsPerShare: 0.007959, source: "Press release" },
  { date: "2025-11-09", holdings: 3505723, shares: 350_000_000, holdingsPerShare: 0.010016, source: "Press release" },
  { date: "2025-11-20", holdings: 3559879, shares: 384_067_823, holdingsPerShare: 0.009269, source: "10-K filing" },
  { date: "2025-11-30", holdings: 3726499, shares: 400_000_000, holdingsPerShare: 0.009316, source: "Press release" },
  { date: "2025-12-14", holdings: 3967210, shares: 410_000_000, holdingsPerShare: 0.009676, source: "Press release" },
  { date: "2025-12-28", holdings: 4110525, shares: 425_000_000, holdingsPerShare: 0.009672, source: "Press release" },
  { date: "2026-01-04", holdings: 4143502, shares: 430_000_000, holdingsPerShare: 0.009636, source: "Press release" },
  { date: "2026-01-20", holdings: 4203036, shares: 455_000_000, holdingsPerShare: 0.009237, source: "Press release" },
];

export interface BMNRQuarterVerification {
  quarter: string; // e.g., "Q1 FY2026"
  periodEnd: string; // YYYY-MM-DD
  fiscalYear: string; // e.g., "FY2025" (Aug 31 year-end)

  // ETH holdings verification
  eth: {
    xbrlHoldings: number | null; // From SEC XBRL (in ETH, not USD)
    pressReleaseHoldings: number | null; // Closest press release to quarter-end
    pressReleaseDate: string | null; // When press release was issued
    discrepancy: number | null; // Absolute difference
    discrepancyPct: number | null; // Percentage difference
    status: "pass" | "warn" | "fail" | "no-data";
    verified: boolean; // True if from SEC filing
    notes?: string;
  };

  // Shares verification
  shares: {
    xbrlShares: number | null; // From SEC XBRL
    pressReleaseShares: number | null; // From press release estimates
    pressReleaseDate: string | null;
    discrepancy: number | null;
    discrepancyPct: number | null;
    status: "pass" | "warn" | "fail" | "no-data";
    verified: boolean; // True if from SEC filing
    notes?: string;
  };

  // Source tracking
  verification: {
    ethSource: "SEC XBRL" | "Press Release" | "None";
    sharesSource: "SEC XBRL" | "Estimated" | "None";
    isFullyVerified: boolean; // Both ETH and shares from SEC
  };
}

export interface BMNRVerificationReport {
  generated: string; // ISO timestamp
  quarters: BMNRQuarterVerification[];
  summary: {
    totalQuarters: number;
    ethVerified: number; // From SEC filings
    ethUnverified: number; // From press releases
    sharesVerified: number;
    sharesEstimated: number;
    ethWarnings: number;
    ethFailed: number;
    sharesWarnings: number;
    sharesFailed: number;
    verificationRate: number; // % of quarters with SEC-verified data
  };
  auditFindings: {
    pressReleaseReliance: number; // % of holdings data from press releases
    secVerified: number; // % from SEC filings
    criticalIssues: string[];
  };
}

/**
 * Get fiscal quarter label (BMNR uses Aug 31 fiscal year-end)
 */
function getFiscalQuarterLabel(date: string): { quarter: string; fiscalYear: string } {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();

  // BMNR fiscal year: Sep 1 - Aug 31
  // Q1 = Sep-Nov, Q2 = Dec-Feb, Q3 = Mar-May, Q4 = Jun-Aug

  let fiscalYear: string;
  let quarter: number;

  if (month >= 9) {
    // Sep-Dec = Q1-Q2 of next fiscal year
    fiscalYear = `FY${year + 1}`;
    quarter = month <= 11 ? 1 : 2;
  } else if (month <= 2) {
    // Jan-Feb = Q2 of current fiscal year
    fiscalYear = `FY${year}`;
    quarter = 2;
  } else if (month <= 5) {
    // Mar-May = Q3 of current fiscal year
    fiscalYear = `FY${year}`;
    quarter = 3;
  } else {
    // Jun-Aug = Q4 of current fiscal year
    fiscalYear = `FY${year}`;
    quarter = 4;
  }

  return {
    quarter: `Q${quarter} ${fiscalYear}`,
    fiscalYear,
  };
}

/**
 * Find closest press release to a given date
 */
function findClosestPressRelease(
  targetDate: string,
  maxDaysDiff = 30
): HoldingsHistoryEntry | null {
  const target = new Date(targetDate);
  let closest: HoldingsHistoryEntry | null = null;
  let minDiff = Infinity;

  for (const entry of BMNR_HOLDINGS_HISTORY) {
    const entryDate = new Date(entry.date);
    const diff = Math.abs(target.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < minDiff && diff <= maxDaysDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  return closest;
}

/**
 * Calculate verification status based on discrepancy
 */
function getStatus(
  discrepancyPct: number | null,
  warnThreshold = 0.05, // 5%
  failThreshold = 0.20 // 20%
): "pass" | "warn" | "fail" | "no-data" {
  if (discrepancyPct === null) return "no-data";
  const absPct = Math.abs(discrepancyPct);
  if (absPct <= warnThreshold) return "pass";
  if (absPct <= failThreshold) return "warn";
  return "fail";
}

/**
 * Extract ETH holdings from XBRL digital assets value
 * Note: XBRL reports USD value, need to derive ETH count
 */
function extractETHFromXBRL(filing: BMNRSecFiling): number | null {
  // For Q1 FY2026 (Nov 30, 2025), we know from 10-Q details:
  // 3,737,140 ETH + 193 BTC = $10,561,789,000
  // We can use this as known data point
  if (filing.periodEnd === "2025-11-30") {
    return 3_737_140;
  }

  // For FY2025 (Aug 31, 2025), the 10-K shows $2.5B digital assets
  // Press releases suggest this was start of ETH strategy
  // Need to derive ETH count (not directly in XBRL)
  if (filing.periodEnd === "2025-08-31") {
    // Estimate based on press releases around that time
    // Aug 24 press release: 1,713,899 ETH
    return null; // Mark as uncertain
  }

  // Pre-ETH strategy periods had $0 or minimal BTC
  if (filing.digitalAssets === 0 || filing.digitalAssets < 1_000_000) {
    return 0;
  }

  return null; // Unknown, need more data
}

/**
 * Run verification for a single quarter
 */
function verifyQuarter(filing: BMNRSecFiling): BMNRQuarterVerification {
  const { quarter, fiscalYear } = getFiscalQuarterLabel(filing.periodEnd);

  // Extract ETH from XBRL (if possible)
  const xbrlETH = extractETHFromXBRL(filing);

  // Find closest press release
  const pressRelease = findClosestPressRelease(filing.periodEnd);

  // ETH verification
  let ethVerification: BMNRQuarterVerification["eth"];
  if (xbrlETH !== null && pressRelease) {
    const discrepancy = xbrlETH - pressRelease.holdings;
    const discrepancyPct = discrepancy / xbrlETH;

    ethVerification = {
      xbrlHoldings: xbrlETH,
      pressReleaseHoldings: pressRelease.holdings,
      pressReleaseDate: pressRelease.date,
      discrepancy,
      discrepancyPct,
      status: getStatus(discrepancyPct),
      verified: true,
      notes:
        pressRelease.source === "10-K filing"
          ? "SEC-verified (from 10-K)"
          : `Press release (${Math.abs(
              new Date(filing.periodEnd).getTime() - new Date(pressRelease.date).getTime()
            ) /
              (1000 * 60 * 60 * 24)
            } days from quarter-end)`,
    };
  } else if (pressRelease) {
    ethVerification = {
      xbrlHoldings: null,
      pressReleaseHoldings: pressRelease.holdings,
      pressReleaseDate: pressRelease.date,
      discrepancy: null,
      discrepancyPct: null,
      status: "no-data",
      verified: pressRelease.source === "10-K filing",
      notes: "No XBRL ETH count available (USD value only)",
    };
  } else {
    ethVerification = {
      xbrlHoldings: xbrlETH,
      pressReleaseHoldings: null,
      pressReleaseDate: null,
      discrepancy: null,
      discrepancyPct: null,
      status: "no-data",
      verified: xbrlETH !== null,
      notes: "No press release data available",
    };
  }

  // Shares verification
  const xbrlShares = filing.commonSharesOutstanding;
  const pressReleaseShares = pressRelease?.shares || null;

  let sharesVerification: BMNRQuarterVerification["shares"];
  if (pressReleaseShares) {
    const discrepancy = xbrlShares - pressReleaseShares;
    const discrepancyPct = discrepancy / xbrlShares;

    // Check if shares look estimated (round numbers like 400M, 455M)
    const isRoundNumber = pressReleaseShares % 1_000_000 === 0 || pressReleaseShares % 5_000_000 === 0;

    sharesVerification = {
      xbrlShares,
      pressReleaseShares,
      pressReleaseDate: pressRelease.date,
      discrepancy,
      discrepancyPct,
      status: getStatus(discrepancyPct, 0.05, 0.15),
      verified: true,
      notes: isRoundNumber
        ? "Press release uses round number (likely estimated)"
        : pressRelease.source === "10-K filing"
        ? "SEC-verified"
        : "Press release estimate",
    };
  } else {
    sharesVerification = {
      xbrlShares,
      pressReleaseShares: null,
      pressReleaseDate: null,
      discrepancy: null,
      discrepancyPct: null,
      status: "no-data",
      verified: true,
      notes: "XBRL only (no press release comparison)",
    };
  }

  // Source tracking
  const ethSource: "SEC XBRL" | "Press Release" | "None" = xbrlETH !== null
    ? "SEC XBRL"
    : pressRelease
    ? "Press Release"
    : "None";

  const sharesSource: "SEC XBRL" | "Estimated" | "None" = "SEC XBRL"; // Always have XBRL shares

  return {
    quarter,
    periodEnd: filing.periodEnd,
    fiscalYear,
    eth: ethVerification,
    shares: sharesVerification,
    verification: {
      ethSource,
      sharesSource,
      isFullyVerified: ethVerification.verified && sharesVerification.verified,
    },
  };
}

/**
 * Run full verification report
 */
export function runBMNRVerification(): BMNRVerificationReport {
  const quarters: BMNRQuarterVerification[] = [];

  for (const filing of BMNR_SEC_HISTORY) {
    quarters.push(verifyQuarter(filing));
  }

  // Calculate summary
  const summary = {
    totalQuarters: quarters.length,
    ethVerified: quarters.filter((q) => q.eth.verified).length,
    ethUnverified: quarters.filter((q) => !q.eth.verified && q.eth.pressReleaseHoldings).length,
    sharesVerified: quarters.filter((q) => q.shares.verified).length,
    sharesEstimated: quarters.filter((q) => q.shares.pressReleaseShares && q.shares.notes?.includes("estimated")).length,
    ethWarnings: quarters.filter((q) => q.eth.status === "warn").length,
    ethFailed: quarters.filter((q) => q.eth.status === "fail").length,
    sharesWarnings: quarters.filter((q) => q.shares.status === "warn").length,
    sharesFailed: quarters.filter((q) => q.shares.status === "fail").length,
    verificationRate: quarters.filter((q) => q.verification.isFullyVerified).length / quarters.length,
  };

  // Audit findings (from BMNR-AUDIT.md)
  const totalHoldingsEntries = BMNR_HOLDINGS_HISTORY.length;
  const secVerifiedEntries = BMNR_HOLDINGS_HISTORY.filter((h) => h.source === "10-K filing").length;
  const pressReleaseEntries = totalHoldingsEntries - secVerifiedEntries;

  const auditFindings = {
    pressReleaseReliance: (pressReleaseEntries / totalHoldingsEntries) * 100,
    secVerified: (secVerifiedEntries / totalHoldingsEntries) * 100,
    criticalIssues: [
      `${pressReleaseEntries} of ${totalHoldingsEntries} holdings data points from press releases (${((pressReleaseEntries / totalHoldingsEntries) * 100).toFixed(1)}%)`,
      "810% share dilution unexplained (50M → 455M in 6 months)",
      "$10B ATM program not tracked (no breakdown of capital raised)",
      "No 8-K inter-quarter events documented (79 8-Ks available but unparsed)",
    ],
  };

  return {
    generated: new Date().toISOString(),
    quarters,
    summary,
    auditFindings,
  };
}

/**
 * Get quarters with discrepancies (warnings or failures)
 */
export function getBMNRDiscrepancies(report: BMNRVerificationReport): BMNRQuarterVerification[] {
  return report.quarters.filter(
    (q) =>
      q.eth.status === "warn" ||
      q.eth.status === "fail" ||
      q.shares.status === "warn" ||
      q.shares.status === "fail"
  );
}

/**
 * Verify a specific quarter by date
 */
export function verifyBMNRQuarterByDate(periodEnd: string): BMNRQuarterVerification | null {
  const filing = BMNR_SEC_HISTORY.find((f) => f.periodEnd === periodEnd);
  if (!filing) return null;
  return verifyQuarter(filing);
}

/**
 * Get unverified data points (press releases without SEC confirmation)
 */
export function getUnverifiedDataPoints(report: BMNRVerificationReport): Array<{
  date: string;
  holdings: number;
  shares: number;
  source: string;
}> {
  return BMNR_HOLDINGS_HISTORY.filter((h) => h.source !== "10-K filing").map((h) => ({
    date: h.date,
    holdings: h.holdings,
    shares: h.shares,
    source: h.source,
  }));
}
