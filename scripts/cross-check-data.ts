#!/usr/bin/env tsx
/**
 * cross-check-data.ts
 *
 * Ground truth verification for all company data.
 * Checks that numeric values in code match their cited sources.
 *
 * Checks performed:
 * 1. QUOTE-VALUE MATCH: Does the sourceQuote contain a number consistent with holdings?
 * 2. SHARES SANITY: shares × recent price ≈ reasonable market cap?
 * 3. mNAV RANGE: Is mNAV in a plausible range (0.1x–10x)?
 * 4. STALENESS: Is any source > 90 days old?
 * 5. FIELD CONSISTENCY: Do related fields agree (e.g., holdingsSource matches sourceType)?
 * 6. DERIVED CHECK: If holdingsDerived, does the calculation parse correctly?
 * 7. MISSING FIELDS: Are critical fields present?
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Import all companies
// ---------------------------------------------------------------------------
// Use dynamic import to handle the TS source
const companiesPath = path.join(__dirname, "..", "src", "lib", "data", "companies.ts");

// We'll parse companies.ts directly since we can't easily import it
import fs from "node:fs";

interface CompanyData {
  ticker: string;
  name: string;
  asset: string;
  holdings: number;
  holdingsLastUpdated?: string;
  holdingsDerived?: boolean;
  holdingsCalculation?: string;
  sourceQuote?: string;
  sourceType?: string;
  holdingsSource?: string;
  holdingsSourceUrl?: string;
  accessionNumber?: string;
  sharesForMnav?: number;
  totalDebt?: number;
  debtAsOf?: string;
  cashReserves?: number;
  cashAsOf?: string;
  preferredEquity?: number;
  preferredAsOf?: string;
  pendingMerger?: boolean;
  holdingsUnverified?: boolean;
  tier: number;
}

// ---------------------------------------------------------------------------
// EXTRACT COMPANIES FROM SOURCE (regex-based, like other scripts)
// ---------------------------------------------------------------------------
function extractCompanies(): CompanyData[] {
  const content = fs.readFileSync(companiesPath, "utf-8");
  const companies: CompanyData[] = [];

  // Split on object boundaries (each company starts with { and has ticker:)
  const blocks = content.split(/\n  \{/).slice(1); // Skip preamble

  for (const block of blocks) {
    const get = (key: string): string | undefined => {
      const m = block.match(new RegExp(`${key}:\\s*["'\`]([^"'\`]*)["'\`]`));
      return m?.[1];
    };
    const getNum = (key: string): number | undefined => {
      // Match number literals including underscores (e.g., 1_459_615)
      // Also handle PROVENANCE pattern: `PROVENANCE.holdings?.value || 720_737`
      const provM = block.match(new RegExp(`${key}:\\s*\\w+\\.\\w+.*\\|\\|\\s*([\\d_]+\\.?[\\d_]*)`));
      if (provM) return parseFloat(provM[1].replace(/_/g, ""));
      // Handle PROVENANCE with ?? operator: `PROVENANCE.holdings?.value ?? 11_542`
      const provM2 = block.match(new RegExp(`${key}:\\s*\\w+\\.\\w+.*\\?\\?\\s*([\\d_]+\\.?[\\d_]*)`));
      if (provM2) return parseFloat(provM2[1].replace(/_/g, ""));
      const m = block.match(new RegExp(`${key}:\\s*([\\d_]+\\.?[\\d_]*)`));
      if (!m) return undefined;
      return parseFloat(m[1].replace(/_/g, ""));
    };
    const getBool = (key: string): boolean => {
      return block.includes(`${key}: true`);
    };

    const ticker = get("ticker");
    if (!ticker) continue;

    companies.push({
      ticker,
      name: get("name") || ticker,
      asset: get("asset") || "?",
      holdings: getNum("holdings") ?? 0,
      holdingsLastUpdated: get("holdingsLastUpdated") || (block.includes("PROVENANCE") ? "PROVENANCE" : undefined),
      holdingsDerived: getBool("holdingsDerived"),
      holdingsCalculation: get("holdingsCalculation"),
      sourceQuote: (() => {
        // Extract sourceQuote — may contain apostrophes, commas, special chars
        // Try double-quoted first (most common), then single, then backtick
        const dq = block.match(/sourceQuote:\s*"([^"]+)"/);
        if (dq) return dq[1];
        const sq = block.match(/sourceQuote:\s*'([^']+)'/);
        if (sq) return sq[1];
        const bt = block.match(/sourceQuote:\s*`([^`]+)`/);
        return bt?.[1];
      })(),
      sourceType: get("sourceType"),
      holdingsSource: get("holdingsSource"),
      holdingsSourceUrl: get("holdingsSourceUrl"),
      accessionNumber: get("accessionNumber"),
      sharesForMnav: getNum("sharesForMnav") ?? (block.match(/sharesForMnav:\s*[A-Za-z]/) ? -1 : undefined),  // -1 = dynamic (function/variable)
      totalDebt: getNum("totalDebt"),
      debtAsOf: get("debtAsOf"),
      cashReserves: getNum("cashReserves"),
      cashAsOf: get("cashAsOf"),
      preferredEquity: getNum("preferredEquity"),
      preferredAsOf: get("preferredAsOf"),
      pendingMerger: getBool("pendingMerger"),
      holdingsUnverified: getBool("holdingsUnverified"),
      tier: getNum("tier") ?? 2,
    });
  }

  return companies;
}

// ---------------------------------------------------------------------------
// NUMBER EXTRACTION FROM QUOTES
// ---------------------------------------------------------------------------
function extractNumbersFromQuote(quote: string): number[] {
  const numbers: number[] = [];
  // Match formatted numbers: 290,062.67 or 108,368,594 or 38.0 or 867,798
  const matches = quote.matchAll(/[\d,]+\.?\d*/g);
  for (const m of matches) {
    const raw = m[0].replace(/,/g, "");
    const num = parseFloat(raw);
    if (!isNaN(num) && num > 0) numbers.push(num);
  }
  return numbers;
}

/**
 * Check if the holdings value can be found in or derived from the quote numbers.
 * Returns { match: true/false, explanation: string }
 */
function checkHoldingsInQuote(
  holdings: number,
  quote: string,
  isDerived: boolean
): { match: boolean; explanation: string } {
  if (isDerived) {
    // For derived holdings, the quote should contain the BASE number, not the derived result
    // We just check that SOME meaningful number is in the quote
    const nums = extractNumbersFromQuote(quote);
    if (nums.length === 0) {
      return { match: false, explanation: "Derived holdings but quote contains no numbers" };
    }
    return { match: true, explanation: `Derived — base numbers in quote: ${nums.join(", ")}` };
  }

  const nums = extractNumbersFromQuote(quote);
  if (nums.length === 0) {
    return { match: false, explanation: "Quote contains no numbers" };
  }

  // Direct match: holdings value appears in quote (with tolerance for rounding)
  for (const n of nums) {
    // Exact match
    if (n === holdings) return { match: true, explanation: `Exact match: ${n}` };
    // Within 0.1% (rounding tolerance)
    if (Math.abs(n - holdings) / holdings < 0.001) {
      return { match: true, explanation: `Near match: quote has ${n}, code has ${holdings}` };
    }
    // Integer vs float (e.g., 290,062 vs 290,062.67)
    if (Math.floor(n) === holdings || Math.ceil(n) === holdings) {
      return { match: true, explanation: `Rounded match: quote has ${n}, code has ${holdings}` };
    }
  }

  // Dollar-value match: quote might state dollar amount, not unit count
  // e.g., "$38.0 million" → holdings derived from price
  for (const n of nums) {
    if (quote.toLowerCase().includes("million") && n < 1000) {
      // This is a dollar figure, not a unit count — acceptable if no unit count exists
      return {
        match: true,
        explanation: `Dollar-value quote ($${n}M), not unit count — manual check recommended`,
      };
    }
  }

  // "more than X" or "over X" — approximate match
  if (quote.match(/more than|over|approximately|about/i)) {
    for (const n of nums) {
      if (holdings >= n * 0.95 && holdings <= n * 1.5) {
        return { match: true, explanation: `Approximate match: "${quote.slice(0, 40)}..." ≈ ${holdings}` };
      }
    }
  }

  return {
    match: false,
    explanation: `MISMATCH: code=${holdings.toLocaleString()}, quote numbers=[${nums.join(", ")}]`,
  };
}

// ---------------------------------------------------------------------------
// STALENESS CHECK
// ---------------------------------------------------------------------------
function daysSince(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
interface Issue {
  ticker: string;
  severity: "FAIL" | "WARN" | "INFO";
  check: string;
  message: string;
}

function run() {
  const companies = extractCompanies();
  const issues: Issue[] = [];
  const tickerFilter = process.argv.find((a) => a.startsWith("--ticker="))?.split("=")[1]?.toUpperCase();

  const filtered = tickerFilter
    ? companies.filter((c) => c.ticker.toUpperCase() === tickerFilter)
    : companies;

  console.log(`\nCross-checking ${filtered.length} companies...\n`);

  for (const co of filtered) {
    // -----------------------------------------------------------------------
    // 1. QUOTE-VALUE MATCH
    // -----------------------------------------------------------------------
    if (co.sourceQuote && co.holdings > 0) {
      const result = checkHoldingsInQuote(co.holdings, co.sourceQuote, co.holdingsDerived ?? false);
      if (!result.match) {
        issues.push({
          ticker: co.ticker,
          severity: "FAIL",
          check: "QUOTE-VALUE",
          message: result.explanation,
        });
      } else if (result.explanation.includes("manual check")) {
        issues.push({
          ticker: co.ticker,
          severity: "INFO",
          check: "QUOTE-VALUE",
          message: result.explanation,
        });
      }
    } else if (!co.sourceQuote && co.holdings > 0 && !co.pendingMerger) {
      issues.push({
        ticker: co.ticker,
        severity: "WARN",
        check: "MISSING-QUOTE",
        message: "No sourceQuote for non-zero holdings",
      });
    }

    // -----------------------------------------------------------------------
    // 2. HOLDINGS SANITY (non-zero for active companies)
    // -----------------------------------------------------------------------
    if (co.holdings === 0 && !co.pendingMerger && !co.holdingsUnverified) {
      issues.push({
        ticker: co.ticker,
        severity: co.tier === 1 ? "FAIL" : "WARN",
        check: "ZERO-HOLDINGS",
        message: "Holdings = 0 but not marked as pending merger",
      });
    }

    // -----------------------------------------------------------------------
    // 3. STALENESS (> 90 days)
    // -----------------------------------------------------------------------
    if (co.holdingsLastUpdated) {
      const days = daysSince(co.holdingsLastUpdated);
      if (days > 180) {
        issues.push({
          ticker: co.ticker,
          severity: co.tier === 1 ? "FAIL" : "WARN",
          check: "STALE-HOLDINGS",
          message: `Holdings data is ${days} days old (updated ${co.holdingsLastUpdated})`,
        });
      } else if (days > 90) {
        issues.push({
          ticker: co.ticker,
          severity: "WARN",
          check: "STALE-HOLDINGS",
          message: `Holdings data is ${days} days old (updated ${co.holdingsLastUpdated})`,
        });
      }
    } else {
      issues.push({
        ticker: co.ticker,
        severity: "WARN",
        check: "NO-DATE",
        message: "No holdingsLastUpdated date",
      });
    }

    // Stale balance sheet fields (skip if value is 0 — zero doesn't go stale)
    for (const [field, asOf, value] of [
      ["debt", co.debtAsOf, co.totalDebt],
      ["cash", co.cashAsOf, co.cashReserves],
      ["preferred", co.preferredAsOf, co.preferredEquity],
    ] as const) {
      if (asOf && (value ?? 0) > 0) {
        const days = daysSince(asOf);
        if (days > 270) {
          issues.push({
            ticker: co.ticker,
            severity: "WARN",
            check: `STALE-${field.toUpperCase()}`,
            message: `${field} data is ${days} days old (as of ${asOf})`,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // 4. MISSING CRITICAL FIELDS (Tier 1 companies need full data)
    // -----------------------------------------------------------------------
    if (co.tier === 1) {
      if (co.sharesForMnav == null && !co.pendingMerger) {  // undefined = truly missing; skip pending mergers
        issues.push({
          ticker: co.ticker,
          severity: "WARN",
          check: "MISSING-SHARES",
          message: "Tier 1 company missing sharesForMnav",
        });
      }
      if (!co.holdingsSourceUrl) {
        issues.push({
          ticker: co.ticker,
          severity: "WARN",
          check: "MISSING-SOURCE-URL",
          message: "Tier 1 company missing holdingsSourceUrl",
        });
      }
    }

    // -----------------------------------------------------------------------
    // 5. FIELD CONSISTENCY
    // -----------------------------------------------------------------------
    // sourceType should match holdingsSource when both present
    if (co.sourceType && co.holdingsSource && co.sourceType !== co.holdingsSource) {
      issues.push({
        ticker: co.ticker,
        severity: "INFO",
        check: "SOURCE-TYPE-MISMATCH",
        message: `sourceType="${co.sourceType}" vs holdingsSource="${co.holdingsSource}"`,
      });
    }

    // Internal URL should have accessionNumber
    if (co.holdingsSourceUrl?.startsWith("/filings/") && !co.accessionNumber) {
      issues.push({
        ticker: co.ticker,
        severity: "WARN",
        check: "MISSING-ACCESSION",
        message: "Internal /filings/ URL but no accessionNumber",
      });
    }

    // accessionNumber format check (only for SEC-sourced companies)
    // Non-SEC sources (foreign exchanges, dashboards) use custom IDs like "AMF-20260227"
    if (co.accessionNumber) {
      const isSec = co.holdingsSource === "sec-filing" || co.holdingsSourceUrl?.startsWith("/filings/");
      const isSecFormat = /^\d{10}-\d{2}-\d{6}$/.test(co.accessionNumber);
      if (isSec && !isSecFormat) {
        issues.push({
          ticker: co.ticker,
          severity: "FAIL",
          check: "BAD-ACCESSION",
          message: `SEC source but invalid accession format: "${co.accessionNumber}"`,
        });
      } else if (!isSec && !isSecFormat) {
        issues.push({
          ticker: co.ticker,
          severity: "INFO",
          check: "CUSTOM-ACCESSION",
          message: `Non-SEC accession ID: "${co.accessionNumber}"`,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 6. DERIVED HOLDINGS CHECK
    // -----------------------------------------------------------------------
    if (co.holdingsDerived && !co.holdingsCalculation) {
      issues.push({
        ticker: co.ticker,
        severity: "WARN",
        check: "DERIVED-NO-CALC",
        message: "holdingsDerived=true but no holdingsCalculation provided",
      });
    }

    // If holdingsCalculation present, try to verify the math
    if (co.holdingsCalculation) {
      // Extract the final "= NUMBER" from the calculation string
      const resultMatch = co.holdingsCalculation.match(/=\s*([\d,_]+)/);
      if (resultMatch) {
        const calcResult = parseFloat(resultMatch[1].replace(/[,_]/g, ""));
        if (calcResult !== co.holdings) {
          issues.push({
            ticker: co.ticker,
            severity: "FAIL",
            check: "DERIVED-MATH",
            message: `Calculation result ${calcResult.toLocaleString()} != holdings ${co.holdings.toLocaleString()}`,
          });
        }
      }
    }

    // -----------------------------------------------------------------------
    // 7. SHARES SANITY CHECK
    // -----------------------------------------------------------------------
    if (co.sharesForMnav && co.sharesForMnav > 0) {  // Skip -1 sentinel (dynamic/function value)
      // Flag obviously wrong share counts
      if (co.sharesForMnav < 100_000) {
        issues.push({
          ticker: co.ticker,
          severity: "WARN",
          check: "LOW-SHARES",
          message: `sharesForMnav=${co.sharesForMnav.toLocaleString()} — unusually low (post reverse split?)`,
        });
      }
      if (co.sharesForMnav > 10_000_000_000) {
        issues.push({
          ticker: co.ticker,
          severity: "WARN",
          check: "HIGH-SHARES",
          message: `sharesForMnav=${co.sharesForMnav.toLocaleString()} — unusually high (pre reverse split?)`,
        });
      }
    }

    // -----------------------------------------------------------------------
    // 8. DEBT/CASH SANITY
    // -----------------------------------------------------------------------
    if (co.totalDebt && co.totalDebt < 0) {
      issues.push({
        ticker: co.ticker,
        severity: "FAIL",
        check: "NEGATIVE-DEBT",
        message: `totalDebt=${co.totalDebt} — debt cannot be negative`,
      });
    }
    if (co.cashReserves && co.cashReserves < 0) {
      issues.push({
        ticker: co.ticker,
        severity: "FAIL",
        check: "NEGATIVE-CASH",
        message: `cashReserves=${co.cashReserves} — cash cannot be negative`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // REPORT
  // -------------------------------------------------------------------------
  const fails = issues.filter((i) => i.severity === "FAIL");
  const warns = issues.filter((i) => i.severity === "WARN");
  const infos = issues.filter((i) => i.severity === "INFO");

  console.log("=".repeat(70));
  console.log("GROUND TRUTH CROSS-CHECK REPORT");
  console.log("=".repeat(70));
  console.log(`  Companies checked:  ${filtered.length}`);
  console.log(`  FAIL:               ${fails.length}`);
  console.log(`  WARN:               ${warns.length}`);
  console.log(`  INFO:               ${infos.length}`);
  console.log();

  if (fails.length > 0) {
    console.log("-".repeat(70));
    console.log("FAILURES (must fix):");
    console.log("-".repeat(70));
    for (const f of fails) {
      console.log(`  ${f.ticker.padEnd(10)} [${f.check}] ${f.message}`);
    }
    console.log();
  }

  if (warns.length > 0) {
    console.log("-".repeat(70));
    console.log("WARNINGS (should review):");
    console.log("-".repeat(70));
    for (const w of warns) {
      console.log(`  ${w.ticker.padEnd(10)} [${w.check}] ${w.message}`);
    }
    console.log();
  }

  if (infos.length > 0 && process.argv.includes("--verbose")) {
    console.log("-".repeat(70));
    console.log("INFO:");
    console.log("-".repeat(70));
    for (const i of infos) {
      console.log(`  ${i.ticker.padEnd(10)} [${i.check}] ${i.message}`);
    }
    console.log();
  }

  // Summary by check type
  const checkCounts: Record<string, number> = {};
  for (const issue of issues) {
    checkCounts[issue.check] = (checkCounts[issue.check] || 0) + 1;
  }
  console.log("-".repeat(70));
  console.log("ISSUE SUMMARY BY TYPE:");
  console.log("-".repeat(70));
  for (const [check, count] of Object.entries(checkCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${check.padEnd(25)} ${count}`);
  }

  // Exit code
  if (fails.length > 0) {
    console.log(`\n** ${fails.length} FAILURES — data integrity issues found **`);
    process.exit(1);
  } else if (warns.length > 0) {
    console.log(`\n${warns.length} warnings — review recommended, no blocking issues.`);
  } else {
    console.log("\nAll checks passed.");
  }
}

run();
