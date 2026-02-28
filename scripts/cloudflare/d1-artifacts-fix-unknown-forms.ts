/**
 * D1 Artifacts Fix Unknown Forms
 *
 * Reclassifies artifacts rows still marked source_type='unknown' when their r2_key
 * clearly indicates an SEC filing form folder.
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

function whereClause() {
  // Tight patterns only
  return `source_type='unknown' AND (
    r2_key LIKE '%/10ka/%' OR
    r2_key LIKE '%/10k/%' OR
    r2_key LIKE '%/10qa/%' OR
    r2_key LIKE '%/10q/%' OR
    r2_key LIKE '%/8k/%' OR
    r2_key LIKE '%/proxy14a/%' OR
    r2_key LIKE '%/proxy14c/%'
  )`;
}

async function main() {
  const dryRun = (process.env.DRY_RUN || 'true').toLowerCase() === 'true';

  const count = await d1Query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM artifacts WHERE ${whereClause()};`);
  const sample = await d1Query<{ r2_key: string }>(
    `SELECT r2_key FROM artifacts WHERE ${whereClause()} LIMIT 25;`
  );

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: true,
          matches: count.results?.[0]?.cnt ?? null,
          sampleKeys: (sample.results || []).map((r) => r.r2_key),
        },
        null,
        2
      )
    );
    return;
  }

  await d1Query(
    `UPDATE artifacts
     SET source_type='sec_filing'
     WHERE ${whereClause()};`
  );

  const after = await d1Query<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM artifacts WHERE ${whereClause()};`);

  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun: false,
        updated: count.results?.[0]?.cnt ?? null,
        remainingMatches: after.results?.[0]?.cnt ?? null,
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
