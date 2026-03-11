#!/usr/bin/env npx tsx

import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { D1Client } from '../../src/lib/d1';

type SyntheticArtifactRow = {
  artifact_id: string;
  ticker: string | null;
  source_type: string | null;
  source_url: string | null;
  accession: string | null;
  datapoint_count: number;
  metrics: string | null;
  earliest_date: string | null;
  latest_date: string | null;
};

type LinkedDatapointRow = {
  datapoint_id: string;
  metric: string;
  value: number;
  as_of: string | null;
  reported_at: string | null;
  flags_json: string | null;
  citation_quote: string | null;
  citation_search_term: string | null;
};

type RealArtifactRow = {
  artifact_id: string;
  source_type: string | null;
  source_url: string | null;
  accession: string | null;
  ticker: string | null;
  r2_bucket: string | null;
  r2_key: string | null;
  fetched_at: string | null;
};

type Resolution =
  | {
      kind: 'relink_existing';
      reason: string;
      artifact: RealArtifactRow;
      verified: boolean;
    }
  | {
      kind: 'update_in_place';
      reason: string;
      r2Bucket: string;
      r2Key: string;
      verified: boolean;
    }
  | {
      kind: 'skip';
      reason: string;
      suggestion?: string;
    };

type HintBag = {
  urls: Set<string>;
  accessions: Set<string>;
  artifactIds: Set<string>;
};

const REAL_BUCKET = process.env.R2_BUCKET || 'dat-tracker-filings';
const WRITE = process.argv.includes('--write');

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function makeR2Client(): S3Client {
  return new S3Client({
    region: process.env.R2_REGION || 'auto',
    endpoint: env('R2_ENDPOINT'),
    credentials: {
      accessKeyId: env('R2_ACCESS_KEY_ID'),
      secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
    },
  });
}

function parseJson(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeTicker(ticker: string | null): string {
  return (ticker || '').trim().toLowerCase();
}

function maybeAccession(text: string): string | null {
  const dashed = text.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  if (dashed?.[1]) return dashed[1];
  const compact = text.match(/\b(\d{18})\b/);
  if (!compact?.[1]) return null;
  const raw = compact[1];
  return `${raw.slice(0, 10)}-${raw.slice(10, 12)}-${raw.slice(12)}`;
}

function maybeUuid(text: string): string | null {
  const m = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i);
  return m?.[0] || null;
}

function collectHints(value: unknown, hints: HintBag): void {
  if (value == null) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      hints.urls.add(trimmed);
    }
    const accession = maybeAccession(trimmed);
    if (accession) hints.accessions.add(accession);
    const artifactId = maybeUuid(trimmed);
    if (artifactId) hints.artifactIds.add(artifactId);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectHints(item, hints);
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (typeof child === 'string') {
        if (key.toLowerCase().includes('url') && (child.startsWith('http://') || child.startsWith('https://'))) {
          hints.urls.add(child);
        }
        if (key.toLowerCase().includes('accession')) {
          const accession = maybeAccession(child);
          if (accession) hints.accessions.add(accession);
        }
        if (key === 'artifact_id') {
          const artifactId = maybeUuid(child);
          if (artifactId) hints.artifactIds.add(artifactId);
        }
      }
      collectHints(child, hints);
    }
  }
}

function classifyArtifact(row: SyntheticArtifactRow): string {
  if ((row.source_type || '') === 'sec_filing') {
    return row.accession ? 'sec_filing_with_accession' : 'sec_filing_missing_accession';
  }
  if ((row.source_url || '').startsWith('holdings_history_ts://') || (row.source_type || '') === 'holdings_history_ts') {
    return 'holdings_history_ts';
  }
  if ((row.source_type || '').includes('regulatory')) return 'regulatory_filing';
  if ((row.source_type || '').includes('press')) return 'press_release';
  if ((row.source_url || '').startsWith('http://') || (row.source_url || '').startsWith('https://')) return 'external_url';
  return row.source_type || 'unknown';
}

function batchPrefixForTicker(ticker: string): string | null {
  const t = normalizeTicker(ticker);
  const batches: Record<string, string[]> = {
    batch1: ['abtc', 'asst', 'avx', 'bmnr', 'bnc', 'btbt', 'btcs', 'btdr', 'btog', 'cepo', 'clsk', 'zooz'],
    batch2: ['corz', 'cwd', 'cyph', 'dfdv', 'djt', 'ethm', 'fgnx', 'fwdi'],
    batch3: ['game', 'hsdt', 'hypd', 'kulr', 'lits', 'mara', 'mstr', 'na'],
    batch4: ['naka', 'nxtt', 'purr', 'riot', 'sbet', 'stke', 'suig'],
    batch5: ['taox', 'tbh', 'tron', 'twav', 'upxi', 'xrpn', 'xxi'],
    batch6: ['zone'],
  };
  for (const [prefix, tickers] of Object.entries(batches)) {
    if (tickers.includes(t)) return prefix;
  }
  return null;
}

async function r2ObjectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function findRealArtifactByField(
  d1: D1Client,
  field: 'artifact_id' | 'accession' | 'source_url',
  value: string,
): Promise<RealArtifactRow | null> {
  const out = await d1.query<RealArtifactRow>(
    `SELECT artifact_id, source_type, source_url, accession, ticker, r2_bucket, r2_key, fetched_at
     FROM artifacts
     WHERE ${field} = ?
       AND r2_key IS NOT NULL
       AND r2_key NOT LIKE 'synthetic/%'
     ORDER BY COALESCE(fetched_at, '') DESC, artifact_id DESC
     LIMIT 1`,
    [value],
  );
  return out.results[0] || null;
}

async function loadLinkedDatapoints(d1: D1Client, artifactId: string): Promise<LinkedDatapointRow[]> {
  const out = await d1.query<LinkedDatapointRow>(
    `SELECT datapoint_id, metric, value, as_of, reported_at, flags_json, citation_quote, citation_search_term
     FROM datapoints
     WHERE artifact_id = ?
     ORDER BY as_of, reported_at, metric`,
    [artifactId],
  );
  return out.results;
}

async function resolveSyntheticArtifact(
  d1: D1Client,
  r2: S3Client,
  row: SyntheticArtifactRow,
): Promise<{ resolution: Resolution; datapoints: LinkedDatapointRow[]; classification: string }> {
  const datapoints = await loadLinkedDatapoints(d1, row.artifact_id);
  const hints: HintBag = { urls: new Set(), accessions: new Set(), artifactIds: new Set() };
  if (row.source_url && !row.source_url.startsWith('holdings_history_ts://')) hints.urls.add(row.source_url);
  if (row.accession) hints.accessions.add(row.accession);
  for (const dp of datapoints) {
    collectHints(parseJson(dp.flags_json), hints);
  }

  const classification = classifyArtifact(row);

  // Try artifact_id references from flags_json
  for (const artifactId of Array.from(hints.artifactIds)) {
    if (artifactId === row.artifact_id) continue;
    const candidate = await findRealArtifactByField(d1, 'artifact_id', artifactId);
    if (!candidate?.r2_bucket || !candidate.r2_key) continue;
    const verified = await r2ObjectExists(r2, candidate.r2_bucket, candidate.r2_key);
    if (verified) {
      return {
        classification,
        datapoints,
        resolution: {
          kind: 'relink_existing',
          reason: 'linked datapoint flags_json references an existing real artifact_id',
          artifact: candidate,
          verified,
        },
      };
    }
  }

  // Try accession matches
  for (const accession of Array.from(hints.accessions)) {
    const candidate = await findRealArtifactByField(d1, 'accession', accession);
    if (!candidate?.r2_bucket || !candidate.r2_key) continue;
    const verified = await r2ObjectExists(r2, candidate.r2_bucket, candidate.r2_key);
    if (verified) {
      return {
        classification,
        datapoints,
        resolution: {
          kind: 'relink_existing',
          reason: row.accession === accession
            ? 'matching real artifact exists by accession'
            : 'linked datapoint flags_json/source references an accession with a real artifact',
          artifact: candidate,
          verified,
        },
      };
    }
  }

  // Try source_url matches
  for (const sourceUrl of Array.from(hints.urls)) {
    const candidate = await findRealArtifactByField(d1, 'source_url', sourceUrl);
    if (!candidate?.r2_bucket || !candidate.r2_key) continue;
    const verified = await r2ObjectExists(r2, candidate.r2_bucket, candidate.r2_key);
    if (verified) {
      return {
        classification,
        datapoints,
        resolution: {
          kind: 'relink_existing',
          reason: sourceUrl === row.source_url
            ? 'matching real artifact exists by source_url'
            : 'linked datapoint flags_json references a source_url with a real artifact',
          artifact: candidate,
          verified,
        },
      };
    }
  }

  // Try matching internal /filings/{ticker}/{formType}-{periodEnd} URLs to real artifacts by R2 key
  if (row.source_url && row.ticker) {
    const internalMatch = row.source_url.match(/^\/filings\/([^/]+)\/(10[QK]A?|[A-Z0-9-]+)-(\d{4}-\d{2}-\d{2})/i);
    if (internalMatch) {
      const formType = internalMatch[2].toUpperCase();
      const periodEnd = internalMatch[3];
      const lowerTicker = normalizeTicker(row.ticker);
      // Real artifacts use keys like: {ticker}/10q/10Q-{date}.html or {ticker}/10k/10K-{date}.html
      const formFolder = formType.startsWith('10K') ? '10k' : formType.startsWith('10Q') ? '10q' : formType.toLowerCase();
      const candidateR2Patterns = [
        `${lowerTicker}/${formFolder}/${formType}-${periodEnd}.html`,
        `${lowerTicker}/${formFolder}/10-${formType.slice(2)}-${periodEnd}.html`, // 10-Q variant
      ];

      for (const pattern of candidateR2Patterns) {
        const candidate = await d1.query<RealArtifactRow>(
          `SELECT artifact_id, source_type, source_url, accession, ticker, r2_bucket, r2_key, fetched_at
           FROM artifacts
           WHERE r2_key = ?
             AND r2_key NOT LIKE 'synthetic/%'
           LIMIT 1`,
          [pattern],
        );
        if (candidate.results[0]) {
          const art = candidate.results[0];
          const verified = art.r2_bucket && art.r2_key
            ? await r2ObjectExists(r2, art.r2_bucket, art.r2_key)
            : false;
          if (verified) {
            return {
              classification,
              datapoints,
              resolution: {
                kind: 'relink_existing',
                reason: `internal URL /filings/${lowerTicker}/${formType}-${periodEnd} matched real artifact by R2 key pattern`,
                artifact: art,
                verified,
              },
            };
          }
        }
      }
    }
  }

  // Try matching internal /filings/{ticker}/{accession-suffix} URLs
  if (row.source_url && row.ticker) {
    const suffixMatch = row.source_url.match(/^\/filings\/([^/]+)\/(\d{6})(?:#|$)/);
    if (suffixMatch) {
      const suffix = suffixMatch[2];
      const lowerTicker = normalizeTicker(row.ticker);
      // Find real artifacts whose accession ends with this suffix
      const candidate = await d1.query<RealArtifactRow>(
        `SELECT artifact_id, source_type, source_url, accession, ticker, r2_bucket, r2_key, fetched_at
         FROM artifacts
         WHERE UPPER(ticker) = UPPER(?)
           AND accession LIKE ?
           AND r2_key NOT LIKE 'synthetic/%'
         ORDER BY COALESCE(fetched_at, '') DESC
         LIMIT 1`,
        [row.ticker, `%-${suffix}`],
      );
      if (candidate.results[0]) {
        const art = candidate.results[0];
        const verified = art.r2_bucket && art.r2_key
          ? await r2ObjectExists(r2, art.r2_bucket, art.r2_key)
          : false;
        if (verified) {
          return {
            classification,
            datapoints,
            resolution: {
              kind: 'relink_existing',
              reason: `internal URL suffix ${suffix} matched real artifact accession ${art.accession}`,
              artifact: art,
              verified,
            },
          };
        }
      }
    }
  }

  // For SEC filings: try R2 key patterns directly
  if (classification.startsWith('sec_filing') && hints.accessions.size > 0 && row.ticker) {
    const accession = Array.from(hints.accessions)[0];
    const lowerTicker = normalizeTicker(row.ticker);
    const batchPrefix = batchPrefixForTicker(lowerTicker);
    const candidateKeys = [
      `new-uploads/${lowerTicker}/${accession}.txt`,
      ...(batchPrefix ? [`${batchPrefix}/${lowerTicker}/${accession}.txt`] : []),
    ];
    for (const key of candidateKeys) {
      const verified = await r2ObjectExists(r2, REAL_BUCKET, key);
      if (verified) {
        return {
          classification,
          datapoints,
          resolution: {
            kind: 'update_in_place',
            reason: 'SEC accession has a real R2 object but no existing artifact row was found',
            r2Bucket: REAL_BUCKET,
            r2Key: key,
            verified,
          },
        };
      }
    }
  }

  // Category-specific skip messages
  if (classification === 'sec_filing_missing_accession') {
    return {
      classification,
      datapoints,
      resolution: {
        kind: 'skip',
        reason: 'SEC filing synthetic artifact has no recoverable accession from artifact fields or linked datapoint flags_json',
        suggestion: 'Run accession-recovery helpers on the corresponding SEC artifact or inspect the source document body.',
      },
    };
  }

  if (classification === 'holdings_history_ts') {
    return {
      classification,
      datapoints,
      resolution: {
        kind: 'skip',
        reason: 'holdings_history_ts artifact has no matching real artifact yet',
        suggestion: 'Inspect linked datapoint flags_json and existing citations to locate the real filing, then relink datapoints.',
      },
    };
  }

  return {
    classification,
    datapoints,
    resolution: {
      kind: 'skip',
      reason: 'No matching real artifact or R2 object found from artifact fields or linked datapoint hints',
      suggestion: row.source_url ? `Fetch and upload source document from ${row.source_url}` : 'Fetch the real source document and upload to R2.',
    },
  };
}

async function applyResolution(d1: D1Client, synthetic: SyntheticArtifactRow, resolution: Resolution): Promise<void> {
  if (resolution.kind === 'relink_existing') {
    await d1.query(
      `UPDATE datapoints SET artifact_id = ? WHERE artifact_id = ?`,
      [resolution.artifact.artifact_id, synthetic.artifact_id],
    );
    await d1.query(
      `DELETE FROM artifacts
       WHERE artifact_id = ?
         AND NOT EXISTS (SELECT 1 FROM datapoints WHERE artifact_id = ?)`,
      [synthetic.artifact_id, synthetic.artifact_id],
    );
    return;
  }

  if (resolution.kind === 'update_in_place') {
    await d1.query(
      `UPDATE artifacts
       SET r2_bucket = ?, r2_key = ?
       WHERE artifact_id = ?`,
      [resolution.r2Bucket, resolution.r2Key, synthetic.artifact_id],
    );
  }
}

function printOutcome(row: SyntheticArtifactRow, classification: string, datapoints: LinkedDatapointRow[], resolution: Resolution): void {
  const metricList = datapoints.map((dp) => dp.metric).join(', ');
  if (resolution.kind === 'relink_existing') {
    console.log(`RESOLVED ${row.artifact_id} (${row.ticker || 'unknown'})`);
    console.log(`  Classification: ${classification}`);
    console.log(`  Was: synthetic/${row.artifact_id}`);
    console.log(`  Action: relink datapoints to artifact ${resolution.artifact.artifact_id}`);
    console.log(`  Now: ${resolution.artifact.r2_key} (exists in R2 ${resolution.verified ? 'yes' : 'no'})`);
    console.log(`  Datapoints relinked: ${datapoints.length}${metricList ? ` (${metricList})` : ''}`);
    console.log(`  Reason: ${resolution.reason}`);
    return;
  }

  if (resolution.kind === 'update_in_place') {
    console.log(`RESOLVED ${row.artifact_id} (${row.ticker || 'unknown'})`);
    console.log(`  Classification: ${classification}`);
    console.log(`  Was: synthetic/${row.artifact_id}`);
    console.log(`  Action: update artifact in place`);
    console.log(`  Now: ${resolution.r2Key} (exists in R2 ${resolution.verified ? 'yes' : 'no'})`);
    console.log(`  Datapoints preserved: ${datapoints.length}${metricList ? ` (${metricList})` : ''}`);
    console.log(`  Reason: ${resolution.reason}`);
    return;
  }

  console.log(`SKIP ${row.artifact_id} (${row.ticker || 'unknown'})`);
  console.log(`  Classification: ${classification}`);
  console.log(`  Reason: ${resolution.reason}`);
  console.log(`  Datapoints: ${datapoints.length}${metricList ? ` (${metricList})` : ''}`);
  if (resolution.suggestion) console.log(`  Suggestion: ${resolution.suggestion}`);
}

async function main() {
  const onlyTicker = argVal('ticker')?.toUpperCase() || null;
  const limit = Number(argVal('limit') || '1000');
  const d1 = D1Client.fromEnv();
  const r2 = makeR2Client();

  const whereTicker = onlyTicker ? 'AND UPPER(a.ticker) = ?' : '';
  const params: unknown[] = [];
  if (onlyTicker) params.push(onlyTicker);
  params.push(limit);

  const synthetic = await d1.query<SyntheticArtifactRow>(
    `SELECT
       a.artifact_id,
       a.ticker,
       a.source_type,
       a.source_url,
       a.accession,
       COUNT(d.datapoint_id) AS datapoint_count,
       GROUP_CONCAT(DISTINCT d.metric) AS metrics,
       MIN(d.as_of) AS earliest_date,
       MAX(d.as_of) AS latest_date
     FROM artifacts a
     LEFT JOIN datapoints d ON d.artifact_id = a.artifact_id
     WHERE a.r2_key LIKE 'synthetic/%'
       ${whereTicker}
     GROUP BY a.artifact_id, a.ticker, a.source_type, a.source_url, a.accession
     ORDER BY a.ticker, earliest_date, a.artifact_id
     LIMIT ?`,
    params,
  );

  const totals = {
    total: synthetic.results.length,
    resolved: 0,
    relinkExisting: 0,
    updateInPlace: 0,
    skipped: 0,
  };

  console.log(JSON.stringify({ mode: WRITE ? 'write' : 'dry-run', ticker: onlyTicker, totalSyntheticArtifacts: synthetic.results.length }, null, 2));

  for (const row of synthetic.results) {
    const { resolution, datapoints, classification } = await resolveSyntheticArtifact(d1, r2, row);
    printOutcome(row, classification, datapoints, resolution);
    console.log('');

    if (resolution.kind === 'skip') {
      totals.skipped++;
      continue;
    }

    totals.resolved++;
    if (resolution.kind === 'relink_existing') totals.relinkExisting++;
    if (resolution.kind === 'update_in_place') totals.updateInPlace++;

    if (WRITE) {
      await applyResolution(d1, row, resolution);
    }
  }

  console.log(JSON.stringify(totals, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
