/**
 * R2 Inventory → D1 Artifacts Backfill
 *
 * Lists objects in an R2 bucket and ensures there is a matching row in D1 `artifacts`.
 *
 * NOTE: D1 schema varies over time. This script targets the minimal schema currently in use
 * (artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, ...).
 */

import { createHash } from 'node:crypto';

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
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function classifySourceTypeFromKey(key: string): string | null {
  const k = key.toLowerCase();

  // Explicit pipeline prefixes (preferred)
  if (k.startsWith('sec/')) return 'sec';
  if (k.startsWith('sedar/')) return 'sedar';
  if (k.startsWith('dashboard/')) return 'dashboard';
  if (k.startsWith('manual/')) return 'manual';

  // Heuristics based on path segments
  if (k.includes('/xbrl/')) return 'sec_xbrl';
  if (k.includes('companyfacts')) return 'sec_companyfacts';

  // Many existing keys are ticker-first (e.g. "mstr/10q/...", "abtc/10k/...")
  // For these, treat as SEC filings unless we have a better classifier.
  const firstSeg = k.split('/')[0];
  if (/^[a-z0-9]{1,10}$/.test(firstSeg)) {
    if (k.includes('/10k/') || k.includes('/10q/') || k.includes('/8k/') || k.includes('/6k/') || k.includes('/20f/') || k.includes('/424b')) {
      return 'sec_filing';
    }
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

async function r2List(bucket: string, prefix: string, cursor?: string, limit = 1000): Promise<{ objects: R2ObjectLite[]; cursor?: string }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  if (!apiToken) throw new Error('Missing CLOUDFLARE_API_TOKEN');

  // Cloudflare R2 S3-compat is an option, but here we use the R2 REST API.
  // Endpoint: GET /accounts/:accountId/r2/buckets/:bucketName/objects
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucket}/objects`);
  if (prefix) url.searchParams.set('prefix', prefix);
  if (cursor) url.searchParams.set('cursor', cursor);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (!res.ok) throw new Error(`R2 list failed: ${res.status} ${res.statusText}: ${await res.text()}`);

  const json = await res.json();
  // Cloudflare result shape is inconsistent across APIs/versions:
  // - sometimes: { result: { objects: [...], cursor } }
  // - sometimes: { result: [...] } (array of objects)
  // Pagination cursor may be on json.result.cursor OR json.result_info.cursor.
  if (!json.success) throw new Error(`R2 list failed: ${JSON.stringify(json.errors || json)}`);

  const result = json.result;
  const objects = (Array.isArray(result) ? result : result?.objects || []) as R2ObjectLite[];
  const nextCursor = (
    (Array.isArray(result) ? (json.result_info?.cursor as string | undefined) : (result?.cursor as string | undefined))
  );

  if (process.env.DEBUG_R2_LIST === 'true') {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          msg: 'r2List: debug response shape',
          topLevelKeys: Object.keys(json || {}),
          resultType: Array.isArray(result) ? 'array' : typeof result,
          resultInfoKeys: json.result_info ? Object.keys(json.result_info) : null,
          nextCursor,
          objectsCount: objects.length,
        },
        null,
        2
      )
    );
  }

  if (!objects.length) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify(
        {
          msg: 'r2List: empty page',
          bucket,
          prefix,
          cursor,
          limit,
          resultKeys: result ? Object.keys(result) : null,
          sampleResult: result || null,
        },
        null,
        2
      )
    );
  }

  return { objects, cursor: nextCursor };
}

async function main() {
  const bucket = process.env.R2_BUCKET || '';
  const prefix = process.env.R2_PREFIX || '';
  const dryRun = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';
  const pageLimit = parseInt(process.env.R2_LIST_LIMIT || '1000', 10);
  const maxObjects = parseInt(process.env.MAX_OBJECTS || '0', 10); // 0 = unlimited
  const startCursor = (process.env.R2_CURSOR || '').trim() || undefined;

  if (!bucket) throw new Error('Missing R2_BUCKET');

  const summary: InventorySummary = {
    bucket,
    prefix,
    scanned: 0,
    inserted: 0,
    skipped: 0,
    unknownSourceType: 0,
    errors: 0,
  };

  let cursor: string | undefined = startCursor;

  // For chaining chunked runs
  let lastCursor: string | undefined = cursor;

  while (true) {
    const { objects, cursor: next } = await r2List(bucket, prefix, cursor, pageLimit);
    lastCursor = next;

    for (const obj of objects) {
      if (maxObjects && summary.scanned >= maxObjects) break;
      summary.scanned++;

      const sourceType = classifySourceTypeFromKey(obj.key);
      if (!sourceType) summary.unknownSourceType++;

      // Deterministic artifact_id: bucket+key
      const artifactId = sha256(`${bucket}:${obj.key}`);

      // Prefer object etag when present; otherwise hash the key as a weak fallback.
      const contentHash = obj.etag || obj.httpEtag || sha256(obj.key);
      const fetchedAt = obj.uploaded || null;

      if (dryRun) {
        summary.skipped++;
        continue;
      }

      try {
        await d1Query(
          `INSERT OR IGNORE INTO artifacts (
            artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [artifactId, sourceType || 'unknown', null, contentHash, fetchedAt, bucket, obj.key]
        );
        summary.inserted++;
      } catch (e) {
        summary.errors++;
        // eslint-disable-next-line no-console
        console.error('Insert failed', { key: obj.key, err: e instanceof Error ? e.message : String(e) });
      }
    }

    if (maxObjects && summary.scanned >= maxObjects) break;
    if (!next) break;
    cursor = next;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ success: true, dryRun, startCursor, nextCursor: lastCursor || null, summary }, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
