#!/usr/bin/env npx tsx
/**
 * Staking Audit Script
 *
 * Scans SEC EDGAR filings for staking-related keywords to verify and update
 * staking data for DAT Tracker companies.
 *
 * Usage: npx tsx scripts/audit-staking.ts
 */

import * as https from "https";
import * as fs from "fs";
import * as path from "path";

// Import companies data — allCompanies is the combined array
import { allCompanies } from "../src/lib/data/companies";
import type { Company } from "../src/lib/types";

// ─── Configuration ───────────────────────────────────────────────────────────

const USER_AGENT = "DATTracker/1.0 admin@dat-tracker.com";
const REQUEST_DELAY_MS = 500; // 500ms between SEC requests
const MAX_FILINGS_PER_COMPANY = 5;
const FILING_LOOKBACK_DAYS = 90;
const STALE_THRESHOLD_DAYS = 30;
const SNIPPET_RADIUS = 200; // chars around each keyword match

const STAKING_KEYWORDS = [
  "stak",
  "validator",
  "yield",
  "reward",
  "APY",
  "APR",
  "liquid stak",
  "LsETH",
  "restaking",
  "MAVAN",
  "Lido",
  "beacon",
  "staking rate",
  "staking reward",
];

// Assets that commonly involve staking (PoS chains)
const STAKEABLE_ASSETS = ["ETH", "SOL", "AVAX", "HYPE", "TAO", "SUI", "ADA", "HBAR", "BNB", "LINK", "TRX", "DOGE"];

// ─── Types ───────────────────────────────────────────────────────────────────

interface FilingRef {
  accessionNumber: string;
  form: string;
  filingDate: string;
  primaryDocument: string;
  primaryDocDescription: string;
}

interface KeywordMatch {
  keyword: string;
  snippet: string;
  documentUrl: string;
}

interface CompanyAuditResult {
  company: Company;
  hasExistingStaking: boolean;
  stakingRemoved: boolean;  // detected from source code comments
  stakingStale: boolean;
  filingMatches: {
    filing: FilingRef;
    matches: KeywordMatch[];
  }[];
  error?: string;
}

// ─── HTTP Helper ─────────────────────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/json,*/*",
        },
      },
      (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpsGet(res.headers.location).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode && res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout for ${url}`));
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── SEC Filing Fetching ─────────────────────────────────────────────────────

function padCik(cik: string): string {
  // Remove leading zeros, then pad to 10 digits
  const num = cik.replace(/^0+/, "");
  return num.padStart(10, "0");
}

async function getRecentFilings(cik: string): Promise<FilingRef[]> {
  const paddedCik = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  console.log(`  📡 Fetching submissions: ${url}`);

  const json = await httpsGet(url);
  const data = JSON.parse(json);

  const recent = data.filings?.recent;
  if (!recent) {
    console.log(`  ⚠️  No recent filings found`);
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - FILING_LOOKBACK_DAYS);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const filings: FilingRef[] = [];
  const formTypes = ["8-K", "10-Q", "10-K", "6-K", "20-F"];

  for (let i = 0; i < recent.form.length && filings.length < MAX_FILINGS_PER_COMPANY; i++) {
    const form = recent.form[i];
    const filingDate = recent.filingDate[i];
    const accession = recent.accessionNumber[i];
    const primaryDoc = recent.primaryDocument[i];
    const primaryDocDesc = recent.primaryDocDescription?.[i] || "";

    if (!formTypes.includes(form)) continue;
    if (filingDate < cutoffStr) continue;

    filings.push({
      accessionNumber: accession,
      form,
      filingDate,
      primaryDocument: primaryDoc,
      primaryDocDescription: primaryDocDesc,
    });
  }

  return filings;
}

function buildFilingUrl(cik: string, accession: string, document: string): string {
  const accessionClean = accession.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accessionClean}/${document}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchForKeywords(text: string, documentUrl: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of STAKING_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(lowerKeyword, searchFrom);
      if (idx === -1) break;

      // Extract snippet
      const start = Math.max(0, idx - SNIPPET_RADIUS);
      const end = Math.min(text.length, idx + keyword.length + SNIPPET_RADIUS);
      const snippet = text.substring(start, end).trim();

      // Deduplicate: skip if we already have a very similar snippet for this keyword
      const isDupe = matches.some(
        (m) => m.keyword === keyword && m.snippet.includes(snippet.substring(0, 50))
      );

      if (!isDupe) {
        matches.push({ keyword, snippet, documentUrl });
      }

      searchFrom = idx + keyword.length;

      // Limit matches per keyword to avoid flooding
      if (matches.filter((m) => m.keyword === keyword).length >= 3) break;
    }
  }

  return matches;
}

async function fetchAndSearchFiling(
  cik: string,
  filing: FilingRef
): Promise<KeywordMatch[]> {
  const allMatches: KeywordMatch[] = [];
  const cikClean = cik.replace(/^0+/, "");

  // 1. Fetch primary document
  const primaryUrl = buildFilingUrl(cik, filing.accessionNumber, filing.primaryDocument);
  console.log(`    📄 Primary: ${filing.primaryDocument}`);

  try {
    const html = await httpsGet(primaryUrl);
    const text = stripHtml(html);
    const matches = searchForKeywords(text, primaryUrl);
    allMatches.push(...matches);
  } catch (err: any) {
    console.log(`    ⚠️  Failed to fetch primary: ${err.message}`);
  }

  await delay(REQUEST_DELAY_MS);

  // 2. Try to fetch ex99-1.htm exhibit (common for 8-K press releases)
  const accessionClean = filing.accessionNumber.replace(/-/g, "");
  const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${cikClean}/${accessionClean}/ex99-1.htm`;
  console.log(`    📄 Exhibit: ex99-1.htm`);

  try {
    const html = await httpsGet(exhibitUrl);
    const text = stripHtml(html);
    const matches = searchForKeywords(text, exhibitUrl);
    allMatches.push(...matches);
  } catch {
    // ex99-1.htm often doesn't exist — that's fine
    console.log(`    ℹ️  No ex99-1.htm exhibit`);
  }

  return allMatches;
}

// ─── Company Selection ───────────────────────────────────────────────────────

function shouldAuditCompany(company: Company): boolean {
  // Must have SEC CIK
  if (!company.secCik) return false;

  // Has active staking data
  if (company.stakingPct !== undefined && company.stakingPct > 0) return true;

  // Is a stakeable asset (PoS chain)
  if (STAKEABLE_ASSETS.includes(company.asset)) return true;

  return false;
}

function hasExistingStakingData(company: Company): boolean {
  return company.stakingPct !== undefined && company.stakingPct > 0;
}

function isStakingStale(company: Company): boolean {
  if (!company.stakingAsOf) return true;
  const asOf = new Date(company.stakingAsOf);
  const now = new Date();
  const daysDiff = (now.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff > STALE_THRESHOLD_DAYS;
}

// ─── Report Generation ───────────────────────────────────────────────────────

function generateReport(results: CompanyAuditResult[]): string {
  const now = new Date().toISOString();
  const lines: string[] = [];

  lines.push("# Staking Audit Report");
  lines.push(`\n**Generated:** ${now}`);
  lines.push(`**Companies audited:** ${results.length}`);
  lines.push(`**Filing lookback:** ${FILING_LOOKBACK_DAYS} days`);
  lines.push("");

  // ── Section 1: Stale staking data ──
  const staleCompanies = results.filter((r) => r.hasExistingStaking && r.stakingStale);
  lines.push("## ⏰ Stale Staking Data (>30 days since stakingAsOf)");
  lines.push("");

  if (staleCompanies.length === 0) {
    lines.push("_No stale staking data found._");
  } else {
    for (const r of staleCompanies) {
      const c = r.company;
      const daysSince = c.stakingAsOf
        ? Math.floor((Date.now() - new Date(c.stakingAsOf).getTime()) / (1000 * 60 * 60 * 24))
        : "N/A";
      lines.push(`### ${c.ticker} — ${c.name} (${c.asset})`);
      lines.push(`- **Staking %:** ${((c.stakingPct || 0) * 100).toFixed(1)}%`);
      lines.push(`- **As of:** ${c.stakingAsOf || "unknown"} (${daysSince} days ago)`);
      lines.push(`- **Source:** ${c.stakingSource || "none"}`);
      if (r.filingMatches.length > 0) {
        lines.push(`- **New filing matches:** ${r.filingMatches.reduce((sum, f) => sum + f.matches.length, 0)} keyword hits`);
      }
      lines.push("");
    }
  }
  lines.push("");

  // ── Section 2: New filing mentions ──
  const companiesWithMatches = results.filter((r) => r.filingMatches.some((f) => f.matches.length > 0));
  lines.push("## 🔍 Companies with Staking Mentions in Recent Filings");
  lines.push("");

  if (companiesWithMatches.length === 0) {
    lines.push("_No staking mentions found in recent filings._");
  } else {
    for (const r of companiesWithMatches) {
      const c = r.company;
      const totalMatches = r.filingMatches.reduce((sum, f) => sum + f.matches.length, 0);
      lines.push(`### ${c.ticker} — ${c.name} (${c.asset})`);
      lines.push(`- **Current staking %:** ${c.stakingPct !== undefined ? ((c.stakingPct * 100).toFixed(1) + "%") : "NONE (removed/missing)"}`);
      lines.push(`- **Total keyword hits:** ${totalMatches}`);
      lines.push("");

      for (const fm of r.filingMatches) {
        if (fm.matches.length === 0) continue;
        lines.push(`#### ${fm.filing.form} — ${fm.filing.filingDate}`);
        lines.push("");
        for (const m of fm.matches) {
          const cleanSnippet = m.snippet.replace(/\n/g, " ").substring(0, 300);
          lines.push(`- **[${m.keyword}]** ...${cleanSnippet}...`);
          lines.push(`  - Source: ${m.documentUrl}`);
        }
        lines.push("");
      }
    }
  }
  lines.push("");

  // ── Section 3: Removed staking data with new evidence ──
  const removedWithEvidence = results.filter(
    (r) => r.stakingRemoved && r.filingMatches.some((f) => f.matches.length > 0)
  );
  lines.push("## 🔄 Removed Staking Data — New Evidence Found");
  lines.push("");

  if (removedWithEvidence.length === 0) {
    lines.push("_No new evidence found for companies with removed staking data._");
  } else {
    for (const r of removedWithEvidence) {
      const c = r.company;
      const totalMatches = r.filingMatches.reduce((sum, f) => sum + f.matches.length, 0);
      lines.push(`### ${c.ticker} — ${c.name} (${c.asset})`);
      lines.push(`- **Status:** Staking data was previously removed — needs re-verification`);
      lines.push(`- **New evidence:** ${totalMatches} keyword hits in recent filings`);
      lines.push("");

      for (const fm of r.filingMatches) {
        if (fm.matches.length === 0) continue;
        lines.push(`#### ${fm.filing.form} — ${fm.filing.filingDate}`);
        for (const m of fm.matches) {
          const cleanSnippet = m.snippet.replace(/\n/g, " ").substring(0, 300);
          lines.push(`- **[${m.keyword}]** ...${cleanSnippet}...`);
          lines.push(`  - Source: ${m.documentUrl}`);
        }
        lines.push("");
      }
    }
  }
  lines.push("");

  // ── Section 4: Removed staking — no new evidence ──
  const removedNoEvidence = results.filter(
    (r) => r.stakingRemoved && !r.filingMatches.some((f) => f.matches.length > 0)
  );
  lines.push("## ❌ Removed Staking Data — No New Evidence");
  lines.push("");

  if (removedNoEvidence.length === 0) {
    lines.push("_All removed staking entries had some evidence or no companies applied._");
  } else {
    for (const r of removedNoEvidence) {
      const c = r.company;
      lines.push(`- **${c.ticker}** (${c.name}, ${c.asset}) — ${r.error || "No staking mentions in recent filings"}`);
    }
  }
  lines.push("");

  // ── Section 5: Errors ──
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    lines.push("## ⚠️ Errors");
    lines.push("");
    for (const r of errors) {
      lines.push(`- **${r.company.ticker}** (${r.company.name}): ${r.error}`);
    }
    lines.push("");
  }

  // ── Section 6: Summary ──
  lines.push("## 📊 Summary");
  lines.push("");
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Companies audited | ${results.length} |`);
  lines.push(`| With active staking data | ${results.filter((r) => r.hasExistingStaking).length} |`);
  lines.push(`| Stale staking data | ${staleCompanies.length} |`);
  lines.push(`| Filing matches found | ${companiesWithMatches.length} |`);
  lines.push(`| Removed + new evidence | ${removedWithEvidence.length} |`);
  lines.push(`| Removed + no evidence | ${removedNoEvidence.length} |`);
  lines.push(`| Errors | ${errors.length} |`);
  lines.push("");

  // ── Section 7: Action Items ──
  lines.push("## 🎯 Action Items");
  lines.push("");

  let actionNum = 1;

  for (const r of removedWithEvidence) {
    lines.push(`${actionNum}. **RE-VERIFY** ${r.company.ticker} — staking data was removed but new SEC evidence found`);
    actionNum++;
  }

  for (const r of staleCompanies) {
    if (r.filingMatches.some((f) => f.matches.length > 0)) {
      lines.push(`${actionNum}. **UPDATE** ${r.company.ticker} — staking data is stale and new filing data available`);
    } else {
      lines.push(`${actionNum}. **CHECK** ${r.company.ticker} — staking data is stale (${r.company.stakingAsOf}), no new filings found`);
    }
    actionNum++;
  }

  if (actionNum === 1) {
    lines.push("_No immediate action items._");
  }

  lines.push("");
  lines.push("---");
  lines.push("*Generated by `scripts/audit-staking.ts` — run `npm run audit:staking` to refresh*");

  return lines.join("\n");
}

// ─── Detect Removed Staking from Source ──────────────────────────────────────

function detectRemovedStaking(): Set<string> {
  // Read the raw source file to find companies with removed staking comments
  const sourcePath = path.resolve(__dirname, "../src/lib/data/companies.ts");
  const source = fs.readFileSync(sourcePath, "utf-8");

  const removedTickers = new Set<string>();

  // Parse: find blocks with "stakingPct.*removed" and extract the ticker
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/stakingPct.*removed/i.test(lines[i])) {
      // Look backwards for ticker
      for (let j = i - 1; j >= Math.max(0, i - 20); j--) {
        const tickerMatch = lines[j].match(/ticker:\s*"([^"]+)"/);
        if (tickerMatch) {
          removedTickers.add(tickerMatch[1]);
          break;
        }
      }
    }
  }

  return removedTickers;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  DAT Tracker — Staking Audit");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Lookback: ${FILING_LOOKBACK_DAYS} days`);
  console.log(`  Max filings/company: ${MAX_FILINGS_PER_COMPANY}`);
  console.log(`  Request delay: ${REQUEST_DELAY_MS}ms`);
  console.log("");

  // Detect companies with removed staking data
  const removedTickers = detectRemovedStaking();
  console.log(`📋 Found ${removedTickers.size} companies with removed staking data:`);
  console.log(`   ${Array.from(removedTickers).join(", ")}`);
  console.log("");

  // Select companies to audit
  const toAudit = allCompanies.filter(shouldAuditCompany);
  console.log(`🔍 Auditing ${toAudit.length} companies with SEC CIK + (staking data or stakeable asset):`);
  console.log(`   ${toAudit.map((c) => c.ticker).join(", ")}`);
  console.log("");

  const results: CompanyAuditResult[] = [];

  for (let i = 0; i < toAudit.length; i++) {
    const company = toAudit[i];
    console.log(`\n[${i + 1}/${toAudit.length}] ${company.ticker} — ${company.name} (${company.asset})`);
    console.log(`  CIK: ${company.secCik}`);

    const result: CompanyAuditResult = {
      company,
      hasExistingStaking: hasExistingStakingData(company),
      stakingRemoved: removedTickers.has(company.ticker),
      stakingStale: hasExistingStakingData(company) && isStakingStale(company),
      filingMatches: [],
    };

    if (result.hasExistingStaking) {
      console.log(`  ✅ Has staking: ${((company.stakingPct || 0) * 100).toFixed(1)}% (as of ${company.stakingAsOf || "unknown"})`);
    }
    if (result.stakingRemoved) {
      console.log(`  🔴 Staking data was REMOVED — needs re-verification`);
    }

    try {
      // Fetch filings
      const filings = await getRecentFilings(company.secCik!);
      console.log(`  📑 Found ${filings.length} recent filings`);

      await delay(REQUEST_DELAY_MS);

      // Search each filing
      for (const filing of filings) {
        console.log(`  \n  📋 ${filing.form} — ${filing.filingDate}: ${filing.primaryDocument}`);

        const matches = await fetchAndSearchFiling(company.secCik!, filing);

        if (matches.length > 0) {
          console.log(`  🎯 Found ${matches.length} keyword matches!`);
          result.filingMatches.push({ filing, matches });
        } else {
          console.log(`  ❌ No staking keywords found`);
          result.filingMatches.push({ filing, matches: [] });
        }

        await delay(REQUEST_DELAY_MS);
      }
    } catch (err: any) {
      console.log(`  ⚠️  Error: ${err.message}`);
      result.error = err.message;
    }

    results.push(result);
  }

  // Generate report
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  Generating Report...");
  console.log("═══════════════════════════════════════════════════════\n");

  const report = generateReport(results);

  // Write to file
  const reportPath = path.resolve(__dirname, "staking-audit-report.md");
  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`📄 Report written to: ${reportPath}`);

  // Also print to console
  console.log("\n" + report);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
