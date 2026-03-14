/**
 * XBRL -> D1 Cron Endpoint
 *
 * Runs SEC XBRL extraction (companyfacts) for each ticker that exists in D1 artifacts
 * and writes datapoints (cash_usd, debt_usd, basic_shares, bitcoin_holdings_usd, holdings_native when available).
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractXBRLData } from '@/lib/sec/xbrl-extractor';
import { D1Client } from '@/lib/d1';
import { sendDiscordChannelMessage } from '@/lib/notifications/discord-channel';
import { generateXbrlCitation } from '@/lib/utils/citation';
import { ensureFilingInR2 } from '@/lib/sec/filing-downloader';
import crypto from 'node:crypto';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

type Metric = 'cash_usd' | 'debt_usd' | 'basic_shares' | 'bitcoin_holdings_usd' | 'holdings_native';

type MetricRow = { metric: Metric; value: number; unit: string; as_of?: string | null; reported_at?: string | null; flags_json?: string | null; xbrl_concept?: string | null; citation_quote?: string | null; citation_search_term?: string | null };
type ExistingProposalRow = {
  value: number;
  unit: string;
  scale: number;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number | null;
  flags_json: string | null;
  confidence_details_json: string | null;
  status: string;
};

function nowIso() {
  return new Date().toISOString();
}

function makeProposalKey(parts: {
  entityId: string;
  metric: string;
  proposalSource: string;
  asOf: string | null;
  reportedAt: string | null;
}): string {
  const raw = [
    'v1',
    parts.entityId,
    parts.metric,
    parts.proposalSource,
    parts.asOf || '',
    parts.reportedAt || '',
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sameMutableFields(existing: ExistingProposalRow, incoming: {
  value: number;
  unit: string;
  scale: number;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number;
  flags_json: string | null;
  confidence_details_json: string | null;
  status: string;
}): boolean {
  return (
    Number(existing.value) === Number(incoming.value) &&
    existing.unit === incoming.unit &&
    Number(existing.scale) === Number(incoming.scale) &&
    (existing.as_of || null) === incoming.as_of &&
    (existing.reported_at || null) === incoming.reported_at &&
    existing.artifact_id === incoming.artifact_id &&
    existing.run_id === incoming.run_id &&
    (existing.method || null) === incoming.method &&
    Number(existing.confidence ?? 0) === Number(incoming.confidence ?? 0) &&
    (existing.flags_json || null) === (incoming.flags_json || null) &&
    (existing.confidence_details_json || null) === (incoming.confidence_details_json || null) &&
    existing.status === incoming.status
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';
  const tickersParam = searchParams.get('tickers');
  const tickersFilter = tickersParam
    ? new Set(tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean))
    : null;

  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '50', 10) || 50));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10) || 0);

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const d1 = D1Client.fromEnv();
  const startedAt = nowIso();
  const runId = crypto.randomUUID();

  const allTickers = tickersFilter
    ? Array.from(tickersFilter)
    : (
        await d1.query<{ ticker: string }>(
          `SELECT DISTINCT ticker FROM artifacts WHERE ticker IS NOT NULL ORDER BY ticker;`
        )
      ).results
        .map(r => (r.ticker || '').toUpperCase())
        .filter(Boolean);

  const tickers = allTickers.slice(offset, offset + limit);

  // Load entity-metric config to determine auto-approve status per entity+metric.
  // Entities with auto_approve=0 get status='candidate' instead of 'approved'.
  const configRows = await d1.query<{ entity_id: string; metric: string; auto_approve: number }>(
    `SELECT entity_id, metric, auto_approve FROM entity_metric_config WHERE auto_approve = 0`
  ).catch(() => ({ results: [] as { entity_id: string; metric: string; auto_approve: number }[] }));
  const noAutoApprove = new Set(
    (configRows.results || []).map(r => `${r.entity_id}|${r.metric}`)
  );

  if (!dryRun) {
    await d1.query(
      `INSERT OR REPLACE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
       VALUES (?, ?, NULL, ?, NULL, ?);`,
      [runId, startedAt, isManual ? 'manual' : 'scheduled', `xbrl-to-d1 tickers=${tickers.length}/${allTickers.length} offset=${offset} limit=${limit}`]
    );
  }

  const summary: Array<{ ticker: string; success: boolean; datapoints?: number; artifactId?: string; error?: string }> = [];
  let datapointsAttempted = 0;
  let datapointsInserted = 0;
  let datapointsUpdated = 0;
  let datapointsSeededProposalKey = 0;
  let datapointsNoop = 0;
  let failures = 0;

  // Pre-load corporate actions (splits) so we can adjust XBRL share counts.
  // Without this, the cron re-inserts pre-split values that corrupt HPS calculations.
  const allActions = await d1.query<{ entity_id: string; effective_date: string; ratio: number }>(
    `SELECT entity_id, effective_date, ratio FROM corporate_actions ORDER BY entity_id, effective_date`
  ).catch(() => ({ results: [] as { entity_id: string; effective_date: string; ratio: number }[] }));
  const actionsByTicker = new Map<string, Array<{ effective_date: string; ratio: number }>>();
  for (const a of allActions.results) {
    const k = a.entity_id.toUpperCase();
    if (!actionsByTicker.has(k)) actionsByTicker.set(k, []);
    actionsByTicker.get(k)!.push({ effective_date: a.effective_date, ratio: a.ratio });
  }

  for (const ticker of tickers) {
    try {
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
        // Some D1 schemas may not include a created_at column on artifacts; avoid ordering on it.
        `SELECT artifact_id FROM artifacts WHERE ticker = ? LIMIT 1;`,
        [ticker]
      );
      if (a.results[0]?.artifact_id) artifactId = a.results[0].artifact_id;
    }

    // If we still don't have an artifact, create a synthetic one so FK constraints pass.
    if (!artifactId || artifactId === 'unknown') {
      artifactId = crypto.randomUUID();

      const now = nowIso();
      const cik = (x.cik || '').trim() || null;
      const accn2 = (x.accessionNumber || '').trim() || null;

      const sourceUrl = cik ? `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json` : null;
      const r2Bucket = 'synthetic';
      const r2Key = `companyfacts/${cik || ticker}/${accn2 || 'latest'}.json`;
      const contentHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ ticker, cik, accn: accn2, fetched_at: now }))
        .digest('hex');

      await d1.query(
        `INSERT OR IGNORE INTO artifacts (
           artifact_id, source_type, source_url, content_hash, fetched_at,
           r2_bucket, r2_key, cik, ticker, accession
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [artifactId, 'sec_companyfacts_xbrl', sourceUrl, contentHash, now, r2Bucket, r2Key, cik, ticker, accn2]
      );

      // INSERT OR IGNORE silently drops the row if content_hash or (r2_bucket,r2_key) collide.
      // Re-query to get the actual persisted artifact_id.
      const actualArt = await d1.query<{ artifact_id: string }>(
        `SELECT artifact_id FROM artifacts WHERE content_hash = ? LIMIT 1;`,
        [contentHash]
      );
      if (actualArt.results?.[0]?.artifact_id) artifactId = actualArt.results[0].artifact_id;
    }

    const rows: MetricRow[] = [];
    const xAccession = (x.accessionNumber || '').trim() || null;
    const xForm = x.filingType || null;

    if (typeof x.cashAndEquivalents === 'number') rows.push({ metric: 'cash_usd', value: x.cashAndEquivalents, unit: 'USD', as_of: x.cashDate || null, xbrl_concept: x.cashConcept || null });
    if (typeof x.totalDebt === 'number') rows.push({ metric: 'debt_usd', value: x.totalDebt, unit: 'USD', as_of: x.debtDate || null, xbrl_concept: x.debtConcept || null });
    if (typeof x.sharesOutstanding === 'number') {
      // Adjust for corporate actions (reverse splits) that occurred AFTER this XBRL date.
      // XBRL returns raw historical values; if a 1:5 reverse split happened after the
      // filing date, the raw value is 5x too high. Apply the split ratio to normalize.
      let adjustedShares = x.sharesOutstanding;
      const splits = actionsByTicker.get(ticker.toUpperCase()) || [];
      const sharesAsOf = x.sharesOutstandingDate || '';
      for (const split of splits) {
        if (sharesAsOf && split.effective_date > sharesAsOf) {
          adjustedShares *= split.ratio;
        }
      }
      // Round to nearest integer (splits can produce fractional shares)
      adjustedShares = Math.round(adjustedShares);
      rows.push({ metric: 'basic_shares', value: adjustedShares, unit: 'shares', as_of: x.sharesOutstandingDate || null, xbrl_concept: x.sharesConcept || null });
    }
    if (typeof x.bitcoinHoldings === 'number') rows.push({ metric: 'bitcoin_holdings_usd', value: x.bitcoinHoldings, unit: 'USD', as_of: x.bitcoinHoldingsDate || null, xbrl_concept: x.bitcoinHoldingsUsdConcept || null });
    if (typeof x.bitcoinHoldingsNative === 'number' && x.bitcoinHoldingsNativeUnit === 'BTC') {
      const impliedPriceUsd =
        typeof x.bitcoinHoldings === 'number' && x.bitcoinHoldingsNative > 0
          ? x.bitcoinHoldings / x.bitcoinHoldingsNative
          : null;
      const impliedPriceOutOfRange =
        typeof impliedPriceUsd === 'number'
          ? (impliedPriceUsd < 1000 || impliedPriceUsd > 500000)
          : false;
      rows.push({
        metric: 'holdings_native',
        value: x.bitcoinHoldingsNative,
        unit: 'BTC',
        as_of: x.bitcoinHoldingsDate || null,
        xbrl_concept: x.bitcoinHoldingsNativeConcept || null,
        flags_json: JSON.stringify({
          native_extraction: {
            concept: x.bitcoinHoldingsNativeConcept || null,
            unit_key: x.bitcoinHoldingsNativeUnitKey || 'BTC',
            unit_key_original: x.bitcoinHoldingsNativeUnitKeyOriginal || x.bitcoinHoldingsNativeUnitKey || null,
          },
          sanity: impliedPriceUsd !== null
            ? {
                implied_price_usd: impliedPriceUsd,
                implied_price_out_of_range: impliedPriceOutOfRange,
                implied_price_range_usd: [1000, 500000],
              }
            : undefined,
        }),
      });
    }

    for (const r of rows) {
      r.reported_at = x.filingDate || r.as_of || null;
      // Generate citation at insert time (Phase 4c)
      const cite = generateXbrlCitation({
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        xbrlConcept: r.xbrl_concept || null,
        asOf: r.as_of || null,
        form: xForm,
        accession: xAccession,
      });
      r.citation_quote = cite.citation_quote;
      r.citation_search_term = cite.citation_search_term;
    }

    datapointsAttempted += rows.length;

    if (!dryRun && rows.length) {
      for (const r of rows) {
        const proposalKey = makeProposalKey({
          entityId: ticker,
          metric: r.metric,
          proposalSource: x.accessionNumber || x.secUrl || artifactId,
          asOf: r.as_of || null,
          reportedAt: r.reported_at || null,
        });

        const existingByProposal = await d1.query<ExistingProposalRow>(
          `SELECT
             value, unit, scale, as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, confidence_details_json, status
           FROM datapoints
           WHERE proposal_key = ?
           LIMIT 1;`,
          [proposalKey]
        );

        const dedupeCollision = existingByProposal.results.length
          ? { results: [] as Array<{ datapoint_id: string; proposal_key: string | null }> }
          : await d1.query<{ datapoint_id: string; proposal_key: string | null }>(
              `SELECT datapoint_id
                     , proposal_key
               FROM datapoints
               WHERE entity_id = ?
                 AND metric = ?
                 AND COALESCE(as_of, '') = COALESCE(?, '')
                 AND COALESCE(reported_at, '') = COALESCE(?, '')
                 AND COALESCE(artifact_id, '') = COALESCE(?, '')
                 AND value = ?
                 AND unit = ?
               LIMIT 1;`,
              [ticker, r.metric, r.as_of || null, r.reported_at || null, artifactId, r.value, r.unit]
            );

        if (dedupeCollision.results.length) {
          const legacy = dedupeCollision.results[0];

          // Always backfill citations on dedupe collision if we have better data
          if (r.citation_quote && r.citation_search_term) {
            await d1.query(
              `UPDATE datapoints
               SET citation_quote = ?,
                   citation_search_term = ?
               WHERE datapoint_id = ?
                 AND (citation_quote IS NULL
                      OR citation_search_term IS NULL
                      OR citation_quote LIKE 'Series A Preferred Stock%');`,
              [r.citation_quote, r.citation_search_term, legacy.datapoint_id]
            );
          }

          if (legacy.proposal_key) {
            datapointsNoop += 1;
            continue;
          }

          const seedStatus = noAutoApprove.has(`${ticker}|${r.metric}`) ? 'candidate' : 'approved';
          const seed = await d1.query(
            `UPDATE datapoints
             SET proposal_key = ?,
                 status = ?
             WHERE datapoint_id = ?
               AND proposal_key IS NULL
               AND NOT EXISTS (SELECT 1 FROM datapoints WHERE proposal_key = ?);`,
            [proposalKey, seedStatus, legacy.datapoint_id, proposalKey]
          );

          const seeded = Number(seed.meta?.changes || 0) > 0;
          if (seeded) datapointsSeededProposalKey += 1;
          else datapointsNoop += 1;
          continue;
        }

        // Check entity_metric_config: if auto_approve=0, write as 'candidate' (invisible on site)
        const metricStatus = noAutoApprove.has(`${ticker}|${r.metric}`) ? 'candidate' : 'approved';

        const incoming = {
          value: r.value,
          unit: r.unit,
          scale: 0,
          as_of: r.as_of || null,
          reported_at: r.reported_at || null,
          artifact_id: artifactId,
          run_id: runId,
          method: 'sec_companyfacts_xbrl',
          confidence: 1.0,
          flags_json: r.flags_json || null,
          confidence_details_json: null as string | null,
          status: metricStatus,
        };

        await d1.query(
          `INSERT INTO datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, confidence_details_json, status,
             proposal_key, created_at, xbrl_concept, citation_quote, citation_search_term
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(proposal_key) DO UPDATE SET
             value = excluded.value,
             unit = excluded.unit,
             scale = excluded.scale,
             as_of = excluded.as_of,
             reported_at = excluded.reported_at,
             artifact_id = excluded.artifact_id,
             run_id = excluded.run_id,
             method = excluded.method,
             confidence = excluded.confidence,
             flags_json = excluded.flags_json,
             confidence_details_json = excluded.confidence_details_json,
             status = excluded.status,
             xbrl_concept = excluded.xbrl_concept,
             citation_quote = excluded.citation_quote,
             citation_search_term = excluded.citation_search_term;`,
          [
            crypto.randomUUID(),
            ticker,
            r.metric,
            incoming.value,
            incoming.unit,
            incoming.scale,
            incoming.as_of,
            incoming.reported_at,
            incoming.artifact_id,
            incoming.run_id,
            incoming.method,
            incoming.confidence,
            incoming.flags_json,
            incoming.confidence_details_json,
            incoming.status,
            proposalKey,
            nowIso(),
            r.xbrl_concept || null,
            r.citation_quote || null,
            r.citation_search_term || null,
          ]
        );

        if (!existingByProposal.results.length) {
          datapointsInserted += 1;
        } else if (sameMutableFields(existingByProposal.results[0], incoming)) {
          datapointsNoop += 1;
        } else {
          datapointsUpdated += 1;
        }
      }
    }

    // Ensure the filing document is in R2 for the filing viewer
    if (!dryRun && accn && x.cik && (datapointsInserted > 0 || datapointsUpdated > 0)) {
      try {
        const dlResult = await ensureFilingInR2({
          ticker,
          accession: accn,
          cik: x.cik,
          artifactId,
          d1,
        });
        if (dlResult.status === 'downloaded') {
          console.log(`[XBRL→D1] ${ticker}: Filing downloaded to R2: ${dlResult.r2Key}`);
        }
      } catch (err) {
        console.warn(`[XBRL→D1] ${ticker}: Filing download failed (non-blocking):`, err);
      }
    }

    summary.push({ ticker, success: true, datapoints: rows.length, artifactId });
    } catch (err) {
      failures += 1;
      summary.push({ ticker, success: false, error: err instanceof Error ? err.message : String(err) });
      continue;
    }
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
      `XBRL→D1 cron: ${failures}/${tickers.length} tickers failed (offset=${offset} limit=${limit}).`,
      `runId: ${runId}`,
      `datapoints: +${datapointsInserted} inserted, ~${datapointsUpdated} updated, ${datapointsSeededProposalKey} seededProposalKey, ${datapointsNoop} noop`,
      failedTickers.length ? `failed: ${failedTickers.join(', ')}${extra}` : undefined,
    ].filter(Boolean).join('\n');

    await sendDiscordChannelMessage(updatesChannelId, msg);
  }

  // On manual runs, optionally post a success summary (kept quiet for scheduled runs)
  if (!dryRun && updatesChannelId && isManual && failures === 0) {
    const msg = [
      `XBRL→D1 manual run OK: ${tickers.length}/${allTickers.length} tickers (offset=${offset} limit=${limit})`,
      `runId: ${runId}`,
      `datapoints: +${datapointsInserted} inserted, ~${datapointsUpdated} updated, ${datapointsSeededProposalKey} seededProposalKey, ${datapointsNoop} noop`,
    ].join('\n');
    await sendDiscordChannelMessage(updatesChannelId, msg);
  }

  return NextResponse.json({
    success: true,
    runId,
    dryRun,
    tickers: tickers.length,
    tickersTotal: allTickers.length,
    offset,
    limit,
    datapointsAttempted,
    datapointsInserted: dryRun ? 0 : datapointsInserted,
    datapointsUpdated: dryRun ? 0 : datapointsUpdated,
    datapointsSeededProposalKey: dryRun ? 0 : datapointsSeededProposalKey,
    datapointsNoop: dryRun ? 0 : datapointsNoop,
    failures,
    summary,
    ...(isManual
      ? {
          debug: {
            tickersParam,
            tickersFilterSize: tickersFilter?.size || 0,
          },
        }
      : {}),
  });
}

export const runtime = 'nodejs';
export const maxDuration = 300;
