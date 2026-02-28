/**
 * D1 Artifacts: dedupe by (r2_bucket, r2_key) keeping newest fetched_at.
 *
 * Because datapoints.artifact_id has an FK to artifacts(artifact_id), we must:
 *  1) pick a winner artifact_id per (r2_bucket,r2_key)
 *  2) remap datapoints.artifact_id -> winner artifact_id
 *  3) delete losing artifact rows
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

  // Winner selection: newest fetched_at; if tied/NULL, pick max artifact_id (stable).
  // NOTE: fetched_at is TEXT (ISO-ish). Lexicographic order should work for ISO timestamps.
  const winnersCte = `
WITH ranked AS (
  SELECT
    artifact_id,
    r2_bucket,
    r2_key,
    fetched_at,
    ROW_NUMBER() OVER (
      PARTITION BY r2_bucket, r2_key
      ORDER BY COALESCE(fetched_at,'') DESC, artifact_id DESC
    ) AS rn
  FROM artifacts
),
winners AS (
  SELECT r2_bucket, r2_key, artifact_id AS winner_artifact_id
  FROM ranked
  WHERE rn = 1
),
losers AS (
  SELECT r2_bucket, r2_key, artifact_id AS loser_artifact_id
  FROM ranked
  WHERE rn > 1
)
`;

  const dupeGroups = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM (
       SELECT r2_bucket, r2_key FROM artifacts GROUP BY r2_bucket, r2_key HAVING COUNT(*) > 1
     );`
  );

  const loserRows = await d1Query<{ cnt: number }>(
    `${winnersCte}
SELECT COUNT(*) as cnt FROM losers;`
  );

  // How many datapoints currently reference a losing artifact?
  const dpToRemap = await d1Query<{ cnt: number }>(
    `${winnersCte}
SELECT COUNT(*) as cnt
FROM datapoints d
JOIN losers l ON l.loser_artifact_id = d.artifact_id;`
  );

  // Sample keys with duplicates
  const sampleDupes = await d1Query<{ r2_bucket: string; r2_key: string; cnt: number }>(
    `SELECT r2_bucket, r2_key, COUNT(*) as cnt
     FROM artifacts
     GROUP BY r2_bucket, r2_key
     HAVING cnt > 1
     ORDER BY cnt DESC
     LIMIT 20;`
  );

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: true,
          duplicateKeyGroups: dupeGroups.results?.[0]?.cnt ?? null,
          loserRows: loserRows.results?.[0]?.cnt ?? null,
          datapointsToRemap: dpToRemap.results?.[0]?.cnt ?? null,
          sampleDuplicateGroups: sampleDupes.results || [],
        },
        null,
        2
      )
    );
    return;
  }

  // Apply in order. (D1 doesn't guarantee multi-statement transactions over HTTP; keep each statement atomic.)
  // 1) Remap datapoints that point at loser artifacts to their winner.
  await d1Query(
    `${winnersCte}
UPDATE datapoints
SET artifact_id = (
  SELECT w.winner_artifact_id
  FROM artifacts a
  JOIN winners w ON w.r2_bucket = a.r2_bucket AND w.r2_key = a.r2_key
  WHERE a.artifact_id = datapoints.artifact_id
)
WHERE artifact_id IN (SELECT loser_artifact_id FROM losers);
`
  );

  // 2) Delete losers
  await d1Query(
    `${winnersCte}
DELETE FROM artifacts
WHERE artifact_id IN (SELECT loser_artifact_id FROM losers);
`
  );

  // Post-check
  const afterGroups = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM (
       SELECT r2_bucket, r2_key FROM artifacts GROUP BY r2_bucket, r2_key HAVING COUNT(*) > 1
     );`
  );

  const orphanDps = await d1Query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt
     FROM datapoints d
     LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
     WHERE a.artifact_id IS NULL;`
  );

  console.log(
    JSON.stringify(
      {
        success: true,
        dryRun: false,
        duplicateKeyGroupsBefore: dupeGroups.results?.[0]?.cnt ?? null,
        loserRowsBefore: loserRows.results?.[0]?.cnt ?? null,
        datapointsToRemapBefore: dpToRemap.results?.[0]?.cnt ?? null,
        remainingDuplicateKeyGroups: afterGroups.results?.[0]?.cnt ?? null,
        datapointsOrphaned: orphanDps.results?.[0]?.cnt ?? null,
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
