#!/usr/bin/env npx tsx

import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const sql = argVal('sql');
  const paramsRaw = argVal('params') || '';

  if (!sql) throw new Error('Missing --sql=');

  const params = paramsRaw
    ? paramsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const d1 = D1Client.fromEnv();
  const out = await d1.query<any>(sql, params);
  console.log(JSON.stringify(out.results, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
