/**
 * D1 Artifacts Summary
 *
 * Quick sanity-check queries for the `artifacts` table.
 */

type D1QueryResult<T = any> = { results: T[]; success: boolean };

type D1Response<T = any> = {
  result: D1QueryResult<T>[];
  success: boolean;
  errors?: any[];
};

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

async function main() {
  const tableExists = await d1Query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='artifacts' LIMIT 1;`
  );
  if (!tableExists.results?.length) {
    console.log(JSON.stringify({ success: false, error: 'Table artifacts does not exist' }, null, 2));
    process.exit(1);
  }

  const total = await d1Query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM artifacts;`);
  const byType = await d1Query<{ source_type: string; cnt: number }>(
    `SELECT source_type, COUNT(*) as cnt FROM artifacts GROUP BY source_type ORDER BY cnt DESC;`
  );
  const unknown = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM artifacts WHERE source_type='unknown' OR source_type IS NULL;`
  );
  const sampleUnknown = await d1Query<{ artifact_id: string; r2_bucket: string; r2_key: string; source_type: string | null }>(
    `SELECT artifact_id, r2_bucket, r2_key, source_type
     FROM artifacts
     WHERE source_type='unknown' OR source_type IS NULL
     LIMIT 25;`
  );

  const dupes = await d1Query<{ r2_bucket: string; r2_key: string; cnt: number; types: string }>(
    `SELECT r2_bucket,
            r2_key,
            COUNT(*) as cnt,
            GROUP_CONCAT(DISTINCT COALESCE(source_type, '(null)')) as types
     FROM artifacts
     GROUP BY r2_bucket, r2_key
     HAVING cnt > 1
     ORDER BY cnt DESC
     LIMIT 50;`
  );

  const unknownWithSibling = await d1Query<{ r2_bucket: string; r2_key: string; cnt: number; types: string }>(
    `SELECT r2_bucket,
            r2_key,
            COUNT(*) as cnt,
            GROUP_CONCAT(DISTINCT COALESCE(source_type, '(null)')) as types
     FROM artifacts
     GROUP BY r2_bucket, r2_key
     HAVING SUM(CASE WHEN source_type='unknown' OR source_type IS NULL THEN 1 ELSE 0 END) > 0
        AND SUM(CASE WHEN source_type!='unknown' AND source_type IS NOT NULL THEN 1 ELSE 0 END) > 0
     ORDER BY cnt DESC
     LIMIT 50;`
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        total: total.results?.[0]?.cnt ?? null,
        unknown: unknown.results?.[0]?.cnt ?? null,
        byType: byType.results || [],
        sampleUnknown: sampleUnknown.results || [],
        duplicates: dupes.results || [],
        unknownWithSibling: unknownWithSibling.results || [],
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
