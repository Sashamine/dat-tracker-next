#!/usr/bin/env npx tsx
/**
 * Resolve remaining unfetchable synthetic artifacts by relinking datapoints
 * to the nearest real artifact for the same ticker.
 */
import { D1Client } from '../../src/lib/d1';

async function main() {
  const d1 = D1Client.fromEnv();

  const { results: remaining } = await d1.query<any>(
    `SELECT artifact_id, ticker, source_type, source_url FROM artifacts WHERE r2_key LIKE 'synthetic/%'`
  );

  console.log(`Unfetchable synthetic artifacts: ${remaining.length}\n`);

  let resolved = 0;
  let skipped = 0;

  for (const art of remaining) {
    // Find any real artifact for this ticker
    const { results: real } = await d1.query<any>(
      `SELECT artifact_id, r2_key FROM artifacts
       WHERE UPPER(ticker) = UPPER(?)
         AND r2_key NOT LIKE 'synthetic/%'
       ORDER BY fetched_at DESC
       LIMIT 1`,
      [art.ticker],
    );

    if (real.length === 0) {
      // No real artifact at all for this ticker — check if there are datapoints
      const { results: dps } = await d1.query<any>(
        'SELECT COUNT(*) as cnt FROM datapoints WHERE artifact_id = ?', [art.artifact_id]
      );
      if (dps[0].cnt === 0) {
        await d1.query('DELETE FROM artifacts WHERE artifact_id = ?', [art.artifact_id]);
        console.log(`DELETED ${art.ticker} — 0 datapoints, no real artifact exists`);
        resolved++;
      } else {
        console.log(`SKIP ${art.ticker} — ${dps[0].cnt} datapoints but no real artifact to relink to`);
        skipped++;
      }
      continue;
    }

    await d1.query('UPDATE datapoints SET artifact_id = ? WHERE artifact_id = ?',
      [real[0].artifact_id, art.artifact_id]);
    await d1.query(
      'DELETE FROM artifacts WHERE artifact_id = ? AND NOT EXISTS (SELECT 1 FROM datapoints WHERE artifact_id = ?)',
      [art.artifact_id, art.artifact_id]);
    console.log(`RELINKED ${art.ticker} (${art.source_type}) → ${real[0].r2_key}`);
    resolved++;
  }

  const { results: final } = await d1.query<any>(
    'SELECT COUNT(*) as cnt FROM artifacts WHERE r2_key LIKE ?', ['synthetic/%']
  );
  console.log(`\nResolved: ${resolved}, Skipped: ${skipped}`);
  console.log(`Synthetic remaining: ${final[0].cnt}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
