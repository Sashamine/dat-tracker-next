#!/usr/bin/env node
/**
 * Download a specific SEC EDGAR filing primary HTML document from sec.gov Archives.
 *
 * Usage:
 *   node scripts/xbrl/sec-download-filing.ts --cik 1849635 --accn 0001140361-25-040977 --doc ef20054981_10q.htm --out verification-runs/djt/2026-02-22/sec/filings
 */

import fs from "node:fs";
import path from "node:path";

type Args = { cik?: string; accn?: string; doc?: string; out?: string };

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === "--cik") { out.cik = v; i++; continue; }
    if (a === "--accn") { out.accn = v; i++; continue; }
    if (a === "--doc") { out.doc = v; i++; continue; }
    if (a === "--out") { out.out = v; i++; continue; }
  }
  return out;
}

function die(msg: string): never {
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exit(1);
}

function cikNoLeadingZeros(cik: string): string {
  const digits = cik.replace(/\D/g, "");
  if (!digits) die(`Invalid CIK: ${cik}`);
  return String(Number(digits));
}

async function fetchText(url: string, userAgent: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status} ${res.statusText} for ${url}\n${body.slice(0, 500)}`);
  }
  return await res.text();
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.cik) die("Missing --cik");
  if (!args.accn) die("Missing --accn");
  if (!args.doc) die("Missing --doc");
  if (!args.out) die("Missing --out");

  const cik = cikNoLeadingZeros(args.cik);
  const accnNoDashes = args.accn.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accnNoDashes}/${args.doc}`;

  const userAgent = process.env.SEC_USER_AGENT || "DAT Tracker (contact@datcap.com)";

  const outDir = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const safeDoc = args.doc.replace(/[^a-zA-Z0-9._-]/g, "_");
  const outPath = path.join(outDir, `${args.accn}__${safeDoc}`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    // eslint-disable-next-line no-console
    console.log(`Already exists: ${outPath}`);
    return;
  }

  const html = await fetchText(url, userAgent);
  fs.writeFileSync(outPath, html, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Downloaded ${url}`);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
