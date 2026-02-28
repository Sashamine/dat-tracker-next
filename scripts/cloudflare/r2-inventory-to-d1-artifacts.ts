/**
 * R2 Inventory → D1 Artifacts Backfill
 *
 * Lists objects in an R2 bucket and ensures there is a matching row in D1 `artifacts`.
 *
 * NOTE: D1 schema varies over time. This script targets the minimal schema currently in use
 * (artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, ...).
 */

import { createHash } from 'node:crypto';
import { signAwsV4 } from './aws-sigv4';
import { parseListObjectsV2Xml } from './parse-list-objects-v2';

type D1QueryResult<T = any> = { results: T[]; success: boolean };

type D1Response<T = any> = {
  result: D1QueryResult<T>[];
  success: boolean;
  errors?: any[];
};

type R2ObjectLite = {
  key: string;
  size?: number;
  etag?: string;
  uploaded?: string;
  httpEtag?: string;
  customMetadata?: Record<string, string>;
};

type InventorySummary = {
  bucket: string;
  prefix: string;
  scanned: number;
  inserted: number;
  skipped: number;
  unknownSourceType: number;
  errors: number;
  unknownKeysSample?: string[];
  unknownFirstSegCounts?: Record<string, number>;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function classifySourceTypeFromKey(key: string): string | null {
  const k = key.toLowerCase();

  // Explicit pipeline prefixes (preferred)
  if (k.startsWith('sec/xbrl/')) return 'sec_xbrl';
  if (k.startsWith('sec/companyfacts/')) return 'sec_companyfacts';
  if (k.startsWith('sec/')) return 'sec_filing';
  if (k.startsWith('sedar/')) return 'sedar';
  if (k.startsWith('dashboard/')) return 'dashboard';
  if (k.startsWith('manual/')) return 'manual';

  // Legacy batch ingests: batchN/<ticker>/<accession>.txt
  // These are SEC filing text artifacts.
  if (/^batch\d+\//.test(k)) return 'sec_filing';

  // Hong Kong filings (PDFs)
  if (k.startsWith('hkex/')) return 'hkex_pdf';

  // Ad-hoc uploads (treat as manual until we add stronger conventions)
  if (k.startsWith('new-uploads/')) return 'manual';

  // Heuristics based on path segments
  if (k.includes('/xbrl/')) return 'sec_xbrl';
  if (k.includes('companyfacts')) return 'sec_companyfacts';

  // Many existing keys are ticker-first (e.g. "mstr/10q/...", "abtc/10k/...")
  // For these, treat as SEC filings unless we have a better classifier.
  const firstSeg = k.split('/')[0];
  if (/^[a-z0-9]{1,10}$/.test(firstSeg) && firstSeg !== 'hkex') {
    if (
      k.includes('/10k/') ||
      k.includes('/10ka/') ||
      k.includes('/10q/') ||
      k.includes('/10qa/') ||
      k.includes('/8k/') ||
      k.includes('/6k/') ||
      k.includes('/20f/') ||
      k.includes('/424b') ||
      k.includes('/proxy14a/') ||
      k.includes('/proxy14c/') ||
      k.includes('/s-3') ||
      k.includes('/s3') ||
      k.includes('/f-3') ||
      k.includes('/f3')
    ) {
      return 'sec_filing';
    }

    if (k.includes('/xbrl/')) return 'sec_xbrl';
    if (k.includes('companyfacts')) return 'sec_companyfacts';
  }

  // Root singletons (no directory structure)
  if (!k.includes('/')) {
    if (k.endsWith('.html') || k.endsWith('.pdf') || k.endsWith('.txt') || k.endsWith('.json')) return 'manual';
  }

  return null;
}

async function d1Query<T>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  if (!databaseId) throw new Error('Missing CLOUDFLARE_D1_DATABASE_ID');
  if (!apiToken) throw new Error('Missing CLOUDFLARE_API_TOKEN');

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) throw new Error(`D1 query failed: ${res.status} ${res.statusText}: ${await res.text()}`);
  const json = (await res.json()) as D1Response<T>;
  if (!json.success) throw new Error(`D1 query failed: ${JSON.stringify(json.errors || json)}`);
  return json.result?.[0] || { results: [], success: true };
}

async function r2List(
  bucket: string,
  prefix: string,
  cursor?: string,
  limit = 1000,
  startAfter?: string,
  delimiter?: string
): Promise<{ objects: R2ObjectLite[]; cursor?: string; commonPrefixes?: string[]; keyCount?: number; maxKeys?: number }> {
  // Prefer S3 ListObjectsV2 because it has deterministic pagination.
  // https://developers.cloudflare.com/r2/api/s3/api/#list-objects-v2
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  if (!accessKeyId) throw new Error('Missing CLOUDFLARE_R2_ACCESS_KEY_ID');
  if (!secretAccessKey) throw new Error('Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY');

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = new URL(`${endpoint}/${bucket}`);
  url.searchParams.set('list-type', '2');
  url.searchParams.set('max-keys', String(Math.min(Math.max(limit, 1), 1000)));
  if (prefix) url.searchParams.set('prefix', prefix);
  if (cursor) url.searchParams.set('continuation-token', cursor);
  if (!cursor && startAfter) url.searchParams.set('start-after', startAfter);
  if (delimiter) url.searchParams.set('delimiter', delimiter);

  // Minimal AWS SigV4 signing (no external deps)
  const { headers, method } = await signAwsV4({
    url,
    method: 'GET',
    region: 'auto',
    service: 's3',
    accessKeyId,
    secretAccessKey,
  });

  const res = await fetch(url.toString(), { method, headers });
  if (!res.ok) throw new Error(`R2 S3 list failed: ${res.status} ${res.statusText}: ${await res.text()}`);

  const xml = await res.text();
  const parsed = parseListObjectsV2Xml(xml);

  const objects: R2ObjectLite[] = parsed.contents.map((c) => ({
    key: c.Key,
    size: c.Size,
    etag: c.ETag?.replace(/\"/g, ''),
    uploaded: c.LastModified,
  }));

  const nextCursor = parsed.IsTruncated ? parsed.NextContinuationToken : undefined;
  return {
    objects,
    cursor: nextCursor,
    commonPrefixes: parsed.commonPrefixes,
    keyCount: parsed.KeyCount,
    maxKeys: parsed.MaxKeys,
  };
}

async function main() {
  const bucket = process.env.R2_BUCKET || '';
  const prefix = process.env.R2_PREFIX || '';
  const dryRun = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';
  const pageLimit = parseInt(process.env.R2_LIST_LIMIT || '1000', 10);
  const maxObjects = parseInt(process.env.MAX_OBJECTS || '0', 10); // 0 = unlimited
  const startCursor = (process.env.R2_CURSOR || '').trim() || undefined;
  const startAfter = (process.env.R2_START_AFTER || '').trim() || undefined;
  const delimiter = (process.env.R2_DELIMITER || '').trim() || undefined;
  const listPrefixesOnly = (process.env.R2_LIST_PREFIXES_ONLY || 'false').toLowerCase() === 'true';

  if (!bucket) throw new Error('Missing R2_BUCKET');

  const summary: InventorySummary = {
    bucket,
    prefix,
    scanned: 0,
    inserted: 0,
    skipped: 0,
    unknownSourceType: 0,
    errors: 0,
    unknownKeysSample: [],
    unknownFirstSegCounts: {},
  };

  let cursor: string | undefined = startCursor;
  let startAfterKey: string | undefined = startAfter;

  // For chaining chunked runs
  let lastCursor: string | undefined;

  while (true) {
    const { objects, cursor: next, commonPrefixes } = await r2List(
      bucket,
      prefix,
      cursor,
      pageLimit,
      startAfterKey,
      delimiter
    );
    lastCursor = next;

    if (listPrefixesOnly) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            success: true,
            dryRun,
            bucket,
            prefix,
            delimiter: delimiter || null,
            commonPrefixes: commonPrefixes || [],
            nextCursor: next || null,
          },
          null,
          2
        )
      );
      return;
    }

    if (process.env.DEBUG_R2_PAGINATION === 'true') {
      const firstKey = objects[0]?.key || null;
      const lastKey = objects[objects.length - 1]?.key || null;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          {
            msg: 'r2 pagination page',
            prefix,
            inCursor: cursor || null,
            outCursor: next || null,
            inStartAfter: cursor ? null : startAfterKey || null,
            firstKey,
            lastKey,
            pageCount: objects.length,
            scannedSoFar: summary.scanned,
            maxObjects: maxObjects || null,
          },
          null,
          2
        )
      );
    }

    for (const obj of objects) {
      if (maxObjects && summary.scanned >= maxObjects) break;
      summary.scanned++;

      const sourceType = classifySourceTypeFromKey(obj.key);
      if (!sourceType) {
        summary.unknownSourceType++;

        // Keep a small sample for debugging classifier gaps
        if ((summary.unknownKeysSample?.length || 0) < 25) summary.unknownKeysSample?.push(obj.key);

        const firstSeg = obj.key.split('/')[0] || '(empty)';
        summary.unknownFirstSegCounts![firstSeg] = (summary.unknownFirstSegCounts![firstSeg] || 0) + 1;
      }

      // Deterministic artifact_id: bucket+key
      const artifactId = sha256(`${bucket}:${obj.key}`);

      // Prefer object etag when present; otherwise hash the key as a weak fallback.
      const contentHash = obj.etag || obj.httpEtag || sha256(obj.key);
      const fetchedAt = obj.uploaded || null;

      if (dryRun) {
        // In dry-run we count how many would be processed.
        summary.skipped++;
        continue;
      }

      try {
        const before = summary.inserted;
        const desiredType = sourceType || 'unknown';

        const res = await d1Query<{ changes?: number }>(
          `INSERT OR IGNORE INTO artifacts (
            artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [artifactId, desiredType, null, contentHash, fetchedAt, bucket, obj.key]
        );

        const changes = (res.results?.[0] as any)?.changes;

        // If insert was ignored, upgrade unknown rows when we can classify them.
        if (typeof changes === 'number' && changes === 0 && desiredType !== 'unknown') {
          const upd = await d1Query<{ changes?: number }>(
            `UPDATE artifacts
             SET source_type = ?, content_hash = ?, fetched_at = ?
             WHERE artifact_id = ? AND (source_type = 'unknown' OR source_type IS NULL);`,
            [desiredType, contentHash, fetchedAt, artifactId]
          );
          const updChanges = (upd.results?.[0] as any)?.changes;
          if (typeof updChanges === 'number') summary.inserted += updChanges;
        } else if (typeof changes === 'number') {
          summary.inserted += changes;
        } else {
          summary.inserted = before + 1;
        }
      } catch (e) {
        summary.errors++;
        // eslint-disable-next-line no-console
        console.error('Insert failed', { key: obj.key, err: e instanceof Error ? e.message : String(e) });
      }
    }

    if (maxObjects && summary.scanned >= maxObjects) break;

    if (next) {
      cursor = next;
      startAfterKey = undefined;
      continue;
    }

    // Fallback when R2 does not return NextContinuationToken / IsTruncated.
    // If we got a full page, assume there may be more and advance using start-after.
    if (objects.length >= pageLimit) {
      startAfterKey = objects[objects.length - 1]?.key;
      if (process.env.DEBUG_R2_PAGINATION === 'true') {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify(
            {
              msg: 'r2 pagination fallback start-after',
              nextStartAfter: startAfterKey || null,
              reason: 'no next cursor but page was full',
            },
            null,
            2
          )
        );
      }
      if (!startAfterKey) break;
      cursor = undefined;
      continue;
    }

    break;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun,
        startCursor,
        startAfter,
        nextCursor: lastCursor || null,
        nextStartAfter: !lastCursor && startAfterKey ? startAfterKey : null,
        summary,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
