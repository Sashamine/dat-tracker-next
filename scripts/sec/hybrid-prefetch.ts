#!/usr/bin/env node
/**
 * Hybrid prefetch for a verification run.
 *
 * Fetches:
 * - submissions.json (data.sec.gov)
 * - companyfacts.json (data.sec.gov)
 * - accession index.html (www.sec.gov/Archives)
 * - primary iXBRL doc (via /ix?doc=... link)
 * - optional extra docs (exhibits)
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { secFetchText } from './sec-http.js';
import { companyFactsUrl, submissionsUrl } from './sec-endpoints.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

function stripHtmlToFindIxDocHref(indexHtml: string): string | null {
  const m = indexHtml.match(/href="\/ix\?doc=([^"]+)"/i);
  return m?.[1] ?? null;
}

function findAccessionNoDashesFromSubmissions(submissions: any, accessionWithDashes: string): { accessionNoDashes: string; primaryDocument?: string } {
  const accNoDashes = accessionWithDashes.replace(/-/g, '');
  // Try to locate primary doc name (not strictly needed if we use ix?doc)
  try {
    const recent = submissions?.filings?.recent;
    const idx = recent?.accessionNumber?.findIndex((a: string) => a === accessionWithDashes);
    if (idx >= 0) {
      const primaryDocument = recent?.primaryDocument?.[idx];
      return { accessionNoDashes: accNoDashes, primaryDocument };
    }
  } catch {
    // ignore
  }
  return { accessionNoDashes: accNoDashes };
}

async function main() {
  const verbose = process.env.SEC_PREFETCH_VERBOSE === "1";
  const cik = arg('cik');
  const accession = arg('accession');
  const outDir = arg('outDir');
  const extraDocs = (arg('extraDocs') ?? '').split(',').map(s => s.trim()).filter(Boolean);

  if (!cik || !accession || !outDir) {
    console.error('Usage: hybrid-prefetch --cik <CIK> --accession <accession-with-dashes> --outDir <runDir/sec> [--extraDocs "ex31-1.htm,ex32-1.htm"]');
    process.exit(2);
  }

  const cacheDir = path.join(process.cwd(), '.cache', 'sec');
  await ensureDir(cacheDir);

  // 1) submissions.json
  const subsUrl = submissionsUrl(cik);
  const subs = await secFetchText(subsUrl, { cacheDir });
  await ensureDir(outDir);
  await fs.writeFile(path.join(outDir, 'submissions.json'), subs.text, 'utf8');

  const subsJson = JSON.parse(subs.text);
  const { accessionNoDashes } = findAccessionNoDashesFromSubmissions(subsJson, accession);

  // 2) companyfacts.json
  const factsUrl = companyFactsUrl(cik);
  const facts = await secFetchText(factsUrl, { cacheDir });
  await fs.writeFile(path.join(outDir, 'companyfacts.json'), facts.text, 'utf8');

  // 3) index.html
  const cikDigits = String(cik).replace(/\D/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accessionNoDashes}/${accession}-index.html`;
  const index = await secFetchText(indexUrl, { cacheDir });
  const filingsDir = path.join(outDir, 'filings-hybrid');
  await ensureDir(filingsDir);
  await fs.writeFile(path.join(filingsDir, `${accession}-index.html`), index.text, 'utf8');

  // 4) primary iXBRL doc via ix?doc link
  const ixDocPath = stripHtmlToFindIxDocHref(index.text);
  if (!ixDocPath) {
    console.error('Could not find /ix?doc=... link in index.');
    process.exit(1);
  }

  const primaryUrl = `https://www.sec.gov${ixDocPath}`;
  const primary = await secFetchText(primaryUrl, { cacheDir });

  // write with basename
  const basename = path.basename(ixDocPath);
  await fs.writeFile(path.join(filingsDir, basename), primary.text, 'utf8');

  // 5) extra docs
  for (const doc of extraDocs) {
    const url = `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accessionNoDashes}/${doc}`;
    const res = await secFetchText(url, { cacheDir });
    await fs.writeFile(path.join(filingsDir, doc), res.text, 'utf8');
  }

  if (verbose) {
    console.log(`prefetch index: `);
    console.log(`prefetch primary: `);
  }
  console.log(`prefetch ok: wrote /submissions.json, companyfacts.json, filings-hybrid/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
