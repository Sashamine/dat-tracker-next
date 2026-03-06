#!/usr/bin/env npx tsx
/**
 * R2 Citation Coverage Audit (Phase 1.1)
 *
 * Checks which cited source documents exist in our R2 bucket.
 * Reports coverage % and lists gaps.
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'node:fs';

const accessKeyId = "d4ebed69ce7b465f81eba5b06610e2b7";
const secretAccessKey = "9594ad104796e1403afc9284bcb0ed9c8e153b051538c4481d4fd900e3658a13";
const endpoint = "https://ddc5d0242287a3d94e62f99567e21534.r2.cloudflarestorage.com";
const BUCKET_NAME = 'dat-tracker-filings';

const r2 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

async function listAllR2Keys(): Promise<Set<string>> {
  const keys = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });
    const res = await r2.send(cmd);
    for (const obj of res.Contents || []) {
      if (obj.Key) keys.add(obj.Key);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

function findInR2(keys: Set<string>, ticker: string, accession: string): string | null {
  const prefixes = ['new-uploads', 'processed-sec-docs', 'sec-filings', ''];
  const extensions = ['.txt', '.html', ''];

  for (const prefix of prefixes) {
    for (const ext of extensions) {
      const key = prefix ? `${prefix}/${ticker}/${accession}${ext}` : `${ticker}/${accession}${ext}`;
      if (keys.has(key)) return key;
    }
  }
  return null;
}

async function main() {
  console.log('Fetching R2 bucket inventory...');
  const r2Keys = await listAllR2Keys();
  console.log(`R2 bucket has ${r2Keys.size} objects\n`);

  const content = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

  // Extract all /filings/ URLs
  const filingPattern = /\/filings\/([^/'"]+)\/([^'"]+)/g;
  const filings: { ticker: string; accession: string }[] = [];
  const seen = new Set<string>();
  let m;
  while ((m = filingPattern.exec(content)) !== null) {
    const key = `${m[1]}/${m[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      filings.push({ ticker: m[1], accession: m[2] });
    }
  }

  console.log(`Found ${filings.length} unique /filings/ citations in companies.ts\n`);

  let covered = 0;
  let missing = 0;
  const missingList: string[] = [];

  for (const f of filings) {
    const r2Key = findInR2(r2Keys, f.ticker, f.accession);
    if (r2Key) {
      covered++;
    } else {
      missing++;
      missingList.push(`${f.ticker}/${f.accession}`);
    }
  }

  const pct = ((covered / filings.length) * 100).toFixed(1);
  console.log('=== R2 Coverage Report (SEC Filings) ===');
  console.log(`Citations: ${filings.length}`);
  console.log(`Covered: ${covered} (${pct}%)`);
  console.log(`Missing: ${missing}`);

  if (missingList.length > 0) {
    console.log('\n--- Missing filings ---');
    for (const m of missingList) {
      console.log(`  ${m}`);
    }
  }

  // External source URLs
  const sourceFields = /(holdingsSourceUrl|debtSourceUrl|cashSourceUrl|sharesSourceUrl|burnSourceUrl|costBasisSourceUrl|preferredSourceUrl|stakingSourceUrl):\s*["'](https?:\/\/[^"']+)["']/g;
  const externalUrls = new Set<string>();
  while ((m = sourceFields.exec(content)) !== null) {
    externalUrls.add(m[2]);
  }

  const externalInR2 = [...r2Keys].filter(k => k.startsWith('external-sources/')).length;

  console.log(`\n=== External Source Coverage ===`);
  console.log(`Unique external URLs: ${externalUrls.size}`);
  console.log(`External docs in R2: ${externalInR2}`);

  // Overall
  const totalCitations = filings.length + externalUrls.size;
  const totalCovered = covered + externalInR2;
  const totalPct = ((totalCovered / totalCitations) * 100).toFixed(1);
  console.log(`\n=== Overall Coverage ===`);
  console.log(`Total unique citations: ${totalCitations}`);
  console.log(`Total with R2 backup: ${totalCovered} (${totalPct}%)`);
}

main().catch(console.error);
