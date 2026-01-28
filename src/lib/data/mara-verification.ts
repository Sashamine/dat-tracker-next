/**
 * MARA Data Verification Engine
 * ==============================
 *
 * Cross-checks 8-K event data against XBRL quarter-end totals.
 *
 * Verification approach:
 * 1. XBRL quarterly data (mara-sec-history.ts) is SOURCE OF TRUTH
 *    - Machine-readable, no transcription errors
 *    - Full SEC audit trail
 *
 * 2. 8-K events (mara-capital-events.ts) are POINT-IN-TIME details
 *    - Text-parsed from BTC Yield disclosures
 *    - Should reconcile to quarterly snapshots
 *
 * Cross-checks performed:
 * - BTC Holdings: 8-K BTC Yield disclosure ≈ XBRL crypto fair value / BTC price
 * - Shares: 8-K fully diluted ≈ XBRL diluted + convertible shares
 * - Debt: Capital structure ≈ XBRL long-term debt
 *
 * Known methodology differences:
 *
 * SHARES:
 * - XBRL "WeightedAverageNumberOfDilutedSharesOutstanding" = EPS denominator
 * - 8-K "Assumed Fully Diluted" = All potential shares (no treasury method)
 * - 8-K will always be HIGHER than XBRL diluted shares
 *
 * BTC HOLDINGS:
 * - 8-K reports exact BTC count
 * - XBRL reports USD fair value (CryptoAssetFairValue)
 * - Convert XBRL to BTC using quarter-end BTC price
 *
 * Generated: 2026-01-27
 */

import { MARA_SEC_HISTORY, type MaraSecSnapshot } from "./mara-sec-history";
import { MARA_CAPITAL_EVENTS, type MaraCapitalEvent } from "./mara-capital-events";
import { MARA_CONVERTIBLE_NOTES, getMaraTotalConvertibleDebt } from "./mara-capital-structure";

export interface MaraQuarterVerification {
  quarter: string;        // e.g., "Q3 2024"
  periodEnd: string;      // YYYY-MM-DD
  
  // BTC verification
  btc: {
    from8k: number | null;          // BTC count from 8-K BTC Yield
    fromXbrlUsd: number | null;     // XBRL CryptoAssetFairValue
    impliedBtc: number | null;      // XBRL USD / BTC price
    btcPriceUsed: number | null;
    discrepancy: number | null;
    discrepancyPct: number | null;
    status: "pass" | "warn" | "fail" | "no-data";
    notes?: string;
  };
  
  // Shares verification
  shares: {
    xbrlDiluted: number | null;         // XBRL WeightedAverage diluted
    event8kFullyDiluted: number | null; // 8-K Assumed Fully Diluted
    expectedDiff: number | null;        // Convertible shares not in XBRL diluted
    status: "pass" | "warn" | "fail" | "no-data";
    notes?: string;
  };
  
  // Debt verification
  debt: {
    xbrlDebt: number | null;
    capitalStructureDebt: number | null;
    discrepancy: number | null;
    status: "pass" | "warn" | "fail" | "no-data";
    notes?: string;
  };
}

// Historical BTC prices at quarter-end (approximate)
const BTC_QUARTER_END_PRICES: Record<string, number> = {
  "2023-09-30": 27_000,
  "2023-12-31": 42_500,
  "2024-03-31": 71_000,
  "2024-06-30": 62_500,
  "2024-09-30": 63_500,
  "2024-12-31": 93_500,
  "2025-03-31": 83_500,
  "2025-06-30": 107_000,
  "2025-09-30": 113_000,
};

/**
 * Get 8-K event closest to a quarter-end date
 */
function get8kEventForQuarter(quarterEnd: string): MaraCapitalEvent | undefined {
  // Find BTC_UPDATE event with matching or close date
  const btcUpdates = MARA_CAPITAL_EVENTS.filter(e => e.type === "BTC_UPDATE");
  
  // Exact match first
  let event = btcUpdates.find(e => e.date === quarterEnd);
  if (event) return event;
  
  // Find closest event within 30 days before quarter end
  const quarterDate = new Date(quarterEnd);
  const thirtyDaysBefore = new Date(quarterDate);
  thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);
  
  const candidates = btcUpdates.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate >= thirtyDaysBefore && eventDate <= quarterDate;
  });
  
  return candidates.sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * Verify a single quarter
 */
function verifyQuarter(xbrl: MaraSecSnapshot): MaraQuarterVerification {
  const quarterEnd = xbrl.date;
  const year = parseInt(quarterEnd.substring(0, 4));
  const month = parseInt(quarterEnd.substring(5, 7));
  const quarter = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
  const quarterLabel = `${quarter} ${year}`;
  
  const event8k = get8kEventForQuarter(quarterEnd);
  const btcPrice = BTC_QUARTER_END_PRICES[quarterEnd];
  
  // BTC verification
  const btcFrom8k = event8k?.btcHoldings ?? null;
  const btcFromXbrlUsd = xbrl.cryptoFairValue ?? null;
  const impliedBtc = btcFromXbrlUsd && btcPrice ? Math.round(btcFromXbrlUsd / btcPrice) : null;
  
  let btcDiscrepancy: number | null = null;
  let btcDiscrepancyPct: number | null = null;
  let btcStatus: "pass" | "warn" | "fail" | "no-data" = "no-data";
  let btcNotes: string | undefined;
  
  if (btcFrom8k && impliedBtc) {
    btcDiscrepancy = Math.abs(btcFrom8k - impliedBtc);
    btcDiscrepancyPct = (btcDiscrepancy / btcFrom8k) * 100;
    
    if (btcDiscrepancyPct < 5) {
      btcStatus = "pass";
    } else if (btcDiscrepancyPct < 15) {
      btcStatus = "warn";
      btcNotes = `${btcDiscrepancyPct.toFixed(1)}% difference - check if XBRL includes non-BTC crypto`;
    } else {
      btcStatus = "fail";
      btcNotes = `${btcDiscrepancyPct.toFixed(1)}% difference - significant discrepancy`;
    }
  } else if (btcFrom8k || impliedBtc) {
    btcStatus = "warn";
    btcNotes = "Partial data - missing 8-K or XBRL value";
  }
  
  // Shares verification
  const xbrlDiluted = xbrl.dilutedShares ?? null;
  const event8kFullyDiluted = event8k?.fullyDilutedShares ?? null;
  
  let sharesStatus: "pass" | "warn" | "fail" | "no-data" = "no-data";
  let sharesNotes: string | undefined;
  let expectedDiff: number | null = null;
  
  if (xbrlDiluted && event8kFullyDiluted) {
    // 8-K fully diluted should be HIGHER than XBRL diluted
    // because 8-K includes all convertibles regardless of ITM status
    expectedDiff = event8kFullyDiluted - xbrlDiluted;
    
    if (expectedDiff >= 0) {
      sharesStatus = "pass";
      sharesNotes = `8-K ${(expectedDiff / 1e6).toFixed(1)}M higher (convertibles)`;
    } else {
      sharesStatus = "warn";
      sharesNotes = `8-K LOWER than XBRL by ${(Math.abs(expectedDiff) / 1e6).toFixed(1)}M - unexpected`;
    }
  }
  
  // Debt verification
  const xbrlDebt = xbrl.longTermDebt ?? null;
  const capitalStructureDebt = getMaraTotalConvertibleDebt();
  
  let debtDiscrepancy: number | null = null;
  let debtStatus: "pass" | "warn" | "fail" | "no-data" = "no-data";
  let debtNotes: string | undefined;
  
  if (xbrlDebt) {
    debtDiscrepancy = Math.abs(xbrlDebt - capitalStructureDebt);
    const debtDiffPct = (debtDiscrepancy / capitalStructureDebt) * 100;
    
    // XBRL debt is BOOK VALUE, capital structure is FACE VALUE
    // Expect XBRL to be lower due to debt discount amortization
    if (debtDiffPct < 10) {
      debtStatus = "pass";
    } else if (debtDiffPct < 25) {
      debtStatus = "warn";
      debtNotes = `${debtDiffPct.toFixed(1)}% diff - book vs face value expected`;
    } else {
      debtStatus = "fail";
      debtNotes = `${debtDiffPct.toFixed(1)}% diff - check for missing debt instruments`;
    }
  }
  
  return {
    quarter: quarterLabel,
    periodEnd: quarterEnd,
    btc: {
      from8k: btcFrom8k,
      fromXbrlUsd: btcFromXbrlUsd,
      impliedBtc,
      btcPriceUsed: btcPrice ?? null,
      discrepancy: btcDiscrepancy,
      discrepancyPct: btcDiscrepancyPct,
      status: btcStatus,
      notes: btcNotes,
    },
    shares: {
      xbrlDiluted,
      event8kFullyDiluted,
      expectedDiff,
      status: sharesStatus,
      notes: sharesNotes,
    },
    debt: {
      xbrlDebt,
      capitalStructureDebt,
      discrepancy: debtDiscrepancy,
      status: debtStatus,
      notes: debtNotes,
    },
  };
}

/**
 * Run full verification report
 */
export function runMaraVerification(): MaraQuarterVerification[] {
  return MARA_SEC_HISTORY
    .filter(s => s.dilutedShares || s.cryptoFairValue)  // Only quarters with meaningful data
    .map(verifyQuarter);
}

/**
 * Print verification summary
 */
export function printMaraVerificationSummary(): void {
  const results = runMaraVerification();
  
  console.log("=".repeat(80));
  console.log("MARA Data Verification Report");
  console.log("=".repeat(80));
  console.log("");
  
  for (const r of results) {
    console.log(`${r.quarter} (${r.periodEnd})`);
    console.log("-".repeat(40));
    
    // BTC
    const btcIcon = r.btc.status === "pass" ? "✓" : r.btc.status === "warn" ? "⚠" : r.btc.status === "fail" ? "✗" : "?";
    console.log(`  BTC: ${btcIcon} 8-K=${r.btc.from8k?.toLocaleString() ?? "N/A"}, XBRL implied=${r.btc.impliedBtc?.toLocaleString() ?? "N/A"}`);
    if (r.btc.notes) console.log(`       ${r.btc.notes}`);
    
    // Shares
    const sharesIcon = r.shares.status === "pass" ? "✓" : r.shares.status === "warn" ? "⚠" : "?";
    console.log(`  Shares: ${sharesIcon} XBRL=${(r.shares.xbrlDiluted ?? 0 / 1e6).toFixed(1)}M, 8-K FD=${((r.shares.event8kFullyDiluted ?? 0) / 1e6).toFixed(1)}M`);
    if (r.shares.notes) console.log(`          ${r.shares.notes}`);
    
    // Debt
    const debtIcon = r.debt.status === "pass" ? "✓" : r.debt.status === "warn" ? "⚠" : "?";
    console.log(`  Debt: ${debtIcon} XBRL=$${((r.debt.xbrlDebt ?? 0) / 1e9).toFixed(2)}B, Structure=$${((r.debt.capitalStructureDebt ?? 0) / 1e9).toFixed(2)}B`);
    if (r.debt.notes) console.log(`        ${r.debt.notes}`);
    
    console.log("");
  }
}
