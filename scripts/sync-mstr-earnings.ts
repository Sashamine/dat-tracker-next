/**
 * Sync MSTR Earnings Data with SEC-Verified Sources
 * ==================================================
 *
 * This script extracts the correct MSTR data from:
 * - mstr-sec-history.ts (shares outstanding from XBRL)
 * - mstr-capital-events.ts (BTC holdings from 8-K filings)
 *
 * And outputs the corrected earnings data for manual update.
 */

import { MSTR_SEC_HISTORY } from "../src/lib/data/mstr-sec-history";
import { MSTR_CAPITAL_EVENTS } from "../src/lib/data/mstr-capital-events";

interface QuarterData {
  periodEnd: string;
  fiscalYear: number;
  fiscalQuarter: number;
  btcHoldings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
}

// Find BTC holdings closest to a date
function getBtcHoldingsAtDate(targetDate: string): number {
  // Find the event closest to (but not after) the target date
  let closestEvent = null;
  let closestDiff = Infinity;

  for (const event of MSTR_CAPITAL_EVENTS) {
    if (event.type !== "BTC" || !event.btcCumulative) continue;

    const eventDate = new Date(event.date);
    const target = new Date(targetDate);

    // Only consider events on or before the target
    if (eventDate <= target) {
      const diff = Math.abs(target.getTime() - eventDate.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestEvent = event;
      }
    }
  }

  return closestEvent?.btcCumulative || 0;
}

// Map period end to fiscal quarter
function getFiscalQuarter(periodEnd: string): { year: number; quarter: number } {
  const date = new Date(periodEnd);
  const month = date.getMonth(); // 0-11

  // MSTR fiscal year = calendar year
  const year = date.getFullYear();

  if (month === 2) return { year, quarter: 1 }; // Mar = Q1
  if (month === 5) return { year, quarter: 2 }; // Jun = Q2
  if (month === 8) return { year, quarter: 3 }; // Sep = Q3
  if (month === 11) return { year, quarter: 4 }; // Dec = Q4

  throw new Error(`Invalid quarter end date: ${periodEnd}`);
}

// Process each SEC filing
const quarters: QuarterData[] = [];

for (const filing of MSTR_SEC_HISTORY) {
  // Skip old filings (before 2024)
  if (filing.periodEnd < "2024-01-01") continue;

  const btcHoldings = getBtcHoldingsAtDate(filing.periodEnd);

  // Adjust for 10:1 stock split on Aug 7, 2024
  // Pre-split shares need to be multiplied by 10
  const sharesOutstanding = filing.preSplit
    ? filing.commonSharesOutstanding * 10
    : filing.commonSharesOutstanding;

  const holdingsPerShare = btcHoldings / sharesOutstanding;

  const { year, quarter } = getFiscalQuarter(filing.periodEnd);

  quarters.push({
    periodEnd: filing.periodEnd,
    fiscalYear: year,
    fiscalQuarter: quarter,
    btcHoldings,
    sharesOutstanding,
    holdingsPerShare,
  });
}

// Sort by date descending
quarters.sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));

// Output results
console.log("\n=".repeat(80));
console.log("MSTR EARNINGS DATA - SEC-VERIFIED CORRECTIONS");
console.log("=".repeat(80));
console.log("\nUpdate the following fields in earnings-data.ts:\n");

for (const q of quarters) {
  const date = new Date(q.periodEnd);
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthName = monthNames[date.getMonth()];
  const day = date.getDate();

  console.log(`// Q${q.fiscalQuarter} ${q.fiscalYear} (${monthName} ${day}, ${q.fiscalYear})`);
  console.log(`holdingsAtQuarterEnd: ${q.btcHoldings.toFixed(0)},`);
  console.log(
    `sharesAtQuarterEnd: ${q.sharesOutstanding.toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, "_")},`
  );
  console.log(`holdingsPerShare: ${q.holdingsPerShare.toFixed(6)},`);
  console.log("");
}

console.log("\n" + "=".repeat(80));
console.log("VERIFICATION");
console.log("=".repeat(80));
console.log("\nCompare with current earnings-data.ts values to identify discrepancies.");
console.log("\nSources:");
console.log("- Shares: mstr-sec-history.ts (XBRL-verified)");
console.log("- BTC: mstr-capital-events.ts (8-K filings)");
console.log("\n");
