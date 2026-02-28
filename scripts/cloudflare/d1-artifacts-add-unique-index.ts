/**
 * D1 Artifacts: Add unique index on (r2_bucket, r2_key)
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
  const before = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM (
       SELECT r2_bucket, r2_key
       FROM artifacts
       GROUP BY r2_bucket, r2_key
       HAVING COUNT(*) > 1
     );`
  );

  if ((before.results?.[0]?.cnt ?? 0) > 0) {
    throw new Error(`Refusing to create unique index: still have ${before.results?.[0]?.cnt} duplicate key groups`);
  }

  await d1Query(
    `CREATE UNIQUE INDEX IF NOT EXISTS artifacts_r2_bucket_key_unique
     ON artifacts(r2_bucket, r2_key);`
  );

  console.log(JSON.stringify({ success: true, created: true }, null, 2));
}

main().catch((err) => {
  console.error(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }, null, 2));
  process.exit(1);
});
