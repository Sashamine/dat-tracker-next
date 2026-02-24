#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { secFetchText } from './sec-http.js';
import { archiveAccessionDirUrl, normalizeCik } from './sec-endpoints.js';

function parseArgs(argv: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    out[key] = val;
    i++;
  }
  return out;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cik = args.cik;
  const accession = args.accession;
  const outDir = args.outDir;
  const docs = (args.docs ?? '').split(',').map(s => s.trim()).filter(Boolean);

  if (!cik || !accession || !outDir) {
    console.error('Usage: fetch-filings --cik <CIK> --accession <accessionNoDashes> --outDir <path> [--docs "primary.htm,ex10-1.htm"]');
    process.exit(2);
  }

  const cacheDir = path.join(process.cwd(), '.cache', 'sec');
  await ensureDir(cacheDir);
  await ensureDir(outDir);

  const base = archiveAccessionDirUrl(cik, accession);
  if (docs.length === 0) {
    console.error('No --docs provided. Provide a comma-separated list of filenames under the accession directory.');
    process.exit(2);
  }

  for (const doc of docs) {
    const url = new URL(doc, base).toString();
    const { text, fromCache } = await secFetchText(url, { cacheDir });
    const dest = path.join(outDir, doc);
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, text, 'utf8');
    console.log(`${fromCache ? 'cache' : 'fetched'} ${url} -> ${dest}`);
  }

  console.log(`Done. CIK=${normalizeCik(cik)} accession=${accession}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
