#!/usr/bin/env npx tsx
/**
 * download-xbrl-filings.ts
 *
 * For artifacts with XBRL JSON r2_keys (sec/companyfacts/...json),
 * downloads the actual filing document from SEC EDGAR, strips HTML to text,
 * uploads to R2, and updates the artifact's r2_key.
 *
 * Uses the SEC submissions API to find the primary document filename,
 * then fetches the actual filing HTML and strips it to plain text.
 *
 * Usage:
 *   npx tsx scripts/download-xbrl-filings.ts          # dry run
 *   npx tsx scripts/download-xbrl-filings.ts --apply   # download and upload
 */

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '../src/lib/d1';

const BUCKET = 'dat-tracker-filings';
const UA = 'DAT-Tracker research@dat-tracker.com';
const apply = process.argv.includes('--apply');

function makeR2(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!.startsWith('https://') ? process.env.R2_ENDPOINT! : `https://${process.env.R2_ENDPOINT}`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface FilingInfo {
  cik: string;
  primaryDoc: string;
  form: string;
}

/** Use SEC submissions API to find filing details */
async function getFilingInfo(cik: string, accession: string): Promise<FilingInfo | null> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status !== 200) return null;

    const data = await res.json() as any;
    const recent = data.filings?.recent;
    if (recent === undefined) return null;

    const idx = recent.accessionNumber?.indexOf(accession);
    if (idx === undefined || idx < 0) {
      // Check older filings
      const files = data.filings?.files || [];
      for (const f of files) {
        try {
          const fileUrl = `https://data.sec.gov/submissions/${f.name}`;
          const fileRes = await fetch(fileUrl, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(15000),
          });
          if (fileRes.status !== 200) continue;
          const fileData = await fileRes.json() as any;
          const fIdx = fileData.accessionNumber?.indexOf(accession);
          if (fIdx !== undefined && fIdx >= 0) {
            return {
              cik,
              primaryDoc: fileData.primaryDocument[fIdx],
              form: fileData.form[fIdx],
            };
          }
        } catch {}
        await new Promise(r => setTimeout(r, 300));
      }
      return null;
    }

    return {
      cik,
      primaryDoc: recent.primaryDocument[idx],
      form: recent.form[idx],
    };
  } catch {
    return null;
  }
}

async function fetchFiling(cik: string, accession: string, primaryDoc: string): Promise<string | null> {
  const accNoDash = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDash}/${primaryDoc}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(60000),
    });
    if (res.status !== 200) {
      console.log(`  Fetch failed: ${res.status} ${url}`);
      return null;
    }

    const html = await res.text();
    const text = stripHtml(html);

    if (text.length < 200) {
      console.log(`  Text too short after stripping: ${text.length} chars`);
      return null;
    }

    return text;
  } catch (e: any) {
    console.log(`  Fetch error: ${e.message?.slice(0, 60)}`);
    return null;
  }
}

async function main() {
  const d1 = D1Client.fromEnv();
  const r2 = makeR2();

  const { results: artifacts } = await d1.query<any>(`
    SELECT DISTINCT a.artifact_id, ld.entity_id, a.accession, a.r2_key
    FROM latest_datapoints ld
    JOIN artifacts a ON a.artifact_id = ld.artifact_id
    WHERE (ld.citation_search_term IS NULL OR ld.citation_search_term = '')
    AND a.accession IS NOT NULL AND a.accession != ''
    AND a.r2_key LIKE 'sec/companyfacts/%'
    ORDER BY ld.entity_id
  `);

  console.log(`XBRL artifacts to process: ${artifacts.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  // Get CIK for each ticker
  const cikMap = new Map<string, string>();
  for (const a of artifacts) {
    if (cikMap.has(a.entity_id)) continue;
    const { results: [row] } = await d1.query<any>(
      `SELECT source_url FROM artifacts WHERE artifact_id = ?`, [a.artifact_id]
    );
    if (row?.source_url) {
      const m = row.source_url.match(/CIK=(\d+)/);
      if (m) cikMap.set(a.entity_id, m[1]);
    }
  }

  let downloaded = 0, failed = 0;

  for (const a of artifacts) {
    const cik = cikMap.get(a.entity_id);
    if (cik === undefined) {
      console.log(`SKIP ${a.entity_id} — no CIK`);
      failed++;
      continue;
    }

    console.log(`${a.entity_id} ${a.accession}`);

    // Get filing info from submissions API
    const info = await getFilingInfo(cik, a.accession);
    if (info === null) {
      console.log(`  Filing not found in submissions API`);
      failed++;
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    console.log(`  ${info.form}: ${info.primaryDoc}`);

    // Fetch the actual filing
    const text = await fetchFiling(cik, a.accession, info.primaryDoc);
    if (text === null) {
      failed++;
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const key = `new-uploads/${a.entity_id.toLowerCase()}/${a.accession}.txt`;
    console.log(`  OK: ${(text.length / 1024).toFixed(0)}KB → ${key}`);

    if (apply) {
      await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(text),
        ContentType: 'text/plain',
      }));
      try {
        await d1.query('UPDATE artifacts SET r2_bucket = ?, r2_key = ? WHERE artifact_id = ?',
          [BUCKET, key, a.artifact_id]);
        console.log(`  Uploaded`);
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint')) {
          // Another artifact already has this key — just relink datapoints
          const { results: [existing] } = await d1.query<any>(
            `SELECT artifact_id FROM artifacts WHERE r2_bucket = ? AND r2_key = ?`,
            [BUCKET, key]
          );
          if (existing) {
            await d1.query('UPDATE datapoints SET artifact_id = ? WHERE artifact_id = ?',
              [existing.artifact_id, a.artifact_id]);
            console.log(`  Relinked to existing artifact ${existing.artifact_id}`);
          }
        } else {
          throw e;
        }
      }
    }

    downloaded++;
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDownloaded: ${downloaded}, Failed: ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
