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
 * Output: Ranked list of companies by audit priority (highest risk first).
 *
 * Usage:
 *   npx tsx scripts/audit-mnav.ts                  # Full audit with live prices
 *   npx tsx scripts/audit-mnav.ts --ticker=GAME    # Single company
 *   npx tsx scripts/audit-mnav.ts --json           # Machine-readable output
 *   npx tsx scripts/audit-mnav.ts --verbose        # Show component breakdown
 *   npx tsx scripts/audit-mnav.ts --offline        # Skip live price fetch
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const companiesPath = path.join(__dirname, "..", "src", "lib", "data", "companies.ts");

const PROD_URL = "https://dat-tracker-next.vercel.app";

// ── Types ───────────────────────────────────────────────────────────

interface CompanyAudit {
  ticker: string;
  name: string;
  asset: string;
  isMiner: boolean;

  // Holdings
  holdings: number;
  holdingsLastUpdated: string | null;
  hasDynamicHoldings: boolean;

  // Balance sheet
  sharesForMnav: number | null;
  hasDynamicShares: boolean;
  sharesAsOf: string | null;
  totalDebt: number;
  debtAsOf: string | null;
  cashReserves: number;
  cashAsOf: string | null;
  preferredEquity: number;
  preferredAsOf: string | null;
  restrictedCash: number;

  // Complexity flags
  hasSecondaryHoldings: boolean;
  hasCryptoInvestments: boolean;
  hasMultiHoldings: boolean;
  hasPreferredEquity: boolean;
  hasRestrictedCash: boolean;
  isForeignStock: boolean;
  pendingMerger: boolean;

  // Computed
  tier: number;
}

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

  // Live mNAV (if prices available)
  liveMnav: number | null;
  mnavSource: string | null;
}

interface AuditFlag {
  category: "outlier" | "staleness" | "complexity" | "missing" | "structural";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
}

interface LivePrices {
  crypto: Record<string, { price: number }>;
  stocks: Record<string, { price: number; marketCap: number }>;
}

// ── Extract companies from source ───────────────────────────────────

function extractCompanies(): CompanyAudit[] {
  const content = fs.readFileSync(companiesPath, "utf-8");
  const companies: CompanyAudit[] = [];

  const blocks = content.split(/\n  \{/).slice(1);

  for (const block of blocks) {
    const get = (key: string): string | null => {
      const m = block.match(new RegExp(`${key}:\\s*["'\`]([^"'\`]*)["'\`]`));
      return m?.[1] ?? null;
    };

    // Check if a field uses a dynamic reference (variable, function call, PROVENANCE)
    const isDynamic = (key: string): boolean => {
      const m = block.match(new RegExp(`${key}:\\s*([^,\\n]+)`));
      if (!m) return false;
      const value = m[1].trim();
      // Dynamic if it starts with a letter (variable/function) and isn't a quoted string or number
      return /^[A-Za-z]/.test(value) && !/^["'`]/.test(value) && !/^(true|false|null|undefined|\d)/.test(value);
    };

    // Get string value, including from dynamic PROVENANCE patterns
    const getStr = (key: string): string | null => {
      // First try quoted string (most common)
      const quoted = get(key);
      if (quoted) return quoted;
      // Check if it's a dynamic reference — return null but flag it
      return null;
    };

    const getNum = (key: string): number | null => {
      // PROVENANCE pattern: `PROVENANCE.field?.value || 720_737`
      const provM = block.match(new RegExp(`${key}:\\s*\\w+\\.\\w+.*\\|\\|\\s*([\\d_]+\\.?[\\d_]*)`));
      if (provM) return parseFloat(provM[1].replace(/_/g, ""));
      // Nullish coalescing: `PROVENANCE.field?.value ?? 11_542`
      const provM2 = block.match(new RegExp(`${key}:\\s*\\w+\\.\\w+.*\\?\\?\\s*([\\d_]+\\.?[\\d_]*)`));
      if (provM2) return parseFloat(provM2[1].replace(/_/g, ""));
      // Plain number
      const m = block.match(new RegExp(`${key}:\\s*([\\d_]+\\.?[\\d_]*)`));
      if (!m) return null;
      return parseFloat(m[1].replace(/_/g, ""));
    };
    const getBool = (key: string): boolean => block.includes(`${key}: true`);

    const ticker = get("ticker");
    if (!ticker) continue;

    const isForeignStock = /\.(T|HK|ST|DU|AX)$/.test(ticker) || ticker === "ALTBG";

    companies.push({
      ticker,
      name: get("name") || ticker,
      asset: get("asset") || "?",
      isMiner: getBool("isMiner"),
      holdings: getNum("holdings") ?? 0,
      holdingsLastUpdated: getStr("holdingsLastUpdated"),
      hasDynamicHoldings: isDynamic("holdingsLastUpdated"),
      sharesForMnav: getNum("sharesForMnav"),
      hasDynamicShares: isDynamic("sharesForMnav"),
      sharesAsOf: getStr("sharesAsOf"),
      totalDebt: getNum("totalDebt") ?? 0,
      debtAsOf: getStr("debtAsOf"),
      cashReserves: getNum("cashReserves") ?? 0,
      cashAsOf: getStr("cashAsOf"),
      preferredEquity: getNum("preferredEquity") ?? 0,
      preferredAsOf: getStr("preferredAsOf"),
      restrictedCash: getNum("restrictedCash") ?? 0,
      hasSecondaryHoldings: block.includes("secondaryCryptoHoldings:"),
      hasCryptoInvestments: block.includes("cryptoInvestments:"),
      hasMultiHoldings: block.includes("multiHoldings:"),
      hasPreferredEquity: (getNum("preferredEquity") ?? 0) > 0,
      hasRestrictedCash: (getNum("restrictedCash") ?? 0) > 0,
      isForeignStock,
      pendingMerger: getBool("pendingMerger"),
      tier: getNum("tier") ?? 2,
    });
  }

  return companies;
}

// ── Fetch live prices from production ───────────────────────────────

async function fetchLivePrices(): Promise<LivePrices | null> {
  try {
    const resp = await fetch(`${PROD_URL}/api/prices`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return await resp.json() as LivePrices;
  } catch {
    return null;
  }
}

// ── Simple mNAV calculator (no dilution — static inputs only) ───────

function calculateSimpleMnav(
  co: CompanyAudit,
  prices: LivePrices,
): { mnav: number; source: string } | null {
  // Get crypto price
  const cryptoPrice = prices.crypto[co.asset]?.price;
  if (!cryptoPrice || co.holdings <= 0) return null;

  // Get market cap
  let marketCap: number | null = null;
  let source = "";
  const stockData = prices.stocks[co.ticker];

  if (co.sharesForMnav && co.sharesForMnav > 0 && stockData?.price) {
    marketCap = co.sharesForMnav * stockData.price;
    source = `${fmtM(co.sharesForMnav)} shares × $${stockData.price.toFixed(2)}`;
  } else if (stockData?.marketCap && stockData.marketCap > 0) {
    marketCap = stockData.marketCap;
    source = `API mcap $${fmtM(marketCap)}`;
  }

  if (!marketCap || marketCap <= 0) return null;

  // Crypto NAV (primary only — secondary/investments not extracted by regex)
  const cryptoNav = co.holdings * cryptoPrice;
  if (cryptoNav <= 0) return null;

  // EV
  const freeCash = co.cashReserves - co.restrictedCash;
  const ev = marketCap + co.totalDebt + co.preferredEquity - freeCash;

  const totalNav = cryptoNav + co.restrictedCash;
  const mnav = ev / totalNav;

  return { mnav, source };
}

// ── Staleness helpers ───────────────────────────────────────────────

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Scoring ─────────────────────────────────────────────────────────

function auditCompany(co: CompanyAudit, prices: LivePrices | null): AuditResult {
  const flags: AuditFlag[] = [];
  let outlierScore = 0;
  let stalenessScore = 0;
  let complexityScore = 0;

  // ── 0. LIVE mNAV (if prices available) ────────────────────────
  let liveMnav: number | null = null;
  let mnavSource: string | null = null;

  if (prices && !co.pendingMerger) {
    const result = calculateSimpleMnav(co, prices);
    if (result) {
      liveMnav = result.mnav;
      mnavSource = result.source;

      // Outlier scoring based on live mNAV
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

  const holdingsDays = daysSince(co.holdingsLastUpdated);
  const sharesDays = daysSince(co.sharesAsOf);
  const debtDays = daysSince(co.debtAsOf);
  const cashDays = daysSince(co.cashAsOf);
  const preferredDays = daysSince(co.preferredAsOf);

  // Holdings staleness (skip if dynamic — value exists but regex can't read date)
  if (holdingsDays !== null && holdingsDays > 180) {
    stalenessScore += 3;
    flags.push({ category: "staleness", severity: "HIGH", message: `Holdings ${holdingsDays}d old (${co.holdingsLastUpdated})` });
  } else if (holdingsDays !== null && holdingsDays > 90) {
    stalenessScore += 1;
    flags.push({ category: "staleness", severity: "MEDIUM", message: `Holdings ${holdingsDays}d old (${co.holdingsLastUpdated})` });
  } else if (holdingsDays === null && !co.hasDynamicHoldings) {
    stalenessScore += 2;
    flags.push({ category: "missing", severity: "MEDIUM", message: "No holdingsLastUpdated date" });
  }
  // If dynamic, it exists — just not readable. No penalty.

  // Shares staleness
  if (sharesDays !== null && sharesDays > 180) {
    stalenessScore += 2;
    flags.push({ category: "staleness", severity: "HIGH", message: `Shares ${sharesDays}d old (${co.sharesAsOf})` });
  } else if (sharesDays !== null && sharesDays > 120) {
    stalenessScore += 1;
    flags.push({ category: "staleness", severity: "MEDIUM", message: `Shares ${sharesDays}d old (${co.sharesAsOf})` });
  } else if (co.sharesForMnav !== null && sharesDays === null && !co.hasDynamicShares) {
    stalenessScore += 1;
    flags.push({ category: "missing", severity: "LOW", message: "Has sharesForMnav but no sharesAsOf date" });
  }

  // Debt staleness (only if material debt)
  if (co.totalDebt > 0) {
    if (debtDays !== null && debtDays > 180) {
      stalenessScore += 2;
      flags.push({ category: "staleness", severity: "HIGH", message: `Debt ${debtDays}d old — $${fmtM(co.totalDebt)} (${co.debtAsOf})` });
    } else if (debtDays !== null && debtDays > 120) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Debt ${debtDays}d old — $${fmtM(co.totalDebt)} (${co.debtAsOf})` });
    } else if (debtDays === null) {
      stalenessScore += 2;
      flags.push({ category: "missing", severity: "HIGH", message: `Has $${fmtM(co.totalDebt)} debt but no debtAsOf date` });
    }
  }

  // Cash staleness
  if (co.cashReserves > 0) {
    if (cashDays !== null && cashDays > 180) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Cash ${cashDays}d old — $${fmtM(co.cashReserves)} (${co.cashAsOf})` });
    } else if (cashDays === null) {
      stalenessScore += 1;
      flags.push({ category: "missing", severity: "LOW", message: `Has $${fmtM(co.cashReserves)} cash but no cashAsOf date` });
    }
  }

  // Preferred staleness
  if (co.preferredEquity > 0) {
    if (preferredDays !== null && preferredDays > 365) {
      stalenessScore += 2;
      flags.push({ category: "staleness", severity: "HIGH", message: `Preferred ${preferredDays}d old — $${fmtM(co.preferredEquity)} (${co.preferredAsOf})` });
    } else if (preferredDays !== null && preferredDays > 180) {
      stalenessScore += 1;
      flags.push({ category: "staleness", severity: "MEDIUM", message: `Preferred ${preferredDays}d old — $${fmtM(co.preferredEquity)} (${co.preferredAsOf})` });
    } else if (preferredDays === null) {
      stalenessScore += 2;
      flags.push({ category: "missing", severity: "HIGH", message: `Has $${fmtM(co.preferredEquity)} preferred but no preferredAsOf date` });
    }
  }

  // ── 2. COMPLEXITY ─────────────────────────────────────────────

  if (co.hasSecondaryHoldings) {
    complexityScore += 2;
    flags.push({ category: "complexity", severity: "MEDIUM", message: "Has secondary crypto holdings (multi-asset)" });
  }
  if (co.hasCryptoInvestments) {
    complexityScore += 3;
    flags.push({ category: "complexity", severity: "HIGH", message: "Has crypto investments (fund/LST/equity) — double-counting risk" });
  }
  if (co.hasMultiHoldings) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: "Has D1 multiHoldings overlay" });
  }
  if (co.hasPreferredEquity) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Preferred equity: $${fmtM(co.preferredEquity)}` });
  }
  if (co.hasRestrictedCash) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Restricted cash: $${fmtM(co.restrictedCash)}` });
  }
  if (co.isForeignStock) {
    complexityScore += 2;
    flags.push({ category: "complexity", severity: "MEDIUM", message: "Foreign stock — forex rate dependency" });
  }
  if (co.totalDebt > 100_000_000) {
    complexityScore += 1;
    flags.push({ category: "complexity", severity: "LOW", message: `Large debt: $${fmtM(co.totalDebt)}` });
  }
  if (co.totalDebt > 1_000_000_000) {
    complexityScore += 1;
  }

  // ── 3. STRUCTURAL CHECKS ─────────────────────────────────────

  // Missing sharesForMnav — only flag if not dynamic
  if (co.sharesForMnav === null && !co.hasDynamicShares && !co.pendingMerger) {
    outlierScore += 3;
    flags.push({ category: "missing", severity: "HIGH", message: "No sharesForMnav — mNAV falls back to API market cap" });
  }

  if (co.holdings === 0 && !co.pendingMerger) {
    outlierScore += 3;
    flags.push({ category: "structural", severity: "HIGH", message: "Zero holdings — mNAV is undefined" });
  }

  if (co.cashReserves === 0 && co.cashAsOf === null && co.totalDebt > 0) {
    outlierScore += 1;
    flags.push({ category: "missing", severity: "MEDIUM", message: "Has debt but no cash data — EV may be overstated" });
  }

  if (co.totalDebt === 0 && co.debtAsOf === null && !co.pendingMerger) {
    flags.push({ category: "missing", severity: "LOW", message: "No debt data (may be correct if debt-free)" });
  }

  if (co.pendingMerger) {
    flags.push({ category: "structural", severity: "LOW", message: "Pending merger — mNAV not meaningful" });
  }

  // Unusual capital structure
  if (co.totalDebt > 0 && co.preferredEquity > co.totalDebt) {
    flags.push({ category: "structural", severity: "MEDIUM", message: `Preferred ($${fmtM(co.preferredEquity)}) exceeds debt ($${fmtM(co.totalDebt)}) — unusual capital structure` });
  }

  const totalScore = outlierScore + stalenessScore + complexityScore;

  return {
    ticker: co.ticker,
    name: co.name,
    asset: co.asset,
    isMiner: co.isMiner,
    outlierScore,
    stalenessScore,
    complexityScore,
    totalScore,
    flags,
    liveMnav,
    mnavSource,
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
  if (days === null) return `\x1b[31m??${RESET}`;
  if (days <= 45) return `\x1b[32m${days}d${RESET}`;
  if (days <= 90) return `${days}d`;
  if (days <= 120) return `\x1b[33m${days}d${RESET}`;
  if (days <= 180) return `\x1b[31m${days}d${RESET}`;
  return `\x1b[31;1m${days}d${RESET}`;
}

// ── Main ────────────────────────────────────────────────────────────

async function run() {
  const companies = extractCompanies();
  const tickerFilter = process.argv.find(a => a.startsWith("--ticker="))?.split("=")[1]?.toUpperCase();
  const jsonMode = process.argv.includes("--json");
  const verbose = process.argv.includes("--verbose");
  const offline = process.argv.includes("--offline");

  // Fetch live prices
  let prices: LivePrices | null = null;
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
  console.log("=".repeat(78));
  console.log();

  // ── mNAV overview (sorted by mNAV) ──
  if (prices) {
    const withMnav = results.filter(r => r.liveMnav !== null).sort((a, b) => a.liveMnav! - b.liveMnav!);
    const suspicious = withMnav.filter(r => r.liveMnav! < 0.8 || r.liveMnav! > 2.5);

    console.log(`${BOLD}LIVE mNAV OVERVIEW${RESET}  (${withMnav.length} calculable, ${suspicious.length} suspicious)`);
    console.log();

    // Show mNAV table: all companies sorted by mNAV
    console.log("  " + "Ticker".padEnd(10) + "mNAV".padEnd(10) + "Asset".padEnd(6) + "Debt".padEnd(12) + "Pref".padEnd(12) + "Cash".padEnd(12) + "Score");
    console.log("  " + "-".repeat(68));

    for (const r of withMnav) {
      const co = filtered.find(c => c.ticker === r.ticker)!;
      const mnavStr = colorMnav(r.liveMnav);
      const scoreStr = r.totalScore > 0 ? `${r.totalScore}` : `${DIM}0${RESET}`;
      console.log(
        "  " +
        r.ticker.padEnd(10) +
        mnavStr.padEnd(10 + 9) + // +9 for ANSI
        r.asset.padEnd(6) +
        (co.totalDebt > 0 ? `$${fmtM(co.totalDebt)}` : `${DIM}—${RESET}`).padEnd(12 + (co.totalDebt > 0 ? 0 : 9)) +
        (co.preferredEquity > 0 ? `$${fmtM(co.preferredEquity)}` : `${DIM}—${RESET}`).padEnd(12 + (co.preferredEquity > 0 ? 0 : 9)) +
        (co.cashReserves > 0 ? `$${fmtM(co.cashReserves)}` : `${DIM}—${RESET}`).padEnd(12 + (co.cashReserves > 0 ? 0 : 9)) +
        scoreStr
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
  console.log("  " + "-".repeat(10) + "-".repeat(14) + "-".repeat(14) + "-".repeat(14) + "-".repeat(14) + "-".repeat(14));

  const forHeatmap = filtered
    .map(co => ({
      ticker: co.ticker,
      holdings: co.hasDynamicHoldings ? -2 : daysSince(co.holdingsLastUpdated),
      shares: co.hasDynamicShares ? -2 : daysSince(co.sharesAsOf),
      debt: co.totalDebt > 0 ? daysSince(co.debtAsOf) : -1,
      cash: co.cashReserves > 0 ? daysSince(co.cashAsOf) : -1,
      preferred: co.preferredEquity > 0 ? daysSince(co.preferredAsOf) : -1,
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
      colorDaysExt(row.holdings).padEnd(14 + 9) +
      colorDaysExt(row.shares).padEnd(14 + 9) +
      colorDaysExt(row.debt).padEnd(14 + 9) +
      colorDaysExt(row.cash).padEnd(14 + 9) +
      colorDaysExt(row.preferred).padEnd(14 + 9)
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
  console.log();
  console.log(`  ${BOLD}${r.ticker}${RESET} ${r.name} (${r.asset})${minerTag}  ${DIM}${scoreStr}${RESET}${mnavTag}`);
  if (showFlags) {
    for (const f of r.flags) {
      if (f.severity === "LOW" && !process.argv.includes("--verbose")) continue;
      const color = severityColor(f.severity);
      console.log(`    ${color}${f.severity.padEnd(6)}${RESET} ${f.message}`);
    }
  } else {
    const highFlags = r.flags.filter(f => f.severity === "HIGH" || f.severity === "MEDIUM");
    if (highFlags.length > 0) {
      console.log(`    ${highFlags.map(f => `${severityColor(f.severity)}${f.message}${RESET}`).join("; ")}`);
    }
  }
}

function colorDaysExt(days: number | null): string {
  if (days === -2) return `\x1b[36mdyn${RESET}`;  // cyan for dynamic
  return colorDays(days);
}

run();
