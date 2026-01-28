/**
 * Run BMNR Verification Report
 *
 * Generates a detailed verification report comparing press releases
 * against SEC XBRL data.
 */

import {
  runBMNRVerification,
  getBMNRDiscrepancies,
  getUnverifiedDataPoints,
} from "../src/lib/data/bmnr-verification";

function formatPct(pct: number | null): string {
  if (pct === null) return "N/A";
  return `${(pct * 100).toFixed(1)}%`;
}

function formatNumber(num: number | null): string {
  if (num === null) return "N/A";
  return num.toLocaleString();
}

function main() {
  console.log("=" .repeat(80));
  console.log("BMNR VERIFICATION REPORT");
  console.log("Generated:", new Date().toISOString());
  console.log("=" .repeat(80));
  console.log();

  const report = runBMNRVerification();

  // Summary
  console.log("SUMMARY");
  console.log("-".repeat(80));
  console.log(`Total Quarters: ${report.summary.totalQuarters}`);
  console.log(`ETH Verified (SEC XBRL): ${report.summary.ethVerified}`);
  console.log(`ETH Unverified (Press Releases): ${report.summary.ethUnverified}`);
  console.log(`Shares Verified: ${report.summary.sharesVerified}`);
  console.log(`Verification Rate: ${(report.summary.verificationRate * 100).toFixed(1)}%`);
  console.log();
  console.log(`ETH Warnings: ${report.summary.ethWarnings}`);
  console.log(`ETH Failed: ${report.summary.ethFailed}`);
  console.log(`Shares Warnings: ${report.summary.sharesWarnings}`);
  console.log(`Shares Failed: ${report.summary.sharesFailed}`);
  console.log();

  // Audit Findings
  console.log("AUDIT FINDINGS");
  console.log("-".repeat(80));
  console.log(`Press Release Reliance: ${report.auditFindings.pressReleaseReliance.toFixed(1)}%`);
  console.log(`SEC Verified: ${report.auditFindings.secVerified.toFixed(1)}%`);
  console.log();
  console.log("Critical Issues:");
  report.auditFindings.criticalIssues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
  console.log();

  // Discrepancies
  const discrepancies = getBMNRDiscrepancies(report);
  if (discrepancies.length > 0) {
    console.log("DISCREPANCIES (WARN/FAIL)");
    console.log("-".repeat(80));
    discrepancies.forEach((q) => {
      console.log(`${q.quarter} (${q.periodEnd})`);

      if (q.eth.status === "warn" || q.eth.status === "fail") {
        console.log(`  ETH: ${q.eth.status.toUpperCase()}`);
        console.log(`    XBRL: ${formatNumber(q.eth.xbrlHoldings)} ETH`);
        console.log(`    Press Release: ${formatNumber(q.eth.pressReleaseHoldings)} ETH`);
        console.log(`    Discrepancy: ${formatNumber(q.eth.discrepancy)} ETH (${formatPct(q.eth.discrepancyPct)})`);
        console.log(`    Notes: ${q.eth.notes}`);
      }

      if (q.shares.status === "warn" || q.shares.status === "fail") {
        console.log(`  Shares: ${q.shares.status.toUpperCase()}`);
        console.log(`    XBRL: ${formatNumber(q.shares.xbrlShares)} shares`);
        console.log(`    Press Release: ${formatNumber(q.shares.pressReleaseShares)} shares`);
        console.log(`    Discrepancy: ${formatNumber(q.shares.discrepancy)} shares (${formatPct(q.shares.discrepancyPct)})`);
        console.log(`    Notes: ${q.shares.notes}`);
      }

      console.log();
    });
  } else {
    console.log("No discrepancies found (all within 5% threshold).");
    console.log();
  }

  // All Quarters
  console.log("ALL QUARTERS");
  console.log("-".repeat(80));
  console.log("Quarter".padEnd(20) + "ETH Status".padEnd(15) + "Shares Status".padEnd(15) + "Verified");
  console.log("-".repeat(80));
  report.quarters.forEach((q) => {
    const quarterStr = q.quarter.padEnd(20);
    const ethStr = q.eth.status.padEnd(15);
    const sharesStr = q.shares.status.padEnd(15);
    const verifiedStr = q.verification.isFullyVerified ? "YES" : "NO";
    console.log(`${quarterStr}${ethStr}${sharesStr}${verifiedStr}`);
  });
  console.log();

  // Unverified Data Points
  const unverified = getUnverifiedDataPoints(report);
  console.log("UNVERIFIED DATA POINTS (Press Releases)");
  console.log("-".repeat(80));
  console.log(`Total: ${unverified.length} of ${unverified.length + 1} (${report.auditFindings.pressReleaseReliance.toFixed(1)}%)`);
  console.log();
  console.log("Date".padEnd(15) + "ETH Holdings".padEnd(20) + "Shares".padEnd(20) + "Source");
  console.log("-".repeat(80));
  unverified.forEach((point) => {
    console.log(
      point.date.padEnd(15) +
        formatNumber(point.holdings).padEnd(20) +
        formatNumber(point.shares).padEnd(20) +
        point.source
    );
  });
  console.log();

  console.log("=" .repeat(80));
  console.log("END OF REPORT");
  console.log("=" .repeat(80));
}

main();
