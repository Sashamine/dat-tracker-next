#!/usr/bin/env npx tsx

import { D1Client } from '../src/lib/d1';

type VerificationCheck = {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  details?: string;
};

type DatapointRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number | null;
  as_of: string | null;
  reported_at: string | null;
  source_url: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

function verdictFromChecks(checks: VerificationCheck[]): 'pass' | 'warn' | 'fail' {
  if (checks.some(c => c.status === 'fail')) return 'fail';
  if (checks.some(c => c.status === 'warn')) return 'warn';
  return 'pass';
}

async function checkSourceUrlReachable(url: string | null): Promise<VerificationCheck> {
  if (!url) {
    return { name: 'source_url_reachable', status: 'warn', details: 'No source_url on datapoint' };
  }

  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    // Some hosts block HEAD; retry with GET (no body consumption needed here).
    if (res.status === 405 || res.status === 403) {
      const res2 = await fetch(url, { method: 'GET', redirect: 'follow' });
      const s2 = res2.status;
      if (s2 >= 200 && s2 < 400) return { name: 'source_url_reachable', status: 'pass', details: `GET ${s2}` };
      if (s2 === 404) return { name: 'source_url_reachable', status: 'fail', details: `GET ${s2}` };
      return { name: 'source_url_reachable', status: 'warn', details: `GET ${s2}` };
    }

    const s = res.status;
    if (s >= 200 && s < 400) return { name: 'source_url_reachable', status: 'pass', details: `HEAD ${s}` };
    if (s === 404) return { name: 'source_url_reachable', status: 'fail', details: `HEAD ${s}` };
    return { name: 'source_url_reachable', status: 'warn', details: `HEAD ${s}` };
  } catch (e) {
    return {
      name: 'source_url_reachable',
      status: 'warn',
      details: `Fetch error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function checkSanityRange(metric: string, value: number | null): VerificationCheck {
  if (value == null || !Number.isFinite(value)) {
    return { name: 'sanity_range', status: 'warn', details: 'Missing/invalid value' };
  }

  // Generic checks that are safe across metrics.
  if (value < 0) return { name: 'sanity_range', status: 'fail', details: 'Value < 0' };

  // Lightweight metric hints (can be expanded later).
  if (metric.toLowerCase().includes('shares') && value > 50_000_000_000) {
    return { name: 'sanity_range', status: 'warn', details: 'Unusually high shares value' };
  }

  if ((metric.toLowerCase().includes('holdings') || metric.toLowerCase().includes('btc')) && value > 10_000_000) {
    return { name: 'sanity_range', status: 'warn', details: 'Unusually high holdings value' };
  }

  return { name: 'sanity_range', status: 'pass' };
}

async function main() {
  const d1 = D1Client.fromEnv();

  const ticker = process.env.TICKER;
  const metric = process.env.METRIC;
  const limit = Number(process.env.LIMIT || '50');
  const dryRun = String(process.env.DRY_RUN || 'true').toLowerCase() !== 'false' ? true : false;
  const verifier = process.env.VERIFIER || 'auto';
  const codeSha = process.env.CODE_SHA || null;

  if (!ticker) throw new Error('Missing env TICKER');

  // NOTE: schema-native key is entity_id (not ticker).
  const where: string[] = ['entity_id = ?'];
  const params: any[] = [ticker];
  if (metric) {
    where.push('metric = ?');
    params.push(metric);
  }

  // Latest datapoints for ticker/metric.
  const q = `
    SELECT datapoint_id, entity_id, metric, value, as_of, reported_at, source_url
    FROM datapoints
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(as_of, reported_at) DESC
    LIMIT ?;
  `;
  params.push(limit);

  const rows = await d1.query<DatapointRow>(q, params);
  console.log(`verify-datapoints: entity_id=${ticker} metric=${metric || '*'} limit=${limit} dryRun=${dryRun} rows=${rows.results.length}`);

  let wrote = 0;

  for (const dp of rows.results) {
    const checks: VerificationCheck[] = [];
    checks.push(await checkSourceUrlReachable(dp.source_url));
    checks.push(checkSanityRange(dp.metric, dp.value));

    const verdict = verdictFromChecks(checks);

    const out = {
      datapoint_id: dp.datapoint_id,
      entity_id: dp.entity_id,
      metric: dp.metric,
      as_of: dp.as_of,
      reported_at: dp.reported_at,
      verdict,
      checks,
    };

    console.log(JSON.stringify(out));

    if (!dryRun) {
      const verification_id = crypto.randomUUID();
      const checked_at = nowIso();
      await d1.query(
        `INSERT INTO datapoint_verifications (verification_id, datapoint_id, verdict, checks_json, checked_at, verifier, code_sha)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [verification_id, dp.datapoint_id, verdict, JSON.stringify(checks), checked_at, verifier, codeSha]
      );
      wrote += 1;
    }
  }

  if (!dryRun) console.log(`Wrote ${wrote} verification rows`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
