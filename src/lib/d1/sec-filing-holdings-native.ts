import crypto from 'node:crypto';
import { D1Client } from '../d1';

export type SecFilingHoldingsNativeWriteInput = {
  ticker: string;
  holdingsNative: number;
  asOf: string | null;
  reportedAt: string | null;
  filingUrl: string | null;
  accession: string | null;
  filingType: string | null;
  confidence: number;
  runId: string;
  flags: Record<string, unknown> | null;
  dryRun?: boolean;
};

export type SecFilingHoldingsNativeWriteResult = {
  status: 'inserted' | 'updated' | 'noop' | 'seededProposalKey' | 'dry_run' | 'skipped' | 'error';
  proposalKey?: string;
  artifactId?: string;
  runId?: string;
  reason?: string;
  error?: string;
};

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

const RUNS_TRIGGER = 'sec_filing_text_holdings_native';

async function tableExists(d1: D1Client, table: string): Promise<boolean> {
  const out = await d1.query<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;`,
    [table]
  );
  return (out.results?.length || 0) > 0;
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

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  return url.split('#')[0].trim() || null;
}

function extractAccession(accession: string | null, url: string | null): string | null {
  if (accession && accession.trim()) return accession.trim();
  if (!url) return null;
  const m = url.match(/\b(\d{10}-\d{2}-\d{6})\b/);
  return m?.[1] || null;
}

async function ensureRun(d1: D1Client, runId: string, notes: string): Promise<void> {
  if (!(await tableExists(d1, 'runs'))) return;
  await d1.query(
    `INSERT OR IGNORE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
     VALUES (?, ?, NULL, ?, ?, ?);`,
    [runId, new Date().toISOString(), RUNS_TRIGGER, process.env.GITHUB_SHA || null, notes]
  );
}

async function ensureArtifact(d1: D1Client, input: {
  ticker: string;
  filingUrl: string | null;
  accession: string | null;
}): Promise<string> {
  if (input.accession) {
    const byAccession = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id
       FROM artifacts
       WHERE ticker = ?
         AND source_type = 'sec_filing'
         AND accession = ?
       ORDER BY fetched_at DESC
       LIMIT 1;`,
      [input.ticker, input.accession]
    );
    if (byAccession.results[0]?.artifact_id) return byAccession.results[0].artifact_id;
  }

  if (input.filingUrl) {
    const byUrl = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id
       FROM artifacts
       WHERE ticker = ?
         AND source_type = 'sec_filing'
         AND source_url = ?
       ORDER BY fetched_at DESC
       LIMIT 1;`,
      [input.ticker, input.filingUrl]
    );
    if (byUrl.results[0]?.artifact_id) return byUrl.results[0].artifact_id;
  }

  const nowIso = new Date().toISOString();
  const artifactId = crypto.randomUUID();
  const r2Key = `sec/auto-update/${input.ticker}/${input.accession || nowIso.slice(0, 10)}.txt`;
  const contentHash = crypto
    .createHash('md5')
    .update(`sec_filing_text|${input.ticker}|${input.accession || 'unknown'}|${input.filingUrl || ''}`)
    .digest('hex');

  await d1.query(
    `INSERT OR IGNORE INTO artifacts (
       artifact_id, source_type, source_url, content_hash, fetched_at,
       r2_bucket, r2_key, cik, ticker, accession
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      artifactId,
      'sec_filing',
      input.filingUrl,
      contentHash,
      nowIso,
      'dat-tracker-filings',
      r2Key,
      null,
      input.ticker,
      input.accession,
    ]
  );

  const actual = await d1.query<{ artifact_id: string }>(
    `SELECT artifact_id FROM artifacts WHERE content_hash = ? LIMIT 1;`,
    [contentHash]
  );
  return actual.results?.[0]?.artifact_id || artifactId;
}

export async function writeSecFilingHoldingsNativeDatapoint(
  d1: D1Client,
  input: SecFilingHoldingsNativeWriteInput
): Promise<SecFilingHoldingsNativeWriteResult> {
  try {
    const ticker = input.ticker.toUpperCase();
    const asOf = input.asOf || input.reportedAt || null;
    const reportedAt = input.reportedAt || null;
    const filingUrl = normalizeUrl(input.filingUrl);
    const accession = extractAccession(input.accession, filingUrl);

    if (!Number.isFinite(input.holdingsNative) || input.holdingsNative < 0) {
      return { status: 'skipped', reason: 'holdingsNative must be a finite non-negative number' };
    }
    if (!asOf) {
      return { status: 'skipped', reason: 'missing asOf/reportedAt date' };
    }

    const artifactId = await ensureArtifact(d1, { ticker, filingUrl, accession });
    const proposalSource = accession || filingUrl || artifactId;
    const proposalKey = makeProposalKey({
      entityId: ticker,
      metric: 'holdings_native',
      proposalSource,
      asOf,
      reportedAt,
    });

    if (input.dryRun) {
      return {
        status: 'dry_run',
        proposalKey,
        artifactId,
        runId: input.runId,
        reason: 'dry-run',
      };
    }

    await ensureRun(d1, input.runId, `sec-filing holdings_native ticker=${ticker}`);

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
          `SELECT datapoint_id, proposal_key
           FROM datapoints
           WHERE entity_id = ?
             AND metric = 'holdings_native'
             AND COALESCE(as_of, '') = COALESCE(?, '')
             AND COALESCE(reported_at, '') = COALESCE(?, '')
             AND COALESCE(artifact_id, '') = COALESCE(?, '')
             AND value = ?
             AND unit = 'BTC'
           LIMIT 1;`,
          [ticker, asOf, reportedAt, artifactId, input.holdingsNative]
        );

    if (dedupeCollision.results.length) {
      const legacy = dedupeCollision.results[0];
      if (legacy.proposal_key) {
        return { status: 'noop', proposalKey, artifactId, runId: input.runId, reason: 'dedupe row already keyed' };
      }

      const seed = await d1.query(
        `UPDATE datapoints
         SET proposal_key = ?,
             status = 'candidate'
         WHERE datapoint_id = ?
           AND proposal_key IS NULL
           AND NOT EXISTS (SELECT 1 FROM datapoints WHERE proposal_key = ?);`,
        [proposalKey, legacy.datapoint_id, proposalKey]
      );

      if (Number(seed.meta?.changes || 0) > 0) {
        return { status: 'seededProposalKey', proposalKey, artifactId, runId: input.runId };
      }
      return { status: 'noop', proposalKey, artifactId, runId: input.runId, reason: 'legacy seed no-op' };
    }

    const flagsJson = input.flags ? JSON.stringify(input.flags) : null;
    const incoming = {
      value: input.holdingsNative,
      unit: 'BTC',
      scale: 0,
      as_of: asOf,
      reported_at: reportedAt,
      artifact_id: artifactId,
      run_id: input.runId,
      method: 'sec_filing_text',
      confidence: input.confidence,
      flags_json: flagsJson,
      confidence_details_json: null as string | null,
      status: 'candidate',
    };

    await d1.query(
      `INSERT INTO datapoints (
         datapoint_id, entity_id, metric, value, unit, scale,
         as_of, reported_at, artifact_id, run_id,
         method, confidence, flags_json, confidence_details_json, status,
         proposal_key, created_at
       ) VALUES (?, ?, 'holdings_native', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
         status = excluded.status;`,
      [
        crypto.randomUUID(),
        ticker,
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
        new Date().toISOString(),
      ]
    );

    if (!existingByProposal.results.length) {
      return { status: 'inserted', proposalKey, artifactId, runId: input.runId };
    }
    if (sameMutableFields(existingByProposal.results[0], incoming)) {
      return { status: 'noop', proposalKey, artifactId, runId: input.runId, reason: 'proposal upsert unchanged' };
    }
    return { status: 'updated', proposalKey, artifactId, runId: input.runId };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
