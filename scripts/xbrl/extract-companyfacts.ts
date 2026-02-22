#!/usr/bin/env node
/**
 * XBRL-first extraction helper.
 *
 * Fetches SEC submissions + companyfacts for a CIK and writes deterministic
 * artifacts under a run directory.
 *
 * Usage:
 *   node scripts/xbrl/extract-companyfacts.ts --ticker DJT --cik 1849635 --out verification-runs/djt/2026-02-22
 *
 * Notes:
 * - Requires network access to data.sec.gov and sec.gov.
 * - Uses a required SEC User-Agent.
 */

import fs from "node:fs";
import path from "node:path";

type Args = {
  ticker?: string;
  cik?: string;
  out?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === "--ticker") { out.ticker = v; i++; continue; }
    if (a === "--cik") { out.cik = v; i++; continue; }
    if (a === "--out") { out.out = v; i++; continue; }
  }
  return out;
}

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function padCik(cik: string): string {
  const digits = cik.replace(/\D/g, "");
  if (!digits) die(`Invalid CIK: ${cik}`);
  return digits.replace(/^0+/, "").padStart(10, "0");
}

async function fetchJson(url: string, userAgent: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "application/json,text/plain,*/*",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}\n${text.slice(0, 500)}`);
  }
  return await res.json();
}

function pickLatestForm(submissions: any, forms: string[]): { accession: string; filed: string; primaryDoc: string } | null {
  const recent = submissions?.filings?.recent;
  if (!recent?.accessionNumber?.length) return null;
  for (let i = 0; i < recent.accessionNumber.length; i++) {
    const form = recent.form?.[i];
    if (!forms.includes(form)) continue;
    return {
      accession: recent.accessionNumber[i],
      filed: recent.filingDate?.[i],
      primaryDoc: recent.primaryDocument?.[i],
    };
  }
  return null;
}

function getFact(companyfacts: any, namespace: string, factName: string) {
  return companyfacts?.facts?.[namespace]?.[factName] ?? null;
}

function latestUsdValue(fact: any): any | null {
  const units = fact?.units;
  if (!units) return null;
  const usd = units.USD ?? units.usd ?? null;
  if (!Array.isArray(usd) || usd.length === 0) return null;
  // pick latest by end date (fall back to instant)
  const sorted = [...usd].sort((a, b) => String(b.end ?? b.instant ?? "").localeCompare(String(a.end ?? a.instant ?? "")));
  return sorted[0];
}

function latestSharesValue(fact: any): any | null {
  const units = fact?.units;
  if (!units) return null;
  const shs = units.shares ?? units.Shares ?? units.shr ?? null;
  if (!Array.isArray(shs) || shs.length === 0) return null;
  const sorted = [...shs].sort((a, b) => String(b.end ?? b.instant ?? "").localeCompare(String(a.end ?? a.instant ?? "")));
  return sorted[0];
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.cik) die("Missing --cik");
  if (!args.out) die("Missing --out");

  const ticker = (args.ticker ?? "UNKNOWN").toUpperCase();
  const cikPadded = padCik(args.cik);

  const userAgent = process.env.SEC_USER_AGENT || "DAT Tracker (contact@datcap.com)";

  const outDir = path.resolve(process.cwd(), args.out);
  const secDir = path.join(outDir, "sec");
  fs.mkdirSync(secDir, { recursive: true });

  const submissionsUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;
  const companyfactsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json`;

  const submissions = await fetchJson(submissionsUrl, userAgent);
  const companyfacts = await fetchJson(companyfactsUrl, userAgent);

  fs.writeFileSync(path.join(secDir, "submissions.json"), JSON.stringify(submissions, null, 2));
  fs.writeFileSync(path.join(secDir, "companyfacts.json"), JSON.stringify(companyfacts, null, 2));

  const latest10q10k = pickLatestForm(submissions, ["10-Q", "10-K"]);
  const latest8k = pickLatestForm(submissions, ["8-K"]);

  // Common fact names
  const sharesFact = getFact(companyfacts, "dei", "EntityCommonStockSharesOutstanding");
  const cashFact = getFact(companyfacts, "us-gaap", "CashAndCashEquivalentsAtCarryingValue");
  const debtFact = getFact(companyfacts, "us-gaap", "Debt");
  const ltdFact = getFact(companyfacts, "us-gaap", "LongTermDebt");

  const summary = {
    ticker,
    cik: cikPadded,
    sources: {
      submissionsUrl,
      companyfactsUrl,
    },
    latestFilings: {
      tenQorK: latest10q10k,
      eightK: latest8k,
    },
    extracted: {
      sharesOutstanding: sharesFact ? {
        fact: "dei:EntityCommonStockSharesOutstanding",
        latest: latestSharesValue(sharesFact),
      } : null,
      cashAndCashEquivalents: cashFact ? {
        fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
        latest: latestUsdValue(cashFact),
      } : null,
      debt: debtFact ? {
        fact: "us-gaap:Debt",
        latest: latestUsdValue(debtFact),
      } : null,
      longTermDebt: ltdFact ? {
        fact: "us-gaap:LongTermDebt",
        latest: latestUsdValue(ltdFact),
      } : null,
    },
  };

  fs.writeFileSync(path.join(outDir, "xbrl-summary.json"), JSON.stringify(summary, null, 2));

  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.join(outDir, "xbrl-summary.json")}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
