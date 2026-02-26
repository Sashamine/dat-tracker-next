#!/usr/bin/env npx tsx
/**
 * Cleanup datapoints for specific artifacts.
 *
 * Usage:
 *   npx tsx scripts/cleanup-datapoints-by-artifact.ts --artifact <id> --keep bitcoin_holdings_btc,basic_shares
 */

import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const artifactId = (argVal('artifact') || '').trim();
  const keep = (argVal('keep') || '').trim();
  const del = (argVal('delete_metrics') || '').trim();
  const dryRun = process.env.DRY_RUN === 'true';

  if (!artifactId) {
    console.error('Missing --artifact=<artifact_id>');
    process.exit(1);
  }

  const keepSet = new Set(
    keep ? keep.split(',').map(s => s.trim()).filter(Boolean) : []
  );

  const deleteSet = new Set(
    del ? del.split(',').map(s => s.trim()).filter(Boolean) : []
  );

  const d1 = D1Client.fromEnv();

  const rows = await d1.query<{ metric: string; cnt: number }>(
    `SELECT metric, COUNT(1) as cnt FROM datapoints WHERE artifact_id = ? GROUP BY metric ORDER BY cnt DESC;`,
    [artifactId]
  );

  console.log({ artifactId, dryRun, keep: Array.from(keepSet), delete_metrics: Array.from(deleteSet), metrics: rows.results });

  const mode = deleteSet.size ? 'delete_metrics' : 'keep_all_except';

  if (mode === 'keep_all_except' && !keepSet.size) {
    console.error('Refusing to delete without --keep=... or --delete_metrics=...');
    process.exit(1);
  }

  if (mode === 'delete_metrics' && !deleteSet.size) {
    console.error('Refusing to delete without --delete_metrics=...');
    process.exit(1);
  }

  if (mode === 'delete_metrics') {
    const placeholders = Array.from(deleteSet).map(() => '?').join(',');
    if (dryRun) {
      const delCount = await d1.query<{ cnt: number }>(
        `SELECT COUNT(1) as cnt FROM datapoints WHERE artifact_id = ? AND metric IN (${placeholders});`,
        [artifactId, ...Array.from(deleteSet)]
      );
      console.log(`Would delete ${delCount.results[0]?.cnt || 0} rows`);
      return;
    }

    await d1.query(
      `DELETE FROM datapoints WHERE artifact_id = ? AND metric IN (${placeholders});`,
      [artifactId, ...Array.from(deleteSet)]
    );
  } else {
    const placeholders = Array.from(keepSet).map(() => '?').join(',');
    if (dryRun) {
      const delCount = await d1.query<{ cnt: number }>(
        `SELECT COUNT(1) as cnt FROM datapoints WHERE artifact_id = ? AND metric NOT IN (${placeholders});`,
        [artifactId, ...Array.from(keepSet)]
      );
      console.log(`Would delete ${delCount.results[0]?.cnt || 0} rows`);
      return;
    }

    await d1.query(
      `DELETE FROM datapoints WHERE artifact_id = ? AND metric NOT IN (${placeholders});`,
      [artifactId, ...Array.from(keepSet)]
    );
  }

  const after = await d1.query<{ metric: string; cnt: number }>(
    `SELECT metric, COUNT(1) as cnt FROM datapoints WHERE artifact_id = ? GROUP BY metric ORDER BY cnt DESC;`,
    [artifactId]
  );
  console.log({ after: after.results });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
