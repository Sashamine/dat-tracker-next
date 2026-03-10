import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '../../src/lib/d1';

const BUCKET = 'dat-tracker-filings';

function makeR2(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ENDPOINT}`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** Extract accession from SEC URL like /Archives/edgar/data/CIK/ACCESSION/file */
function parseSecAccession(url: string): string | null {
  // Pattern: /data/{cik}/{accession-no-dashes}/{file}
  const m = url.match(/\/data\/\d+\/(\d{18})\//);
  if (m) {
    const raw = m[1];
    return `${raw.slice(0, 10)}-${raw.slice(10, 12)}-${raw.slice(12)}`;
  }
  // Pattern: /data/{cik}/{accession-with-dashes}/{file}
  const m2 = url.match(/\/data\/\d+\/(\d{10}-\d{2}-\d{6})\//);
  if (m2) return m2[1];
  return null;
}

async function fetchAndUpload(r2: S3Client, url: string, key: string, isPdf: boolean): Promise<{ ok: boolean; size: number }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'DAT-Tracker research@dat-tracker.com',
      },
    });
    if (!res.ok) return { ok: false, size: 0 };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 50) return { ok: false, size: 0 };

    let body: Buffer = buf;
    let contentType = isPdf ? 'application/pdf' : 'text/plain';

    // For HTML, strip tags to plain text
    if (!isPdf) {
      const html = buf.toString('utf-8');
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
      if (text.length < 50) return { ok: false, size: 0 };
      body = Buffer.from(text);
      contentType = 'text/plain';
    }

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
    }));
    return { ok: true, size: body.length };
  } catch (e) {
    return { ok: false, size: 0 };
  }
}

async function main() {
  const d1 = D1Client.fromEnv();
  const r2 = makeR2();

  // Get all current datapoints with search terms but no accession
  const { results: rows } = await d1.query<any>(`
    SELECT d.entity_id, d.metric, d.value, d.citation_search_term,
           d.artifact_id, a.accession, a.r2_key, a.r2_bucket, a.source_url, a.source_type
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.citation_search_term IS NOT NULL AND d.citation_search_term != ''
      AND (a.accession IS NULL OR a.accession = '')
    ORDER BY d.entity_id, d.metric
  `);

  console.log(`Total items to process: ${rows.length}\n`);

  let secFixed = 0, downloaded = 0, skipped = 0, failed = 0;
  const processed = new Set<string>(); // track by artifact_id to avoid duplicate downloads

  for (const row of rows) {
    const url: string = row.source_url || '';
    const artifactId: string = row.artifact_id;
    const ticker = row.entity_id;

    // Skip if we already processed this artifact
    if (processed.has(artifactId)) continue;
    processed.add(artifactId);

    // === Category 1: SEC URLs — parse accession ===
    if (url.includes('sec.gov/Archives/edgar/data/')) {
      const accession = parseSecAccession(url);
      if (accession) {
        // Check if we already have this doc in R2
        const { results: existing } = await d1.query<any>(
          `SELECT artifact_id, r2_key FROM artifacts WHERE accession = ? AND r2_key NOT LIKE 'synthetic/%' LIMIT 1`,
          [accession]
        );

        if (existing.length > 0) {
          // Relink datapoints to existing artifact with this accession
          await d1.query('UPDATE datapoints SET artifact_id = ? WHERE artifact_id = ?',
            [existing[0].artifact_id, artifactId]);
          console.log(`SEC-RELINK ${ticker}/${row.metric} → ${existing[0].r2_key} (accession ${accession})`);
          secFixed++;
        } else {
          // Update this artifact with the parsed accession
          await d1.query('UPDATE artifacts SET accession = ? WHERE artifact_id = ?',
            [accession, artifactId]);
          console.log(`SEC-ACCESSION ${ticker}/${row.metric} → ${accession} (artifact updated, R2 may have it)`);
          secFixed++;
        }
        continue;
      }
    }

    // === Category 2: Skip dashboards / JS-rendered pages ===
    if (url.includes('treasury.digitalx.com') ||
        url.includes('analytics-avaxone.theblueprint.xyz') ||
        url.includes('ceaindustries.com/dashboard') ||
        url.includes('sec.gov/cgi-bin/browse-edgar')) {
      console.log(`SKIP-DASHBOARD ${ticker}/${row.metric} — ${url.slice(0, 60)}`);
      skipped++;
      continue;
    }

    // === Category 3: No URL at all ===
    if (!url) {
      console.log(`SKIP-NOURL ${ticker}/${row.metric} — no source URL`);
      skipped++;
      continue;
    }

    // === Category 4: Downloadable external sources ===
    const isPdf = url.endsWith('.pdf') || url.includes('.pdf');
    const ext = isPdf ? 'pdf' : 'txt';
    const key = `external-sources/${ticker.toLowerCase()}/${artifactId}.${ext}`;

    const result = await fetchAndUpload(r2, url, key, isPdf);
    if (result.ok) {
      await d1.query('UPDATE artifacts SET r2_bucket = ?, r2_key = ? WHERE artifact_id = ?',
        [BUCKET, key, artifactId]);
      console.log(`DOWNLOADED ${ticker}/${row.metric} → ${key} (${(result.size / 1024).toFixed(0)}KB)`);
      downloaded++;
    } else {
      console.log(`FAIL ${ticker}/${row.metric} — ${url.slice(0, 70)}`);
      failed++;
    }

    // Rate limit for external fetches
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nSummary:`);
  console.log(`  SEC accession fixed: ${secFixed}`);
  console.log(`  Downloaded to R2:    ${downloaded}`);
  console.log(`  Skipped (dashboard/no URL): ${skipped}`);
  console.log(`  Failed:              ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
