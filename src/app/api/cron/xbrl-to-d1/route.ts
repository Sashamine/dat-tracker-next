/**
 * XBRL -> D1 Cron Endpoint
 *
 * Runs SEC XBRL extraction (companyfacts) for each ticker that exists in D1 artifacts
 * and writes datapoints (cash_usd, debt_usd, basic_shares, bitcoin_holdings_usd when available).
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractXBRLData } from '@/lib/sec/xbrl-extractor';
import { D1Client } from '@/lib/d1';
import { sendDiscordChannelMessage } from '@/lib/notifications/discord-channel';
import crypto from 'node:crypto';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

const DEFAULT_METRICS = ['cash_usd', 'debt_usd', 'basic_shares', 'bitcoin_holdings_usd'] as const;

type Metric = (typeof DEFAULT_METRICS)[number];

type MetricRow = { metric: Metric; value: number; unit: string; as_of?: string | null; reported_at?: string | null };

function nowIso() {
  return new Date().toISOString();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';
  const tickersParam = searchParams.get('tickers');
  const tickersFilter = tickersParam
    ? new Set(tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))
    : null;

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const d1 = D1Client.fromEnv();
  const startedAt = nowIso();
  const runId = crypto.randomUUID();

  const tickersRes = await d1.query<{ ticker: string }>(
    `SELECT DISTINCT ticker FROM artifacts WHERE ticker IS NOT NULL ORDER BY ticker;`
  );

  const tickers = tickersRes.results
    .map(r => (r.ticker || '').toUpperCase())
    .filter(Boolean)
    .filter(t => (tickersFilter ? tickersFilter.has(t) : true));

  if (!dryRun) {
    await d1.query(
      `INSERT OR REPLACE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
       VALUES (?, ?, NULL, ?, NULL, ?);`,
      [runId, startedAt, isManual ? 'manual' : 'scheduled', `xbrl-to-d1 tickers=${tickers.length}`]
    );
  }

  const summary: any[] = [];
  let datapointsAttempted = 0;
  let datapointsInserted = 0;
  let datapointsIgnored = 0;
  let failures = 0;

  for (const ticker of tickers) {
    const x = await extractXBRLData(ticker);
    if (!x.success) {
      failures += 1;
      summary.push({ ticker, success: false, error: x.error });
      continue;
    }

    // Best-effort artifact match
    const accn = (x.accessionNumber || '').trim();
    let artifactId = 'unknown';

    if (accn) {
      const a = await d1.query<{ artifact_id: string }>(
        `SELECT artifact_id FROM artifacts WHERE ticker = ? AND r2_key LIKE '%' || ? || '%' LIMIT 1;`,
        [ticker, accn]
      );
      if (a.results[0]?.artifact_id) artifactId = a.results[0].artifact_id;
    }

    if (!artifactId || artifactId === 'unknown') {
      const a = await d1.query<{ artifact_id: string }>(
        `SELECT artifact_id FROM artifacts WHERE ticker = ? ORDER BY created_at DESC LIMIT 1;`,
        [ticker]
      );
      if (a.results[0]?.artifact_id) artifactId = a.results[0].artifact_id;
    }

    const rows: MetricRow[] = [];
    if (typeof x.cashAndEquivalents === 'number') rows.push({ metric: 'cash_usd', value: x.cashAndEquivalents, unit: 'USD', as_of: x.cashDate || null });
    if (typeof x.totalDebt === 'number') rows.push({ metric: 'debt_usd', value: x.totalDebt, unit: 'USD', as_of: x.debtDate || null });
    if (typeof x.sharesOutstanding === 'number') rows.push({ metric: 'basic_shares', value: x.sharesOutstanding, unit: 'shares', as_of: x.sharesOutstandingDate || null });
    if (typeof x.bitcoinHoldings === 'number') rows.push({ metric: 'bitcoin_holdings_usd', value: x.bitcoinHoldings, unit: 'USD', as_of: x.bitcoinHoldingsDate || null });

    for (const r of rows) r.reported_at = x.filingDate || r.as_of || null;

    datapointsAttempted += rows.length;

    if (!dryRun) {
      for (const r of rows) {
        // Detect whether this would be a duplicate under our unique index
        const exists = await d1.query<{ n: number }>(
          `SELECT COUNT(*) AS n
           FROM datapoints
           WHERE entity_id = ?
             AND metric = ?
             AND COALESCE(as_of,'') = COALESCE(?, '')
             AND COALESCE(reported_at,'') = COALESCE(?, '')
             AND COALESCE(artifact_id,'') = COALESCE(?, '')
             AND value = ?
             AND unit = ?;`,
          [ticker, r.metric, r.as_of, r.reported_at, artifactId, r.value, r.unit]
        );

        await d1.query(
          `INSERT OR IGNORE INTO datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, created_at
           ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'sec_companyfacts_xbrl', 1.0, NULL, ?);`,
          [crypto.randomUUID(), ticker, r.metric, r.value, r.unit, r.as_of, r.reported_at, artifactId, runId, nowIso()]
        );

        if ((exists.results[0]?.n || 0) > 0) datapointsIgnored += 1;
        else datapointsInserted += 1;
      }
    }

    summary.push({ ticker, success: true, datapoints: rows.length, artifactId });
  }

  if (!dryRun) {
    await d1.query(`UPDATE runs SET ended_at = ? WHERE run_id = ?;`, [nowIso(), runId]);
  }

  const updatesChannelId = process.env.DISCORD_UPDATES_CHANNEL_ID;

  // Notify #updates channel on any failures
  if (!dryRun && updatesChannelId && failures > 0) {
    const failedTickers = summary.filter(s => !s.success).map(s => s.ticker).slice(0, 25);
    const extra = failures > failedTickers.length ? ` (+${failures - failedTickers.length} more)` : '';

    const msg = [
      `XBRL→D1 cron: ${failures}/${tickers.length} tickers failed.`,
      `runId: ${runId}`,
      `datapoints: +${datapointsInserted} new, ${datapointsIgnored} unchanged`,
      failedTickers.length ? `failed: ${failedTickers.join(', ')}${extra}` : undefined,
    ].filter(Boolean).join('\n');

    await sendDiscordChannelMessage(updatesChannelId, msg);
  }

  // On manual runs, optionally post a success summary (kept quiet for scheduled runs)
  if (!dryRun && updatesChannelId && isManual && failures === 0) {
    const msg = [
      `XBRL→D1 manual run OK: ${tickers.length} tickers`,
      `runId: ${runId}`,
      `datapoints: +${datapointsInserted} new, ${datapointsIgnored} unchanged`,
    ].join('\n');
    await sendDiscordChannelMessage(updatesChannelId, msg);
  }

  return NextResponse.json({
    success: true,
    runId,
    dryRun,
    tickers: tickers.length,
    datapointsAttempted,
    datapointsInserted: dryRun ? 0 : datapointsInserted,
    datapointsIgnored: dryRun ? 0 : datapointsIgnored,
    failures,
    summary,
  });
}

export const runtime = 'nodejs';
export const maxDuration = 300;
