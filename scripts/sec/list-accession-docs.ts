#!/usr/bin/env node
/**
 * List docs in an accession index and identify primary iXBRL doc.
 */
import path from 'node:path';
import fs from 'node:fs/promises';
import { secFetchText } from './sec-http.js';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const cik = arg('cik');
  const accessionNoDashes = arg('accessionNoDashes');
  const accessionWithDashes = arg('accession');
  if (!cik || !accessionNoDashes || !accessionWithDashes) {
    console.error('Usage: list-accession-docs --cik <CIKdigits> --accessionNoDashes <no-dashes> --accession <with-dashes>');
    process.exit(2);
  }
  const cacheDir = path.join(process.cwd(), '.cache', 'sec');

  const cikDigits = String(cik).replace(/\D/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikDigits}/${accessionNoDashes}/${accessionWithDashes}-index.html`;
  const index = await secFetchText(indexUrl, { cacheDir });

  const ixDoc = index.text.match(/href="\/ix\?doc=([^"]+)"/i)?.[1] ?? null;
  const hrefs = [...index.text.matchAll(/href="(\/Archives\/edgar\/data\/[^\"]+?\/[^\"]+?\.(?:htm|html))"/gi)].map(m => m[1]);
  const docs = Array.from(new Set(hrefs.map(h => path.basename(h)))).sort();

  console.log(JSON.stringify({ indexUrl, ixDoc, ixDocBasename: ixDoc ? path.basename(ixDoc) : null, docs }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
