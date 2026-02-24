#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs/promises';
import { secFetchText } from './sec-http.js';
import { companyFactsUrl, normalizeCik } from './sec-endpoints.js';

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
  const outFile = args.outFile;
  if (!cik || !outFile) {
    console.error('Usage: fetch-companyfacts --cik <CIK> --outFile <path>');
    process.exit(2);
  }

  const cacheDir = path.join(process.cwd(), '.cache', 'sec');
  await ensureDir(cacheDir);
  await ensureDir(path.dirname(outFile));

  const url = companyFactsUrl(cik);
  const { text, fromCache } = await secFetchText(url, { cacheDir });
  await fs.writeFile(outFile, text, 'utf8');
  console.log(`${fromCache ? 'cache' : 'fetched'} ${url} -> ${outFile}`);
  console.log(`Done. CIK=${normalizeCik(cik)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
