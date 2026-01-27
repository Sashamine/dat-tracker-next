/**
 * Generate Historical MSTR Earnings Data (2020-2023)
 * ===================================================
 *
 * Generates earnings records for MSTR from Q3 2020 through Q4 2023
 * using SEC-verified data from mstr-sec-history.ts and mstr-capital-events.ts
 */

import { MSTR_SEC_HISTORY } from "../src/lib/data/mstr-sec-history";
import { MSTR_CAPITAL_EVENTS } from "../src/lib/data/mstr-capital-events";

// Find BTC holdings closest to a date
function getBtcHoldingsAtDate(targetDate: string): number {
  let closestEvent = null;
  let closestDiff = Infinity;

  for (const event of MSTR_CAPITAL_EVENTS) {
    if (event.type !== "BTC" || !event.btcCumulative) continue;

    const eventDate = new Date(event.date);
    const target = new Date(targetDate);

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
  const month = date.getMonth();
  const year = date.getFullYear();

  if (month === 2) return { year, quarter: 1 };
  if (month === 5) return { year, quarter: 2 };
  if (month === 8) return { year, quarter: 3 };
  if (month === 11) return { year, quarter: 4 };

  throw new Error(`Invalid quarter end date: ${periodEnd}`);
}

// Earnings dates (approximate - Q typically 30 days after period end)
function estimateEarningsDate(periodEnd: string): string {
  const date = new Date(periodEnd);
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
}

// Process historical filings (2020-2023)
const records = [];

for (const filing of MSTR_SEC_HISTORY) {
  if (filing.periodEnd >= "2024-01-01") continue; // Skip 2024+
  if (filing.periodEnd < "2020-09-01") continue; // Skip before BTC treasury

  const btcHoldings = getBtcHoldingsAtDate(filing.periodEnd);
  const sharesOutstanding = filing.preSplit
    ? filing.commonSharesOutstanding * 10
    : filing.commonSharesOutstanding;
  const holdingsPerShare = btcHoldings / sharesOutstanding;
  const { year, quarter } = getFiscalQuarter(filing.periodEnd);
  const earningsDate = estimateEarningsDate(filing.periodEnd);

  records.push({
    periodEnd: filing.periodEnd,
    earningsDate,
    fiscalYear: year,
    fiscalQuarter: quarter,
    btcHoldings,
    sharesOutstanding,
    holdingsPerShare,
  });
}

// Sort by date ascending
records.sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));

// Output TypeScript code
console.log("\n// ========== Historical MSTR Earnings (2020-2023) ==========");
console.log("// Add these AFTER the Q4 2025 upcoming entry in earnings-data.ts\n");

for (const r of records) {
  const date = new Date(r.earningsDate);
  const formattedDate = date.toISOString().split("T")[0];

  console.log(`  // Q${r.fiscalQuarter} ${r.fiscalYear}`);
  console.log(`  {`);
  console.log(`    ticker: "MSTR",`);
  console.log(`    fiscalYear: ${r.fiscalYear},`);
  console.log(`    fiscalQuarter: ${r.fiscalQuarter},`);
  console.log(`    earningsDate: "${formattedDate}",`);
  console.log(`    earningsTime: "AMC",`);
  console.log(`    holdingsAtQuarterEnd: ${r.btcHoldings.toFixed(0)},`);
  console.log(
    `    sharesAtQuarterEnd: ${r.sharesOutstanding.toLocaleString("en-US", { maximumFractionDigits: 0 }).replace(/,/g, "_")},`
  );
  console.log(`    holdingsPerShare: ${r.holdingsPerShare.toFixed(6)},`);
  console.log(`    source: "sec-filing",`);
  console.log(
    `    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",`
  );
  console.log(`    status: "reported",`);
  console.log(`  },`);
}

console.log("\n// Total historical quarters added:", records.length);
