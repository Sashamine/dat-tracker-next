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
  const tablesRes = await d1Query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;`
  );
  const tables = (tablesRes.results || []).map((r) => r.name);

  const fkByTable: Record<string, any[]> = {};
  for (const t of tables) {
    // PRAGMA results come back as objects with columns: id, seq, table, from, to, on_update, on_delete, match
    const fkRes = await d1Query<any>(`PRAGMA foreign_key_list(${JSON.stringify(t)});`);
    fkByTable[t] = fkRes.results || [];
  }

  // Derive inbound references to artifacts
  const inboundToArtifacts: Array<{ table: string; from: string; to: string; on_delete: string; on_update: string }>
    = [];

  for (const [table, fks] of Object.entries(fkByTable)) {
    for (const fk of fks) {
      if (fk.table === 'artifacts') {
        inboundToArtifacts.push({
          table,
          from: fk.from,
          to: fk.to,
          on_delete: fk.on_delete,
          on_update: fk.on_update,
        });
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        tables,
        inboundToArtifacts,
        foreignKeys: fkByTable,
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
