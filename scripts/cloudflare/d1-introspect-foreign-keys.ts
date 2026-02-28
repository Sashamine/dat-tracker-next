/**
 * D1 Introspection: list tables and foreign key relationships.
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
  const tablesRes = await d1Query<{ name: string; sql: string | null }>(
    `SELECT name, sql
     FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name;`
  );

  const tables = (tablesRes.results || []).map((r) => r.name);
  const ddlByTable: Record<string, string | null> = {};
  for (const r of tablesRes.results || []) ddlByTable[r.name] = r.sql ?? null;

  // Heuristic: parse inbound FK references to artifacts from DDL (since PRAGMA is blocked)
  const inboundToArtifacts: Array<{ table: string; ddlSnippet: string }> = [];
  for (const [table, ddl] of Object.entries(ddlByTable)) {
    if (!ddl) continue;
    if (/references\s+artifacts\b/i.test(ddl)) {
      // Keep a small snippet around the match for readability
      const idx = ddl.toLowerCase().indexOf('references artifacts');
      const start = Math.max(0, idx - 80);
      const end = Math.min(ddl.length, idx + 160);
      inboundToArtifacts.push({ table, ddlSnippet: ddl.slice(start, end) });
    }
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        tables,
        inboundToArtifacts,
        tableDDLs: ddlByTable,
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
