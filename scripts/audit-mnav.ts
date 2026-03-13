#!/usr/bin/env tsx
/**
 * audit-mnav.ts
 *
 * mNAV audit script — identifies companies most likely to have incorrect mNAV
 * by scoring them on three dimensions:
 *
 *   1. OUTLIER — live mNAV outside normal range (< 0.8 or > 2.5)
 *   2. STALENESS — how old are the balance sheet inputs?
 *   3. COMPLEXITY — how many error-prone features does this company have?
 *
 * Uses the SAME mNAV engine + D1 overlay as the live site, so computed mNAV
 * matches what users actually see.
 *
 * Usage:
 *   npx tsx scripts/audit-mnav.ts                  # Full audit with live prices
 *   npx tsx scripts/audit-mnav.ts --ticker=GAME    # Single company
 *   npx tsx scripts/audit-mnav.ts --json           # Machine-readable output
 *   npx tsx scripts/audit-mnav.ts --verbose        # Show component breakdown
 *   npx tsx scripts/audit-mnav.ts --offline        # Skip live price fetch
 *   npx tsx scripts/audit-mnav.ts --no-d1          # Skip D1 overlay (static only)
 */

import { allCompanies } from "../src/lib/data/companies";
import { applyD1Overlay, type D1MetricMap, type D1MetricDateMap, type D1MetricSourceMap, type D1MetricQuoteMap, type D1MetricSearchTermMap, type D1MetricAccessionMap } from "../src/lib/d1-overlay";
import { getLatestMetrics } from "../src/lib/d1";
import { CORE_D1_METRICS } from "../src/lib/metrics";
import { getCompanyMNAVDetailed, type PricesData } from "../src/lib/math/mnav-engine";
import type { Company } from "../src/lib/types";

const PROD_URL = "https://dat-tracker-next.vercel.app";

// ── Types ───────────────────────────────────────────────────────────

interface AuditResult {
  ticker: string;
  name: string;
  asset: string;
  isMiner: boolean;

  // Scores (higher = more risk)
  outlierScore: number;
  stalenessScore: number;
  complexityScore: number;
  totalScore: number;

  // Details
  flags: AuditFlag[];

  // Live mNAV (computed via real engine)
  liveMnav: number | null;
  mnavWarnings: string[];

  // D1 overlay info
  d1Fields: string[];

  // Balance sheet (for display)
  totalDebt: number;
  cashReserves: number;
  preferredEquity: number;
}

interface AuditFlag {
  category: "outlier" | "staleness" | "complexity" | "missing" | "structural";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

// ── Fetch live prices from production ───────────────────────────────

async function fetchLivePrices(): Promise<PricesData> {
  try {
    const resp = await fetch(`${PROD_URL}/api/prices`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return await resp.json() as PricesData;
  } catch {
    return null;
  }
}

// ── Fetch D1 overlay data ───────────────────────────────────────────

async function fetchD1Overlay(tickers: string[]): Promise<{
  d1: D1MetricMap;
  sources: D1MetricSourceMap;
  dates: D1MetricDateMap;
  quotes: D1MetricQuoteMap;
  searchTerms: D1MetricSearchTermMap;
  accessions: D1MetricAccessionMap;
}> {
  const d1: D1MetricMap = {};
  const sources: D1MetricSourceMap = {};
  const dates: D1MetricDateMap = {};
  const quotes: D1MetricQuoteMap = {};
  const searchTerms: D1MetricSearchTermMap = {};
  const accessions: D1MetricAccessionMap = {};

  // Batch fetch — sequential to avoid rate limits
  for (const ticker of tickers) {
    try {
      const rows = await getLatestMetrics(ticker, [...CORE_D1_METRICS]);
      const metricMap: Record<string, number> = {};
      const sourceMap: Record<string, string | null> = {};
      const dateMap: Record<string, string | null> = {};
      const quoteMap: Record<string, string | null> = {};
      const searchTermMap: Record<string, string | null> = {};
      const accessionMap: Record<string, string | null> = {};

      for (const row of rows) {
        metricMap[row.metric] = row.value;
        sourceMap[row.metric] = row.artifact?.source_url ?? null;
        dateMap[row.metric] = row.as_of ?? row.reported_at ?? null;
        quoteMap[row.metric] = row.citation_quote ?? null;
        searchTermMap[row.metric] = row.citation_search_term ?? null;
        accessionMap[row.metric] = row.artifact?.accession ?? null;
      }

      if (Object.keys(metricMap).length > 0) {
        d1[ticker] = metricMap;
        sources[ticker] = sourceMap;
        dates[ticker] = dateMap;
        quotes[ticker] = quoteMap;
        searchTerms[ticker] = searchTermMap;
        accessions[ticker] = accessionMap;
      }
    } catch (e) {
      console.error(`  [D1] Failed to fetch ${ticker}: ${(e as Error).message}`);
    }
  }

  return { d1, sources, dates, quotes, searchTerms, accessions };
}

// ── Staleness helpers ───────────────────────────────────────────────

function daysSince(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// Check if a company field uses dynamic PROVENANCE
function hasDynamicField(company: Company, field: 'holdings' | 'shares'): boolean {
  // Companies with PROVENANCE patterns have _d1Fields or dynamic data pipelines
  // Heuristic: if D1 overlay set the field, it's "dynamic" (fresh from pipeline)
  const d1Fields = (company as any)._d1Fields as string[] | undefined;
  if (field === 'holdings' && d1Fields?.includes('holdings')) return true;
  if (field === 'shares' && d1Fields?.includes('sharesForMnav')) return true;
  return false;
}

// ── Scoring ─────────────────────────────────────────────────────────

function auditCompany(co: Company, prices: PricesData): AuditResult {
  const flags: AuditFlag[] = [];
  let outlierScore = 0;
  let stalenessScore = 0;
  let complexityScore = 0;

  const d1Fields = (co as any)._d1Fields as string[] || [];

  // ── 0. LIVE mNAV (using real engine) ────────────────────────
  let liveMnav: number | null = null;
  let mnavWarnings: string[] = [];

  if (prices && !co.pendingMerger) {
    const result = getCompanyMNAVDetailed(co, prices, false);
    liveMnav = result.mnav;
    mnavWarnings = result.warnings;

    if (liveMnav !== null) {
      if (liveMnav < 0.5) {
        outlierScore += 4;
        flags.push({ category: "outlier", severity: "HIGH", message: `mNAV ${liveMnav.toFixed(2)}x — very low, likely data error or liquidating` });
      } else if (liveMnav < 0.8) {
        outlierScore += 2;
        flags.push({ category: "outlier", severity: "MEDIUM", message: `mNAV ${liveMnav.toFixed(2)}x — below typical range` });
      } else if (liveMnav > 5.0) {
        outlierScore += 3;
        flags.push({ category: "outlier", severity: "HIGH", message: `mNAV ${liveMnav.toFixed(2)}x — extremely high, check debt/preferred/shares` });
      } else if (liveMnav > 2.5) {
        outlierScore += 1;
        flags.push({ category: "outlier", severity: "MEDIUM", message: `mNAV ${liveMnav.toFixed(2)}x — elevated` });
      }
    }
  }

  // ── 1. STALENESS ──────────────────────────────────────────────
  const dynamicHoldings = hasDynamicField(co, 'holdings');
  const dynamicShares = hasDynamicField(co, 'shares');

  const holdingsDays = daysSince(co.holdingsLastUpdated);
  const sharesDays = daysSince(co.sharesAsOf);
  const debtDays = daysSince(co.debtAsOf);
  const cashDays = daysSince(co.cashAsOf);
  const preferredDays = daysSince(co.preferredAsOf);

  // Holdings staleness
  if (holdingsDays !== null && holdingsDays > 180 && !dynamicHoldings) {
    stalenessScore += 3;
    flags.push({ category: "staleness", severity: "HIGH", message: `Holdings ${holdingsDays}d old (${co.holdingsLastUpdated})` });
  } else if (holdingsDays !== null && holdingsDays > 90 && !dynamicHoldings) {
    stalenessScore += 1;
    flags.push({ category: "staleness", severity: "MEDIUM", message: `Holdings ${holdingsDays}d old (${co.holdingsLastUpdated})` });
  } else if (holdingsDays === null && !dynamicHoldings) {
    stalenessScore += 2;
    flags.push({ category: "missing", severity: "MEDIUM", message: "No holdingsLastUpdated date" });
  }

  // Shares staleness
  if (sharesDays !== null && sharesDays > 180 && !dynamicShares) {
    stalenessScore += 2;
    flags.push({ category: "staleness", severity: "HIGH", message: `Shares ${sharesDays}d old (${co.sharesAsOf})` });
  } else if (sharesDays !== null && sharesDays > 120 && !dynamicShares) {
    stalenessScore += 1;
    flags.push({ category: "staleness", severity: "MEDIUM", message: `Shares ${sharesDays}d old (${co.sharesAsOf})` });
  } else if (co.sharesForMnav && co.sharesForMnav > 0 && sharesDays === null && !dynamicShares) {
    stalenessScore += 1;
    flags.push({ category: "missing", severity: "LOW", message: "Has sharesForMnav but no sharesAsOf date" });
  }

  // Debt staleness (only if material debt)
  if ((co.totalDebt ?? 0) > 0) {
    if (debtDays !== null && debtDays > 180) {
      stalenessScore += 2;
      flags.push({ category: "staleness", severity: "HIGH", message: `Debt ${debtDays}d old — $${fmtM(co.totalDebt ?? 0)} (${co.debtAsOf})` });
    } else if (debtDays !== null && debtDays > 120) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Debt ${debtDays}d old — $${fmtM(co.totalDebt ?? 0)} (${co.debtAsOf})` });
    } else if (debtDays === null) {
      stalenessScore += 2;
      flags.push({ category: "missing", severity: "HIGH", message: `Has $${fmtM(co.totalDebt ?? 0)} debt but no debtAsOf date` });
    }
  }

  // Cash staleness
  if ((co.cashReserves ?? 0) > 0) {
    if (cashDays !== null && cashDays > 180) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Cash ${cashDays}d old — $${fmtM(co.cashReserves ?? 0)} (${co.cashAsOf})` });
    } else if (cashDays === null) {
      stalenessScore += 1;
      flags.push({ category: "missing", severity: "LOW", message: `Has $${fmtM(co.cashReserves ?? 0)} cash but no cashAsOf date` });
    }
  }

  // Preferred staleness
  if ((co.preferredEquity ?? 0) > 0) {
    if (preferredDays !== null && preferredDays > 365) {
      stalenessScore += 2;
      flags.push({ category: "staleness", severity: "HIGH", message: `Preferred ${preferredDays}d old — $${fmtM(co.preferredEquity ?? 0)} (${co.preferredAsOf})` });
    } else if (preferredDays !== null && preferredDays > 180) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Preferred ${preferredDays}d old — $${fmtM(co.preferredEquity ?? 0)} (${co.preferredAsOf})` });
    } else if (preferredDays === null) {
      stalenessScore += 2;
      flags.push({ category: "missing", severity: "HIGH", message: `Has $${fmtM(co.preferredEquity ?? 0)} preferred but no preferredAsOf date` });
    }
  }

  // ── 2. COMPLEXITY ─────────────────────────────────────────────

  if (co.secondaryCryptoHoldings && co.secondaryCryptoHoldings.length > 0) {
    complexityScore += 2;
    flags.push({ category: "complexity", severity: "MEDIUM", message: "Has secondary crypto holdings (multi-asset)" });
  }
  if (co.cryptoInvestments && co.cryptoInvestments.length > 0) {
    complexityScore += 3;
    flags.push({ category: "complexity", severity: "HIGH", message: "Has crypto investments (fund/LST/equity) — double-counting risk" });
  }
  if ((co.preferredEquity ?? 0) > 0) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Preferred equity: $${fmtM(co.preferredEquity ?? 0)}` });
  }
  if ((co.restrictedCash ?? 0) > 0) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Restricted cash: $${fmtM(co.restrictedCash ?? 0)}` });
  }
  const isForeignStock = /\.(T|HK|ST|DU|AX|SA|L|KQ|AD)$/.test(co.ticker) || co.ticker === "ALCPB";
  if (isForeignStock) {
    complexityScore += 2;
    flags.push({ category: "complexity", severity: "MEDIUM", message: "Foreign stock — forex rate dependency" });
  }
  if ((co.totalDebt ?? 0) > 100_000_000) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Large debt: $${fmtM(co.totalDebt ?? 0)}` });
  }
  if ((co.totalDebt ?? 0) > 1_000_000_000) {
    complexityScore += 1;
  }

  // ── 3. STRUCTURAL CHECKS ─────────────────────────────────────

  if (!co.sharesForMnav && !co.pendingMerger) {
    outlierScore += 3;
    flags.push({ category: "missing", severity: "HIGH", message: "No sharesForMnav — mNAV falls back to API market cap" });
  }

  if (co.holdings === 0 && !co.pendingMerger) {
    outlierScore += 3;
    flags.push({ category: "structural", severity: "HIGH", message: "Zero holdings — mNAV is undefined" });
  }

  if ((co.cashReserves ?? 0) === 0 && !co.cashAsOf && (co.totalDebt ?? 0) > 0) {
    outlierScore += 1;
    flags.push({ category: "missing", severity: "MEDIUM", message: "Has debt but no cash data — EV may be overstated" });
  }

  if ((co.totalDebt ?? 0) === 0 && !co.debtAsOf && !co.pendingMerger) {
    flags.push({ category: "missing", severity: "LOW", message: "No debt data (may be correct if debt-free)" });
  }

  if (co.pendingMerger) {
    flags.push({ category: "structural", severity: "LOW", message: "Pending merger — mNAV not meaningful" });
  }

  // Unusual capital structure
  if ((co.totalDebt ?? 0) > 0 && (co.preferredEquity ?? 0) > (co.totalDebt ?? 0)) {
    flags.push({ category: "structural", severity: "MEDIUM", message: `Preferred ($${fmtM(co.preferredEquity ?? 0)}) exceeds debt ($${fmtM(co.totalDebt ?? 0)}) — unusual capital structure` });
  }

  const totalScore = outlierScore + stalenessScore + complexityScore;

  return {
    ticker: co.ticker,
    name: co.name,
    asset: co.asset,
    isMiner: co.isMiner || false,
    outlierScore,
    stalenessScore,
    complexityScore,
    totalScore,
    flags,
    liveMnav,
    mnavWarnings,
    d1Fields,
    totalDebt: co.totalDebt ?? 0,
    cashReserves: co.cashReserves ?? 0,
    preferredEquity: co.preferredEquity ?? 0,
  };
}

// ── Formatting helpers ──────────────────────────────────────────────

function fmtM(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

function severityColor(s: "HIGH" | "MEDIUM" | "LOW"): string {
  if (s === "HIGH") return "\x1b[31m";
  if (s === "MEDIUM") return "\x1b[33m";
  return "\x1b[90m";
}
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function colorMnav(mnav: number | null): string {
  if (mnav === null) return `${DIM}—${RESET}`;
  const s = mnav.toFixed(2) + "x";
  if (mnav < 0.5) return `\x1b[31;1m${s}${RESET}`;       // bold red
  if (mnav < 0.8) return `\x1b[31m${s}${RESET}`;          // red
  if (mnav <= 1.5) return `\x1b[32m${s}${RESET}`;          // green (normal range)
  if (mnav <= 2.5) return `\x1b[33m${s}${RESET}`;          // yellow
  if (mnav <= 5.0) return `\x1b[31m${s}${RESET}`;          // red
  return `\x1b[31;1m${s}${RESET}`;                         // bold red
}

function colorDays(days: number | null): string {
  if (days === -1) return `${DIM}—${RESET}`;
  if (days === -2) return `\x1b[36mdyn${RESET}`;  // cyan for dynamic/D1
  if (days === null) return `\x1b[31m??${RESET}`;
  if (days <= 45) return `\x1b[32m${days}d${RESET}`;
  if (days <= 90) return `${days}d`;
  if (days <= 120) return `\x1b[33m${days}d${RESET}`;
  if (days <= 180) return `\x1b[31m${days}d${RESET}`;
  return `\x1b[31;1m${days}d${RESET}`;
}

// ── Main ────────────────────────────────────────────────────────────

async function run() {
  const tickerFilter = process.argv.find(a => a.startsWith("--ticker="))?.split("=")[1]?.toUpperCase();
  const jsonMode = process.argv.includes("--json");
  const verbose = process.argv.includes("--verbose");
  const offline = process.argv.includes("--offline");
  const noD1 = process.argv.includes("--no-d1");

  // Start with static companies
  let companies: Company[] = [...allCompanies];

  // Fetch D1 overlay (matches live site behavior)
  if (!noD1) {
    process.stdout.write("Fetching D1 overlay... ");
    try {
      const tickers = companies.map(c => c.ticker);
      const { d1, sources, dates, quotes, searchTerms, accessions } = await fetchD1Overlay(tickers);
      const d1Count = Object.keys(d1).length;
      companies = applyD1Overlay(companies, d1, sources, dates, quotes, searchTerms, accessions);
      console.log(`${d1Count} companies with D1 data`);
    } catch (e) {
      console.log(`FAILED: ${(e as Error).message} (using static only)`);
    }
  }

  // Fetch live prices
  let prices: PricesData = null;
  if (!offline) {
    process.stdout.write("Fetching live prices... ");
    prices = await fetchLivePrices();
    if (prices) {
      const cryptoCount = Object.keys(prices.crypto).length;
      const stockCount = Object.keys(prices.stocks).length;
      console.log(`${cryptoCount} crypto, ${stockCount} stocks`);
    } else {
      console.log("FAILED (running in offline mode)");
    }
  }

  const filtered = tickerFilter
    ? companies.filter(c => c.ticker.toUpperCase() === tickerFilter)
    : companies.filter(c => !c.pendingMerger);

  const results = filtered.map(co => auditCompany(co, prices)).sort((a, b) => b.totalScore - a.totalScore);

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // ── Header ──
  console.log();
  console.log("=".repeat(78));
  console.log(`${BOLD}mNAV AUDIT REPORT${RESET}  —  ${filtered.length} companies ranked by audit priority`);
  if (!noD1) console.log(`${DIM}Using D1 overlay (same as live site). Pass --no-d1 for static-only.${RESET}`);
  console.log("=".repeat(78));
  console.log();

  // ── mNAV overview (sorted by mNAV) ──
  if (prices) {
    const withMnav = results.filter(r => r.liveMnav !== null).sort((a, b) => a.liveMnav! - b.liveMnav!);
    const suspicious = withMnav.filter(r => r.liveMnav! < 0.8 || r.liveMnav! > 2.5);

    console.log(`${BOLD}LIVE mNAV OVERVIEW${RESET}  (${withMnav.length} calculable, ${suspicious.length} suspicious)`);
    console.log();

    console.log("  " + "Ticker".padEnd(10) + "mNAV".padEnd(10) + "Asset".padEnd(6) + "Debt".padEnd(12) + "Pref".padEnd(12) + "Cash".padEnd(12) + "Score");
    console.log("  " + "-".repeat(68));

    for (const r of withMnav) {
      const mnavStr = colorMnav(r.liveMnav);
      const scoreStr = r.totalScore > 0 ? `${r.totalScore}` : `${DIM}0${RESET}`;
      const d1Tag = r.d1Fields.length > 0 ? ` ${DIM}[D1]${RESET}` : "";
      console.log(
        "  " +
        r.ticker.padEnd(10) +
        mnavStr.padEnd(10 + 9) + // +9 for ANSI
        r.asset.padEnd(6) +
        (r.totalDebt > 0 ? `$${fmtM(r.totalDebt)}` : `${DIM}—${RESET}`).padEnd(12 + (r.totalDebt > 0 ? 0 : 9)) +
        (r.preferredEquity > 0 ? `$${fmtM(r.preferredEquity)}` : `${DIM}—${RESET}`).padEnd(12 + (r.preferredEquity > 0 ? 0 : 9)) +
        (r.cashReserves > 0 ? `$${fmtM(r.cashReserves)}` : `${DIM}—${RESET}`).padEnd(12 + (r.cashReserves > 0 ? 0 : 9)) +
        scoreStr + d1Tag
      );
    }

    const noMnav = results.filter(r => r.liveMnav === null && !filtered.find(c => c.ticker === r.ticker)?.pendingMerger);
    if (noMnav.length > 0) {
      console.log();
      console.log(`  ${DIM}No mNAV calculable: ${noMnav.map(r => r.ticker).join(", ")}${RESET}`);
    }
    console.log();
  }

  // ── Priority breakdown ──
  const high = results.filter(r => r.totalScore >= 8);
  const medium = results.filter(r => r.totalScore >= 4 && r.totalScore < 8);
  const low = results.filter(r => r.totalScore > 0 && r.totalScore < 4);
  const clean = results.filter(r => r.totalScore === 0);

  console.log(`  ${BOLD}\x1b[31mHIGH PRIORITY${RESET}   ${high.length} companies (score >= 8)`);
  console.log(`  ${BOLD}\x1b[33mMEDIUM${RESET}          ${medium.length} companies (score 4-7)`);
  console.log(`  ${DIM}LOW${RESET}             ${low.length} companies (score 1-3)`);
  console.log(`  ${DIM}CLEAN${RESET}           ${clean.length} companies (score 0)`);
  console.log();

  // ── High priority detail ──
  if (high.length > 0) {
    console.log("-".repeat(78));
    console.log(`${BOLD}\x1b[31m▶ HIGH PRIORITY — Review these first${RESET}`);
    console.log("-".repeat(78));
    for (const r of high) {
      printCompanyResult(r, true);
    }
  }

  // ── Medium priority ──
  if (medium.length > 0) {
    console.log("-".repeat(78));
    console.log(`${BOLD}\x1b[33m▶ MEDIUM PRIORITY${RESET}`);
    console.log("-".repeat(78));
    for (const r of medium) {
      printCompanyResult(r, verbose);
    }
  }

  // ── Low priority (compact) ──
  if (low.length > 0 && verbose) {
    console.log("-".repeat(78));
    console.log(`${DIM}▶ LOW PRIORITY${RESET}`);
    console.log("-".repeat(78));
    for (const r of low) {
      printCompanyResult(r, false);
    }
  } else if (low.length > 0) {
    console.log("-".repeat(78));
    console.log(`${DIM}▶ LOW PRIORITY (${low.length} companies — use --verbose to expand)${RESET}`);
    console.log("-".repeat(78));
    for (const r of low) {
      const mnavTag = r.liveMnav !== null ? ` mNAV=${r.liveMnav.toFixed(2)}x` : "";
      console.log(`  ${r.ticker.padEnd(10)} ${DIM}score=${r.totalScore}${mnavTag}  ${r.flags.filter(f => f.severity !== "LOW").map(f => f.message).join("; ") || "(minor flags only)"}${RESET}`);
    }
  }

  // ── Staleness heatmap ──
  console.log();
  console.log("-".repeat(78));
  console.log(`${BOLD}STALENESS HEATMAP${RESET}`);
  console.log("-".repeat(78));
  console.log();
  console.log("  " + "Ticker".padEnd(10) + "Holdings".padEnd(14) + "Shares".padEnd(14) + "Debt".padEnd(14) + "Cash".padEnd(14) + "Preferred".padEnd(14));
  console.log("  " + "-".repeat(80));

  const forHeatmap = filtered
    .map(co => ({
      ticker: co.ticker,
      holdings: hasDynamicField(co, 'holdings') ? -2 : daysSince(co.holdingsLastUpdated),
      shares: hasDynamicField(co, 'shares') ? -2 : daysSince(co.sharesAsOf),
      debt: (co.totalDebt ?? 0) > 0 ? daysSince(co.debtAsOf) : -1,
      cash: (co.cashReserves ?? 0) > 0 ? daysSince(co.cashAsOf) : -1,
      preferred: (co.preferredEquity ?? 0) > 0 ? daysSince(co.preferredAsOf) : -1,
    }))
    .sort((a, b) => {
      const vals = (r: typeof a) => [r.holdings, r.shares, r.debt, r.cash, r.preferred].filter(v => v !== null && v >= 0);
      const aMax = Math.max(...vals(a), 0);
      const bMax = Math.max(...vals(b), 0);
      return bMax - aMax;
    });

  for (const row of forHeatmap) {
    console.log(
      "  " +
      row.ticker.padEnd(10) +
      colorDays(row.holdings).padEnd(14 + 9) +
      colorDays(row.shares).padEnd(14 + 9) +
      colorDays(row.debt).padEnd(14 + 9) +
      colorDays(row.cash).padEnd(14 + 9) +
      colorDays(row.preferred).padEnd(14 + 9)
    );
  }

  // ── Flag distribution ──
  console.log();
  console.log("-".repeat(78));
  console.log(`${BOLD}FLAG DISTRIBUTION${RESET}`);
  console.log("-".repeat(78));
  const flagCounts: Record<string, number> = {};
  for (const r of results) {
    for (const f of r.flags) {
      const key = `${f.category}/${f.severity}`;
      flagCounts[key] = (flagCounts[key] || 0) + 1;
    }
  }
  for (const [key, count] of Object.entries(flagCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${key.padEnd(25)} ${count}`);
  }

  console.log();
}

function printCompanyResult(r: AuditResult, showFlags: boolean) {
  const scoreStr = `[${r.outlierScore}+${r.stalenessScore}+${r.complexityScore}=${r.totalScore}]`;
  const minerTag = r.isMiner ? ` ${DIM}(miner)${RESET}` : "";
  const mnavTag = r.liveMnav !== null ? `  mNAV=${colorMnav(r.liveMnav)}` : "";
  const d1Tag = r.d1Fields.length > 0 ? `  ${DIM}[D1: ${r.d1Fields.join(",")}]${RESET}` : "";
  console.log();
  console.log(`  ${BOLD}${r.ticker}${RESET} ${r.name} (${r.asset})${minerTag}  ${DIM}${scoreStr}${RESET}${mnavTag}${d1Tag}`);
  if (showFlags) {
    for (const f of r.flags) {
      if (f.severity === "LOW" && !process.argv.includes("--verbose")) continue;
      const color = severityColor(f.severity);
      console.log(`    ${color}${f.severity.padEnd(6)}${RESET} ${f.message}`);
    }
    if (r.mnavWarnings.length > 0) {
      for (const w of r.mnavWarnings) {
        console.log(`    ${DIM}⚠ ${w}${RESET}`);
      }
    }
  } else {
    const highFlags = r.flags.filter(f => f.severity === "HIGH" || f.severity === "MEDIUM");
    if (highFlags.length > 0) {
      console.log(`    ${highFlags.map(f => `${severityColor(f.severity)}${f.message}${RESET}`).join("; ")}`);
    }
  }
}

run();
