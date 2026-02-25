#!/usr/bin/env npx tsx

import { extractXBRLData } from '../../src/lib/sec/xbrl-extractor';

// D1 remote exec via wrangler (keeps us from building a Worker yet)
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

type MetricRow = {
  metric: string;
  value: number;
  unit: string;
  as_of?: string;
  reported_at?: string;
  method?: string;
  confidence?: number;
  flags_json?: string;
};

function sh(cmd: string): string {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString('utf8');
}

function q(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function shellQuote(s: string): string {
  // Safe single-quote wrapper for bash -lc
  return `'${s.replace(/'/g, `'"'"'`)}'`;
}

function makeRunId(): string {
  return crypto.randomUUID();
}

async function main() {
  const ticker = (process.argv[2] || '').toUpperCase();
  const dryRun = process.argv.includes('--dry-run');
  if (!ticker) {
    console.error('usage: scripts/cloudflare/xbrl_to_d1.ts TICKER [--dry-run]');
    process.exit(1);
  }

  const x = await extractXBRLData(ticker);
  if (!x.success) {
    console.error(`[xbrl_to_d1] XBRL extract failed for ${ticker}: ${x.error}`);
    process.exit(2);
  }

  const runId = makeRunId();
  const startedAt = new Date().toISOString();

  const rows: MetricRow[] = [];
  if (typeof x.cashAndEquivalents === 'number') {
    rows.push({ metric: 'cash_usd', value: x.cashAndEquivalents, unit: 'USD', as_of: x.cashDate, method: 'sec_companyfacts_xbrl' });
  }
  if (typeof x.totalDebt === 'number') {
    rows.push({ metric: 'debt_usd', value: x.totalDebt, unit: 'USD', as_of: x.debtDate, method: 'sec_companyfacts_xbrl' });
  }
  if (typeof x.sharesOutstanding === 'number') {
    rows.push({ metric: 'basic_shares', value: x.sharesOutstanding, unit: 'shares', as_of: x.sharesOutstandingDate, method: 'sec_companyfacts_xbrl' });
  }
  if (typeof x.bitcoinHoldings === 'number') {
    // note: this is USD fair value per extractor
    rows.push({ metric: 'bitcoin_holdings_usd', value: x.bitcoinHoldings, unit: 'USD', as_of: x.bitcoinHoldingsDate, method: 'sec_companyfacts_xbrl' });
  }

  // reported_at: use SEC filed date if present, else as_of
  for (const r of rows) {
    r.reported_at = x.filingDate || r.as_of;
    r.confidence = 1.0;
  }

  const runSql = `INSERT OR REPLACE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
VALUES (${q(runId)}, ${q(startedAt)}, NULL, 'manual', NULL, ${q(`xbrl_to_d1 ticker=${ticker} accession=${x.accessionNumber || ''}`)});`;

  // provenance linkage: try to find an artifact matching ticker+accn in r2_key (best-effort)
  // If not found, datapoints will still be written with artifact_id='unknown' placeholder for now.
  const findArtifactSql = `SELECT artifact_id FROM artifacts WHERE ticker=${q(ticker)} AND (
  r2_key LIKE '%' || ${q(x.accessionNumber || '')} || '%'
) LIMIT 1;`;

  let artifactId: string | null = null;
  try {
    const out = sh(`wrangler d1 execute dat-tracker --remote --command ${shellQuote(findArtifactSql)}`);
    const m = out.match(/"artifact_id"\s*:\s*"([^"]+)"/);
    if (m) artifactId = m[1];
  } catch {
    // ignore
  }
  if (!artifactId) artifactId = 'unknown';

  const dpValues = rows
    .map(r => `(${q(crypto.randomUUID())}, ${q(ticker)}, ${q(r.metric)}, ${r.value}, ${q(r.unit)}, 0, ${q(r.as_of)}, ${q(r.reported_at)}, ${q(artifactId)}, ${q(runId)}, ${q(r.method || null)}, ${r.confidence ?? 1.0}, ${q(r.flags_json || null)}, ${q(new Date().toISOString())})`)
    .join(',\n');

  const dpSql = rows.length
    ? `INSERT INTO datapoints (datapoint_id, entity_id, metric, value, unit, scale, as_of, reported_at, artifact_id, run_id, method, confidence, flags_json, created_at) VALUES\n${dpValues};`
    : '';

  if (dryRun) {
    console.log(JSON.stringify({ ticker, xbrl: x, runSql, datapointsSql: dpSql }, null, 2));
    return;
  }

  sh(`wrangler d1 execute dat-tracker --remote --command ${shellQuote(runSql)}`);
  if (dpSql) sh(`wrangler d1 execute dat-tracker --remote --command ${shellQuote(dpSql)}`);

  console.log(`[xbrl_to_d1] wrote run=${runId} datapoints=${rows.length} ticker=${ticker} artifact_id=${artifactId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
