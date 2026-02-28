/**
 * D1 Artifacts Dedupe Unknown
 *
 * Deletes rows where source_type is unknown/NULL when there exists at least one
 * non-unknown row for the same (r2_bucket, r2_key).
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
  const dryRun = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';

  const candidates = await d1Query<{ r2_bucket: string; r2_key: string; unknown_cnt: number; total_cnt: number }>(
    `SELECT r2_bucket,
            r2_key,
            SUM(CASE WHEN source_type='unknown' OR source_type IS NULL THEN 1 ELSE 0 END) AS unknown_cnt,
            COUNT(*) AS total_cnt
     FROM artifacts
     GROUP BY r2_bucket, r2_key
     HAVING unknown_cnt > 0
        AND SUM(CASE WHEN source_type!='unknown' AND source_type IS NOT NULL THEN 1 ELSE 0 END) > 0
     ORDER BY unknown_cnt DESC
     LIMIT 500;`
  );

  let toDelete = 0;
  for (const r of candidates.results || []) toDelete += Number(r.unknown_cnt || 0);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: true,
          candidateKeys: (candidates.results || []).length,
          unknownRowsToDelete: toDelete,
          sample: (candidates.results || []).slice(0, 25),
        },
        null,
        2
      )
    );
    return;
  }

  let deleted = 0;
  for (const row of candidates.results || []) {
    const res = await d1Query<{ changes?: number }>(
      `DELETE FROM artifacts
       WHERE r2_bucket = ?
         AND r2_key = ?
         AND (source_type = 'unknown' OR source_type IS NULL);`,
      [row.r2_bucket, row.r2_key]
    );
    const changes = (res.results?.[0] as any)?.changes;
    if (typeof changes === 'number') deleted += changes;
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun: false,
        candidateKeys: (candidates.results || []).length,
        deleted,
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
