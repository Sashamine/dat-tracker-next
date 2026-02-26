#!/usr/bin/env npx tsx

import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const actionId = (argVal('action_id') || '').trim();
  const dryRun = process.env.DRY_RUN === 'true';

  if (!actionId) throw new Error('Missing --action_id=');

  const d1 = D1Client.fromEnv();

  const before = await d1.query(
    `SELECT action_id, entity_id, action_type, ratio, effective_date, source_url, confidence, created_at
     FROM corporate_actions WHERE action_id = ? LIMIT 1;`,
    [actionId]
  );

  console.log({ dryRun, before: before.results[0] || null });

  if (dryRun) return;

  await d1.query(`DELETE FROM corporate_actions WHERE action_id = ?;`, [actionId]);

  const after = await d1.query<{ cnt: number }>(
    `SELECT COUNT(1) as cnt FROM corporate_actions WHERE action_id = ?;`,
    [actionId]
  );

  console.log({ deleted: (after.results[0]?.cnt || 0) === 0 });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
