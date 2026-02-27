#!/usr/bin/env npx tsx

import { D1Client } from '../src/lib/d1';

async function main() {
  const d1 = D1Client.fromEnv();

  const tables = await d1.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );

  const tableNames = tables.results.map(r => r.name);
  console.log(JSON.stringify({ tables: tableNames }, null, 2));

  // Cloudflare D1 API tokens may not be authorized to run PRAGMA (SQLITE_AUTH).
  // So instead, we sample one row from each table to infer column names.
  for (const t of tableNames) {
    try {
      const sample = await d1.query<any>(`SELECT * FROM ${t} LIMIT 1;`);
      const row = sample.results?.[0] || null;
      const columns = row ? Object.keys(row) : [];
      console.log(JSON.stringify({ table: t, columns, sampleRow: row }, null, 2));
    } catch (e) {
      console.log(
        JSON.stringify(
          {
            table: t,
            error: e instanceof Error ? e.message : String(e),
          },
          null,
          2
        )
      );
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
