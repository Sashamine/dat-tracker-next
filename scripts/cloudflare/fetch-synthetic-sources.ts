#!/usr/bin/env npx tsx
/**
 * Phase 4a: Fetch source documents for remaining synthetic artifacts and upload to R2.
 *
 * For each synthetic artifact with a fetchable source_url:
 *   1. Fetch the document (HTML or PDF)
 *   2. Upload to R2 under external-sources/{ticker}/{artifact_id}.{ext}
 *   3. Update the artifact row with real r2_bucket + r2_key
 *
 * Usage:
 *   npx tsx scripts/cloudflare/fetch-synthetic-sources.ts --dry-run
 *   npx tsx scripts/cloudflare/fetch-synthetic-sources.ts --ticker=MSTR
 *   npx tsx scripts/cloudflare/fetch-synthetic-sources.ts --write
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '../../src/lib/d1';

const DRY_RUN = !process.argv.includes('--write');
const BUCKET = 'dat-tracker-filings';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: env('R2_ENDPOINT'),
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });
}

const SEC_USER_AGENT = 'dat-tracker admin@dat-tracker.com';

async function fetchDocument(url: string): Promise<{ content: Buffer; contentType: string; ext: string } | null> {
  try {
    const headers: Record<string, string> = {};
    if (url.includes('sec.gov')) {
      headers['User-Agent'] = SEC_USER_AGENT;
    }
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());

    if (ct.includes('pdf') || url.endsWith('.pdf')) {
      return { content: buf, contentType: 'application/pdf', ext: 'pdf' };
    }
    // For HTML, extract text content
    const html = buf.toString('utf-8');
    // Strip HTML tags for a text version
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return { content: Buffer.from(text, 'utf-8'), contentType: 'text/plain', ext: 'txt' };
  } catch (e) {
    return null;
  }
}

async function uploadToR2(r2: S3Client, key: string, content: Buffer, contentType: string): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType,
  }));
}

async function main() {
  const onlyTicker = argVal('ticker')?.toUpperCase() || null;
  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const whereTicker = onlyTicker ? 'AND UPPER(a.ticker) = ?' : '';
  const params: unknown[] = [];
  if (onlyTicker) params.push(onlyTicker);

  const { results: synthetics } = await d1.query<{
    artifact_id: string;
    ticker: string | null;
    source_type: string | null;
    source_url: string | null;
    accession: string | null;
  }>(`
    SELECT a.artifact_id, a.ticker, a.source_type, a.source_url, a.accession
    FROM artifacts a
    WHERE a.r2_key LIKE 'synthetic/%'
      AND a.source_url IS NOT NULL
      AND a.source_url != ''
      AND a.source_url NOT LIKE 'holdings_history_ts://%'
      AND (a.source_url LIKE 'http://%' OR a.source_url LIKE 'https://%')
      ${whereTicker}
    ORDER BY a.ticker, a.artifact_id
  `, params);

  // Also count unfetchable ones
  const { results: unfetchable } = await d1.query<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM artifacts
    WHERE r2_key LIKE 'synthetic/%'
      AND (source_url IS NULL OR source_url = '' OR source_url LIKE 'holdings_history_ts://%' OR source_url LIKE '/filings/%')
  `);

  console.log(`Fetchable synthetic artifacts: ${synthetics.length}`);
  console.log(`Unfetchable (internal/null URLs): ${unfetchable[0].cnt}`);
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'WRITE'}`);
  if (onlyTicker) console.log(`Ticker filter: ${onlyTicker}`);

  let fetched = 0;
  let failed = 0;
  let uploaded = 0;
  let tooSmall = 0;

  for (const art of synthetics) {
    const url = art.source_url!;
    const ticker = (art.ticker || 'unknown').toLowerCase();

    // Rate limit for SEC
    if (url.includes('sec.gov')) {
      await new Promise((r) => setTimeout(r, 200));
    }

    const doc = await fetchDocument(url);
    if (!doc) {
      failed++;
      console.log(`FAIL ${art.artifact_id} (${art.ticker}) — fetch failed: ${url.slice(0, 80)}`);
      continue;
    }

    // Skip tiny documents (likely error pages)
    if (doc.content.length < 100) {
      tooSmall++;
      console.log(`SKIP ${art.artifact_id} (${art.ticker}) — too small (${doc.content.length}b): ${url.slice(0, 80)}`);
      continue;
    }

    fetched++;
    const r2Key = `external-sources/${ticker}/${art.artifact_id}.${doc.ext}`;

    if (DRY_RUN) {
      console.log(`WOULD UPLOAD ${art.artifact_id} (${art.ticker}) — ${doc.content.length}b ${doc.ext} → ${r2Key}`);
      continue;
    }

    await uploadToR2(r2, r2Key, doc.content, doc.contentType);
    await d1.query(
      `UPDATE artifacts SET r2_bucket = ?, r2_key = ? WHERE artifact_id = ?`,
      [BUCKET, r2Key, art.artifact_id],
    );
    uploaded++;
    if (uploaded % 20 === 0) console.log(`  ... uploaded ${uploaded}`);
    console.log(`UPLOADED ${art.artifact_id} (${art.ticker}) — ${doc.content.length}b → ${r2Key}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Fetchable: ${synthetics.length}`);
  console.log(`  Fetched: ${fetched}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Too small: ${tooSmall}`);
  if (!DRY_RUN) console.log(`  Uploaded: ${uploaded}`);

  // Final count
  const { results: remaining } = await d1.query<{ cnt: number }>(`
    SELECT COUNT(*) as cnt FROM artifacts WHERE r2_key LIKE 'synthetic/%'
  `);
  console.log(`  Synthetic remaining: ${remaining[0].cnt}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
