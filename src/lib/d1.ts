/**
 * Cloudflare D1 client helpers.
 *
 * This repo uses Postgres for the main app, but we also use a Cloudflare D1
 * database for SEC artifact + datapoint ingestion.
 *
 * This helper talks to D1 via the HTTP API.
 */

export type D1QueryResult<T = unknown> = {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
};

export type D1Response<T = unknown> = {
  result: D1QueryResult<T>[];
  success: boolean;
  errors?: unknown[];
  messages?: unknown[];
};

export class D1Client {
  constructor(
    private accountId: string,
    private databaseId: string,
    private apiToken: string
  ) {}

  static fromEnv(): D1Client {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId) throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
    if (!databaseId) throw new Error('Missing CLOUDFLARE_D1_DATABASE_ID');
    if (!apiToken) throw new Error('Missing CLOUDFLARE_API_TOKEN');

    return new D1Client(accountId, databaseId, apiToken);
  }

  private url(): string {
    return `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<D1QueryResult<T>> {
    // Cloudflare D1 "query" endpoint expects an object payload, not a raw array.
    // Ref: errors like "Expected object, received array".
    const body = { sql, params: params || [] };

    const res = await fetch(this.url(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`D1 query failed: ${res.status} ${res.statusText}: ${text}`);
    }

    const json = (await res.json()) as D1Response<T>;
    if (!json.success) {
      throw new Error(`D1 query failed: ${JSON.stringify(json.errors || json)}`);
    }

    const first = json.result?.[0];
    if (!first) return { results: [], success: true };
    return first;
  }
}

import { normalizeLatestRowsForTicker } from '@/lib/d1-normalization';
import { CORE_D1_METRICS } from '@/lib/metrics';

export type LatestDatapointRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
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
  created_at: string;
  artifact?: {
    source_url: string | null;
    accession: string | null;
    source_type: string | null;
  };
};

type LatestDatapointQueryRow = Omit<LatestDatapointRow, 'artifact'> & {
  artifact_source_url?: string | null;
  artifact_accession?: string | null;
  artifact_source_type?: string | null;
};

export type DatapointHistoryRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
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
  created_at: string;
  artifact?: {
    source_url: string | null;
    accession: string | null;
    source_type: string | null;
  };
};

type DatapointHistoryQueryRow = Omit<DatapointHistoryRow, 'artifact'> & {
  artifact_source_url?: string | null;
  artifact_accession?: string | null;
  artifact_source_type?: string | null;
};

export async function getLatestMetrics(
  ticker: string,
  metrics: string[] = [...CORE_D1_METRICS]
): Promise<LatestDatapointRow[]> {
  const d1 = D1Client.fromEnv();

  // Build placeholders
  const inList = metrics.map(() => '?').join(',');

  const sql = `
    SELECT
      d.datapoint_id, d.entity_id, d.metric, d.value, d.unit, d.scale,
      d.as_of, d.reported_at, d.artifact_id, d.run_id, d.method, d.confidence,
      d.flags_json, d.created_at,
      a.source_url AS artifact_source_url,
      a.accession AS artifact_accession,
      a.source_type AS artifact_source_type
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.entity_id = ?
      AND d.metric IN (${inList})
    ORDER BY metric;
  `;

  const params = [ticker.toUpperCase(), ...metrics];
  const out = await d1.query<LatestDatapointQueryRow>(sql, params);
  const rows: LatestDatapointRow[] = out.results.map((r) => ({
    datapoint_id: r.datapoint_id,
    entity_id: r.entity_id,
    metric: r.metric,
    value: r.value,
    unit: r.unit,
    scale: r.scale,
    as_of: r.as_of,
    reported_at: r.reported_at,
    artifact_id: r.artifact_id,
    run_id: r.run_id,
    method: r.method,
    confidence: r.confidence,
    flags_json: r.flags_json,
    created_at: r.created_at,
    artifact: {
      source_url: r.artifact_source_url ?? null,
      accession: r.artifact_accession ?? null,
      source_type: r.artifact_source_type ?? null,
    },
  }));

  // Hybrid: normalize shares/prices using D1 corporate_actions when present.
  // (Fallback behavior: if no corporate_actions exist, normalization multiplier is 1.)
  return await normalizeLatestRowsForTicker(ticker, rows, 'current');
}

export async function getMetricHistory(
  ticker: string,
  metric: string,
  opts?: { limit?: number; order?: 'asc' | 'desc'; includeArtifacts?: boolean }
): Promise<DatapointHistoryRow[]> {
  const d1 = D1Client.fromEnv();

  const limit = Math.max(1, Math.min(2000, opts?.limit ?? 500));
  const order = (opts?.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const includeArtifacts = opts?.includeArtifacts !== false;

  const sql = includeArtifacts
    ? `
    SELECT
      d.datapoint_id, d.entity_id, d.metric, d.value, d.unit, d.scale,
      d.as_of, d.reported_at, d.artifact_id, d.run_id, d.method, d.confidence,
      d.flags_json, d.created_at,
      a.source_url AS artifact_source_url,
      a.accession AS artifact_accession,
      a.source_type AS artifact_source_type
    FROM datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.entity_id = ?
      AND d.metric = ?
      AND d.as_of IS NOT NULL
    ORDER BY d.as_of ${order}, d.reported_at ${order}, d.created_at ${order}
    LIMIT ?;
  `
    : `
    SELECT
      datapoint_id, entity_id, metric, value, unit, scale,
      as_of, reported_at, artifact_id, run_id, method, confidence,
      flags_json, created_at
    FROM datapoints
    WHERE entity_id = ?
      AND metric = ?
      AND as_of IS NOT NULL
    ORDER BY as_of ${order}, reported_at ${order}, created_at ${order}
    LIMIT ?;
  `;

  const params = [ticker.toUpperCase(), metric, limit];
  const out = await d1.query<DatapointHistoryQueryRow>(sql, params);
  const rows: DatapointHistoryRow[] = out.results.map((r) => ({
    datapoint_id: r.datapoint_id,
    entity_id: r.entity_id,
    metric: r.metric,
    value: r.value,
    unit: r.unit,
    scale: r.scale,
    as_of: r.as_of,
    reported_at: r.reported_at,
    artifact_id: r.artifact_id,
    run_id: r.run_id,
    method: r.method,
    confidence: r.confidence,
    flags_json: r.flags_json,
    created_at: r.created_at,
    artifact: includeArtifacts
      ? {
          source_url: r.artifact_source_url ?? null,
          accession: r.artifact_accession ?? null,
          source_type: r.artifact_source_type ?? null,
        }
      : undefined,
  }));

  // Reuse same normalization pipeline as latest rows.
  // For history, keep values on their historical basis (no forward-adjusting).
  return await normalizeLatestRowsForTicker(ticker, rows as unknown as LatestDatapointRow[], 'historical');
}
