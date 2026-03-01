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
  inserted: number; // legacy: total D1 row changes (inserts + upgrades)
  insertedNew: number;
  upgradedExisting: number;
  noops: number;
  skipped: number;
  unknownSourceType: number;
  errors: number;
  unknownKeysSample?: string[];
  unknownFirstSegCounts?: Record<string, number>;
  sourceTypeCounts?: Record<string, number>;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { retries: number; backoffMs: number[] }
): Promise<T> {
  let attempt = 0;
  // Fixed backoff schedule to keep behavior deterministic
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const msg = e instanceof Error ? e.message : String(e);
      const maybeRetryable =
        msg.includes('429') ||
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('fetch failed') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT');

      if (!maybeRetryable || attempt > opts.retries) throw e;
      const delay = opts.backoffMs[Math.min(attempt - 1, opts.backoffMs.length - 1)] ?? 250;
      console.log(JSON.stringify({ msg: 'retry', label, attempt, delayMs: delay, err: msg }));
      await sleep(delay);
    }
  }
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

  // SEC form folders even when ticker heuristics fail
  if (k.includes('/10ka/')) return 'sec_filing';
  if (k.includes('/10k/')) return 'sec_filing';
  if (k.includes('/10qa/')) return 'sec_filing';
  if (k.includes('/10q/')) return 'sec_filing';
  if (k.includes('/8k/')) return 'sec_filing';
  if (k.includes('/proxy14a/')) return 'sec_filing';
  if (k.includes('/proxy14c/')) return 'sec_filing';

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
  const doQuery = async () => {
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
  };

  return withRetry('d1Query', doQuery, { retries: 3, backoffMs: [250, 1000, 2500] });
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

  const doList = async () => {
    const res = await fetch(url.toString(), { method, headers });
    if (!res.ok) throw new Error(`R2 S3 list failed: ${res.status} ${res.statusText}: ${await res.text()}`);
    return await res.text();
  };

  const xml = await withRetry('r2List', doList, { retries: 3, backoffMs: [250, 1000, 2500] });
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
  const progressEvery = parseInt(process.env.PROGRESS_EVERY || '500', 10);
  const maxErrors = parseInt(process.env.MAX_ERRORS || '25', 10);
  const requirePrefix = (process.env.REQUIRE_PREFIX || 'false').toLowerCase() === 'true';
  const allowEmptyPrefix = (process.env.ALLOW_EMPTY_PREFIX || 'false').toLowerCase() === 'true';
  const d1ThrottleMs = parseInt(process.env.D1_THROTTLE_MS || '0', 10);
  const verifyWrites = (process.env.VERIFY_WRITES || 'false').toLowerCase() === 'true';
  const startCursor = (process.env.R2_CURSOR || '').trim() || undefined;
  const startAfter = (process.env.R2_START_AFTER || '').trim() || undefined;
  const delimiter = (process.env.R2_DELIMITER || '').trim() || undefined;
  const listPrefixesOnly = (process.env.R2_LIST_PREFIXES_ONLY || 'false').toLowerCase() === 'true';

  if (!bucket) throw new Error('Missing R2_BUCKET');
  if (requirePrefix && !prefix && !allowEmptyPrefix) {
    throw new Error('Refusing to run with empty prefix (set ALLOW_EMPTY_PREFIX=true to override)');
  }

  const summary: InventorySummary = {
    bucket,
    prefix,
    scanned: 0,
    inserted: 0,
    insertedNew: 0,
    upgradedExisting: 0,
    noops: 0,
    skipped: 0,
    unknownSourceType: 0,
    errors: 0,
    unknownKeysSample: [],
    unknownFirstSegCounts: {},
    sourceTypeCounts: {},
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

    {
      const firstKey = objects[0]?.key || null;
      const lastKey = objects[objects.length - 1]?.key || null;
      // Always-on lightweight pagination log (debug adds extra detail)
      console.log(
        JSON.stringify({
          msg: 'r2_page',
          prefix,
          inCursor: cursor || null,
          outCursor: next || null,
          inStartAfter: cursor ? null : startAfterKey || null,
          pageCount: objects.length,
          firstKey,
          lastKey,
        })
      );

      if (process.env.DEBUG_R2_PAGINATION === 'true') {
      console.log(
          JSON.stringify(
            {
              msg: 'r2 pagination page (debug)',
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
    }

    for (const obj of objects) {
      if (maxObjects && summary.scanned >= maxObjects) break;
      summary.scanned++;

      const sourceType = classifySourceTypeFromKey(obj.key);
      const desiredType = sourceType || 'unknown';
      summary.sourceTypeCounts![desiredType] = (summary.sourceTypeCounts![desiredType] || 0) + 1;

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
        // Optional: verify writes by querying D1 before/after. Useful for small batches & debugging.
        // This adds extra D1 queries and should stay off by default.
        // Use env VERIFY_WRITES=true.
        const doVerify = verifyWrites;

        const before = doVerify
          ? await d1Query<{ cnt: number }>(
              `SELECT COUNT(*) AS cnt FROM artifacts WHERE r2_bucket = ? AND r2_key = ?;`,
              [bucket, obj.key]
            )
          : null;

        const res = await d1Query<{ changes?: number }>(
          `INSERT OR IGNORE INTO artifacts (
            artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [artifactId, desiredType, null, contentHash, fetchedAt, bucket, obj.key]
        );

        const changes = (res.results?.[0] as any)?.changes;

        // If insert was ignored, optionally upgrade only-when-better.
        // We treat (r2_bucket, r2_key) as the identity (enforced by UNIQUE index).
        // Policy: do NOT churn existing rows. Only upgrade when we can improve classification.
        if (typeof changes === 'number' && changes === 0) {
          if (desiredType !== 'unknown') {
            const upd = await d1Query<{ changes?: number }>(
              `UPDATE artifacts
               SET source_type = ?
               WHERE r2_bucket = ? AND r2_key = ? AND (source_type = 'unknown' OR source_type IS NULL);`,
              [desiredType, bucket, obj.key]
            );
            const updChanges = (upd.results?.[0] as any)?.changes;
            if (typeof updChanges === 'number' && updChanges > 0) {
              summary.upgradedExisting += updChanges;
              summary.inserted += updChanges;
            } else {
              summary.noops++;
            }
          } else {
            summary.noops++;
          }
        } else if (typeof changes === 'number') {
          // Note: D1's "changes" can be unreliable for INSERT OR IGNORE.
          // Prefer verified counts when enabled.
          if (!doVerify) {
            summary.insertedNew += changes;
            summary.inserted += changes;
          }
        } else {
          // Unknown response shape; don't guess unless verifyWrites is off.
          if (!doVerify) {
            summary.insertedNew += 1;
            summary.inserted += 1;
          }
        }

        if (doVerify) {
          const after = await d1Query<{ cnt: number }>(
            `SELECT COUNT(*) AS cnt FROM artifacts WHERE r2_bucket = ? AND r2_key = ?;`,
            [bucket, obj.key]
          );
          const beforeCnt = Number((before?.results?.[0] as any)?.cnt || 0);
          const afterCnt = Number((after?.results?.[0] as any)?.cnt || 0);

          // Only count as "insertedNew" if the row did not exist before and does exist now.
          if (beforeCnt === 0 && afterCnt === 1) {
            summary.insertedNew += 1;
            summary.inserted += 1;
          } else {
            // Either already existed, or insert failed silently (shouldn't happen without errors)
            summary.noops += 1;
          }
        }

        if (d1ThrottleMs > 0) await sleep(d1ThrottleMs);

        if (progressEvery > 0 && summary.scanned % progressEvery === 0) {
      console.log(
            JSON.stringify({
              msg: 'progress',
              scanned: summary.scanned,
              insertedNew: summary.insertedNew,
              upgradedExisting: summary.upgradedExisting,
              noops: summary.noops,
              errors: summary.errors,
              cursor: cursor || null,
              startAfter: startAfterKey || null,
              lastKey: obj.key,
            })
          );
        }

        if (maxErrors > 0 && summary.errors >= maxErrors) {
          throw new Error(`Aborting: errors (${summary.errors}) exceeded MAX_ERRORS (${maxErrors})`);
        }
      } catch (e) {
        summary.errors++;
      console.error('D1 write failed', {
          key: obj.key,
          artifactId,
          desiredType,
          contentHash,
          fetchedAt,
          err: e instanceof Error ? e.message : String(e),
        });
        if (maxErrors > 0 && summary.errors >= maxErrors) throw e;
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

  const resume = {
    bucket,
    prefix,
    cursor: lastCursor || null,
    start_after: !lastCursor && startAfterKey ? startAfterKey : null,
  };
      console.log(
    JSON.stringify(
      {
        success: true,
        dryRun,
        startCursor,
        startAfter,
        nextCursor: resume.cursor,
        nextStartAfter: resume.start_after,
        resume,
        summary,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
      console.error(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
