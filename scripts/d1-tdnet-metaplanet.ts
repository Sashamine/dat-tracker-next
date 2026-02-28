#!/usr/bin/env npx tsx
/**
 * TDnet PDF → D1 datapoints ingestion for Metaplanet (3350.T)
 *
 * Mirrors patterns from:
 *   scripts/d1-xbrl-to-d1.ts
 *   scripts/d1-backfill-basic-shares-qe.ts
 */

import crypto from 'node:crypto';
import * as fs from 'node:fs';

import { D1Client } from '../src/lib/d1';
import {
  ingestFromUrls,
  ingestByDateRange,
  type TdnetFilingEntry,
  type ShareDataPoint,
} from '../src/lib/fetchers/tdnet/metaplanet';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const dryRun = (argVal('dry-run') || process.env.DRY_RUN || '').toString() === 'true';

const urlsArg = argVal('urls');
const urlFile = argVal('url-file');
const startArg = argVal('start');
const endArg = argVal('end');

const d1 = dryRun ? null : D1Client.fromEnv();

const nowIso = new Date().toISOString();
const runId = `tdnet_metaplanet_${nowIso}`;

async function tableExists(table: string): Promise<boolean> {
  if (!d1) return false;
  const out = await d1.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;`,
    [table]
  );
  return (out.results?.length || 0) > 0;
}

async function upsertArtifact(dp: ShareDataPoint): Promise<string> {
  const { artifactId, pdfUrl, publishedAt, contentHash } = dp.artifact;

  if (dryRun) {
    console.log(
      JSON.stringify({
        DRY_RUN: true,
        op: 'upsert_artifact',
        artifact_id: artifactId,
        source_url: pdfUrl,
        content_hash: contentHash,
        period_end: dp.asOf,
        publishedAt,
      })
    );
    return artifactId;
  }

  if (!d1) throw new Error('D1 client not initialized');

  await d1.query(
    `INSERT OR IGNORE INTO artifacts (
      artifact_id,
      source_type,
      source_url,
      content_hash,
      fetched_at,
      r2_bucket,
      r2_key,
      cik,
      ticker,
      accession,
      entity_id,
      period_end,
      filed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      artifactId,
      'tdnet_pdf',
      pdfUrl,
      contentHash,
      nowIso,
      '',
      '',
      null,
      '3350.T',
      null,
      '3350.T',
      dp.asOf,
      publishedAt || null,
    ]
  );

  return artifactId;
}

function makeDatapointId(entityId: string, metric: string, asOf: string, unit: string, scale: number): string {
  const key = `${entityId}|${metric}|${asOf}|${unit}|${scale}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

async function upsertDatapoint(dp: ShareDataPoint, artifactId: string): Promise<'inserted' | 'skipped_dry_run' | 'ignored'> {
  const unit = 'shares';
  const scale = 0;
  const datapointId = makeDatapointId('3350.T', 'basic_shares', dp.asOf, unit, scale);

  const flagsJson = JSON.stringify({
    source: 'TDnet',
    pdfUrl: dp.sourceUrl,
    publishedAt: dp.artifact.publishedAt,
    asOfNote: dp.asOfNote,
    basis: 'historical',
  });

  if (dryRun) {
    console.log(
      JSON.stringify({
        DRY_RUN: true,
        op: 'upsert_datapoint',
        datapoint_id: datapointId,
        entity_id: '3350.T',
        metric: 'basic_shares',
        value: dp.value,
        unit,
        scale,
        as_of: dp.asOf,
        method: 'jp_tdnet_pdf',
        artifact_id: artifactId,
      })
    );
    return 'skipped_dry_run';
  }

  if (!d1) throw new Error('D1 client not initialized');

  const result = await d1.query(
    `INSERT OR IGNORE INTO datapoints (
      datapoint_id,
      entity_id,
      metric,
      value,
      unit,
      scale,
      as_of,
      reported_at,
      artifact_id,
      run_id,
      method,
      confidence,
      flags_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      datapointId,
      '3350.T',
      'basic_shares',
      dp.value,
      unit,
      scale,
      dp.asOf,
      dp.asOf,
      artifactId,
      runId,
      'jp_tdnet_pdf',
      0.9,
      flagsJson,
      nowIso,
    ]
  );

  const changes = (result.meta as any)?.changes ?? 1;
  return changes > 0 ? 'inserted' : 'ignored';
}

async function upsertLatest(dp: ShareDataPoint, artifactId: string, datapointId: string, hasLatest: boolean): Promise<void> {
  if (!hasLatest || dryRun) return;
  if (!d1) throw new Error('D1 client not initialized');

  const unit = 'shares';
  const scale = 0;
  const flagsJson = JSON.stringify({
    source: 'TDnet',
    pdfUrl: dp.sourceUrl,
    publishedAt: dp.artifact.publishedAt,
    asOfNote: dp.asOfNote,
    basis: 'historical',
  });

  await d1.query(
    `INSERT INTO latest_datapoints (
      datapoint_id, entity_id, metric, value, unit, scale,
      as_of, reported_at, artifact_id, run_id, method,
      confidence, flags_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(entity_id, metric) DO UPDATE SET
      datapoint_id = excluded.datapoint_id,
      value        = excluded.value,
      unit         = excluded.unit,
      scale        = excluded.scale,
      as_of        = excluded.as_of,
      reported_at  = excluded.reported_at,
      artifact_id  = excluded.artifact_id,
      run_id       = excluded.run_id,
      method       = excluded.method,
      confidence   = excluded.confidence,
      flags_json   = excluded.flags_json,
      created_at   = excluded.created_at
    WHERE excluded.as_of >= latest_datapoints.as_of;`,
    [
      datapointId,
      '3350.T',
      'basic_shares',
      dp.value,
      unit,
      scale,
      dp.asOf,
      dp.asOf,
      artifactId,
      runId,
      'jp_tdnet_pdf',
      0.9,
      flagsJson,
      nowIso,
    ]
  );
}

async function ensureRun(hasRuns: boolean): Promise<void> {
  if (!hasRuns || dryRun) return;
  if (!d1) throw new Error('D1 client not initialized');
  await d1.query(
    `INSERT OR IGNORE INTO runs (run_id, started_at, trigger, code_sha, notes)
     VALUES (?, ?, ?, ?, ?);`,
    [
      runId,
      nowIso,
      'd1_tdnet_metaplanet',
      process.env.GITHUB_SHA || null,
      'TDnet PDF ingestion for Metaplanet 3350.T',
    ]
  );
}

function entriesFromUrls(rawUrls: string): TdnetFilingEntry[] {
  return rawUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({
      pdfUrl: url,
      title: '',
      publishedAt: '',
      code: '33500',
    }));
}

function entriesFromFile(filePath: string): TdnetFilingEntry[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`--url-file not found: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`--url-file must contain a JSON array`);
  }
  return raw.map((item: unknown) => {
    if (typeof item === 'string') {
      return { pdfUrl: item, title: '', publishedAt: '', code: '33500' };
    }
    if (typeof item === 'object' && item !== null && 'pdfUrl' in item && typeof (item as any).pdfUrl === 'string') {
      const e = item as any;
      return {
        pdfUrl: e.pdfUrl,
        title: e.title ?? '',
        publishedAt: e.publishedAt ?? '',
        code: e.code ?? '33500',
      } satisfies TdnetFilingEntry;
    }
    throw new Error(
      `Invalid entry in --url-file: expected string URL or TdnetFilingEntry object, got: ${JSON.stringify(item)}`
    );
  });
}

async function main(): Promise<void> {
  console.log(
    JSON.stringify({
      script: 'd1-tdnet-metaplanet',
      dryRun,
      urlsArg: urlsArg ? `${urlsArg.slice(0, 80)}…` : null,
      urlFile,
      startArg,
      endArg,
      runId,
    })
  );

  let ingestionResult: Awaited<ReturnType<typeof ingestFromUrls>>;

  if (urlsArg) {
    const entries = entriesFromUrls(urlsArg);
    console.log(`[mode] explicit URLs (${entries.length})`);
    ingestionResult = await ingestFromUrls(entries);
  } else if (urlFile) {
    const entries = entriesFromFile(urlFile);
    console.log(`[mode] url-file: ${urlFile} (${entries.length} entries)`);
    ingestionResult = await ingestFromUrls(entries);
  } else if (startArg) {
    const startDate = new Date(startArg);
    const endDate = endArg ? new Date(endArg) : new Date();
    if (isNaN(startDate.getTime())) throw new Error(`Invalid --start: ${startArg}`);
    if (isNaN(endDate.getTime())) throw new Error(`Invalid --end: ${endArg}`);
    console.log(`[mode] date-range discovery: ${startArg} → ${endArg ?? 'today'}`);
    ingestionResult = await ingestByDateRange({ startDate, endDate });
  } else {
    console.error(
      [
        '',
        'Usage:',
        '  npx tsx scripts/d1-tdnet-metaplanet.ts --urls=URL1,URL2,...',
        '  npx tsx scripts/d1-tdnet-metaplanet.ts --url-file=path/to/urls.json',
        '  npx tsx scripts/d1-tdnet-metaplanet.ts --start=YYYY-MM-DD [--end=YYYY-MM-DD]',
        '',
        'Options:',
        '  --dry-run=true   Print actions without writing to D1',
      ].join('\n')
    );
    process.exit(1);
  }

  const { dataPoints, skipped } = ingestionResult;
  console.log(`[ingestion] extracted ${dataPoints.length} datapoint(s), skipped ${skipped.length}`);

  const hasRuns = await tableExists('runs');
  const hasLatest = await tableExists('latest_datapoints');
  await ensureRun(hasRuns);

  let inserted = 0;
  let ignored = 0;

  for (const dp of dataPoints) {
    if (dp.value > 50_000_000_000) {
      skipped.push({ pdfUrl: dp.sourceUrl, reason: 'value > 50B sanity bound' });
      continue;
    }

    let artifactId: string;
    try {
      artifactId = await upsertArtifact(dp);
    } catch (err) {
      skipped.push({ pdfUrl: dp.sourceUrl, reason: `upsertArtifact failed: ${(err as Error).message}` });
      continue;
    }

    let outcome: 'inserted' | 'skipped_dry_run' | 'ignored';
    try {
      outcome = await upsertDatapoint(dp, artifactId);
    } catch (err) {
      skipped.push({ pdfUrl: dp.sourceUrl, reason: `upsertDatapoint failed: ${(err as Error).message}` });
      continue;
    }

    if (outcome === 'inserted') {
      inserted++;
      const unit = 'shares';
      const scale = 0;
      const datapointId = makeDatapointId('3350.T', 'basic_shares', dp.asOf, unit, scale);
      await upsertLatest(dp, artifactId, datapointId, hasLatest);
    } else if (outcome === 'ignored') {
      ignored++;
    }

    console.log(
      JSON.stringify({
        ok: true,
        as_of: dp.asOf,
        value: dp.value,
        method: dp.method,
        sourceUrl: dp.sourceUrl,
        artifactId,
        outcome,
        dryRun,
      })
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        runId,
        dataPointsExtracted: dataPoints.length,
        inserted,
        ignored,
        failed: skipped.length,
        skippedDetails: skipped,
        hasRuns,
        hasLatest,
      },
      null,
      2
    )
  );

  console.log(`\n-- Verification SQL\nSELECT d.entity_id, d.as_of, d.value, d.method, d.artifact_id, a.source_url\nFROM datapoints d LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id\nWHERE d.entity_id='3350.T' AND d.metric='basic_shares'\nORDER BY d.as_of DESC;\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
