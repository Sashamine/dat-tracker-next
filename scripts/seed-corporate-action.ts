#!/usr/bin/env npx tsx

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

async function main() {
  const ticker = (argVal('ticker') || '').trim().toUpperCase();
  const actionType = (argVal('action_type') || '').trim();
  const ratioRaw = (argVal('ratio') || '').trim();
  const effectiveDate = (argVal('effective_date') || '').trim();
  const sourceUrl = (argVal('source_url') || '').trim() || null;
  const dryRun = process.env.DRY_RUN === 'true';

  if (!ticker) throw new Error('Missing --ticker=');
  if (!actionType) throw new Error('Missing --action_type=');
  const ratio = Number(ratioRaw);
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error('Invalid --ratio= (must be > 0)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error('Invalid --effective_date= (YYYY-MM-DD)');

  const d1 = D1Client.fromEnv();
  const actionId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const row = {
    action_id: actionId,
    entity_id: ticker,
    action_type: actionType,
    ratio,
    effective_date: effectiveDate,
    source_artifact_id: null,
    source_url: sourceUrl,
    quote: null,
    confidence: 1.0,
    created_at: createdAt,
  };

  console.log({ dryRun, row });

  if (dryRun) return;

  await d1.query(
    `INSERT INTO corporate_actions (
       action_id, entity_id, action_type, ratio, effective_date,
       source_artifact_id, source_url, quote, confidence, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.action_id,
      row.entity_id,
      row.action_type,
      row.ratio,
      row.effective_date,
      row.source_artifact_id,
      row.source_url,
      row.quote,
      row.confidence,
      row.created_at,
    ]
  );

  const out = await d1.query(
    `SELECT action_id, entity_id, action_type, ratio, effective_date, source_url, confidence, created_at
     FROM corporate_actions WHERE action_id = ? LIMIT 1;`,
    [actionId]
  );

  console.log({ inserted: out.results[0] || null });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
