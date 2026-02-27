#!/usr/bin/env npx tsx

import { D1Client } from '../src/lib/d1';

async function main() {
  const d1 = D1Client.fromEnv();

  const tables = await d1.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );

  console.log(JSON.stringify({ tables: tables.results.map(r => r.name) }, null, 2));

  for (const t of tables.results.map(r => r.name)) {
    const info = await d1.query<any>(`PRAGMA table_info(${t});`);
    console.log(JSON.stringify({ table: t, columns: info.results }, null, 2));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
