/**
 * D1 Artifacts Dedupe by (r2_bucket,r2_key)
 *
 * Keeps the newest row (by fetched_at, then id) for each (r2_bucket,r2_key).
 * Deletes the rest.
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

  // Count duplicate key groups
  const dupeGroups = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM (
       SELECT r2_bucket, r2_key
       FROM artifacts
       GROUP BY r2_bucket, r2_key
       HAVING COUNT(*) > 1
     );`
  );

  // Count total rows that would be deleted (duplicates beyond the winner)
  // Note: artifacts table has no `id` column; use rowid.
  const deleteCount = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM (
       SELECT rowid as rid,
              ROW_NUMBER() OVER (
                PARTITION BY r2_bucket, r2_key
                ORDER BY COALESCE(fetched_at,'') DESC, rowid DESC
              ) as rn
       FROM artifacts
     )
     WHERE rn > 1;`
  );

  if (dryRun) {
    const sample = await d1Query<{ r2_bucket: string; r2_key: string; cnt: number }>(
      `SELECT r2_bucket, r2_key, COUNT(*) as cnt
       FROM artifacts
       GROUP BY r2_bucket, r2_key
       HAVING cnt > 1
       ORDER BY cnt DESC
       LIMIT 25;`
    );

    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: true,
          duplicateKeyGroups: dupeGroups.results?.[0]?.cnt ?? null,
          wouldDeleteRows: deleteCount.results?.[0]?.cnt ?? null,
          sampleGroups: sample.results || [],
        },
        null,
        2
      )
    );
    return;
  }

  // Perform deletion (keep newest fetched_at, then highest rowid)
  await d1Query(
    `DELETE FROM artifacts
     WHERE rowid IN (
       SELECT rid
       FROM (
         SELECT rowid as rid,
                ROW_NUMBER() OVER (
                  PARTITION BY r2_bucket, r2_key
                  ORDER BY COALESCE(fetched_at,'') DESC, rowid DESC
                ) as rn
         FROM artifacts
       )
       WHERE rn > 1
     );`
  );

  const afterGroups = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM (
       SELECT r2_bucket, r2_key
       FROM artifacts
       GROUP BY r2_bucket, r2_key
       HAVING COUNT(*) > 1
     );`
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun: false,
        deletedRows: deleteCount.results?.[0]?.cnt ?? null,
        remainingDuplicateKeyGroups: afterGroups.results?.[0]?.cnt ?? null,
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
