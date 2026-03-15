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
  citation_quote: string | null;
  citation_search_term: string | null;
  xbrl_concept: string | null;
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
  citation_quote: string | null;
  citation_search_term: string | null;
  xbrl_concept: string | null;
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
      d.citation_quote, d.citation_search_term, d.xbrl_concept,
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
    citation_quote: r.citation_quote ?? null,
    citation_search_term: r.citation_search_term ?? null,
    xbrl_concept: r.xbrl_concept ?? null,
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
      d.citation_quote, d.citation_search_term, d.xbrl_concept,
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
      flags_json, created_at,
      citation_quote, citation_search_term, xbrl_concept
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
    citation_quote: r.citation_quote ?? null,
    citation_search_term: r.citation_search_term ?? null,
    xbrl_concept: r.xbrl_concept ?? null,
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

// ═══════════════════════════════════════════════════════════════════════════
// New table query methods (Phase 1: D1 as Single Source of Truth)
// ═══════════════════════════════════════════════════════════════════════════

export type EntityRow = {
  entity_id: string;
  name: string;
  asset: string;
  tier: number;
  country: string | null;
  jurisdiction: string | null;
  currency: string;
  exchange_mic: string | null;
  sec_cik: string | null;
  dat_start_date: string | null;
  is_miner: number;
  treasury_model: string | null;
  website: string | null;
  twitter: string | null;
  investor_relations_url: string | null;
  leader: string | null;
  strategy: string | null;
  notes: string | null;
  official_dashboard: string | null;
  official_dashboard_name: string | null;
  official_mnav_note: string | null;
  shares_source: string | null;
  shares_notes: string | null;
  reports_holdings_frequency: string | null;
  reports_mnav_daily: number;
  metadata_json: string | null;
  updated_at: string;
};

export type InstrumentRow = {
  instrument_id: string;
  entity_id: string;
  type: string;
  name: string | null;
  strike_price: number;
  potential_shares: number;
  face_value: number | null;
  settlement_type: string | null;
  issued_date: string | null;
  expiration: string | null;
  included_in_base: number;
  source: string | null;
  source_url: string | null;
  status: string;
  notes: string | null;
};

export type PurchaseRow = {
  purchase_id: string;
  entity_id: string;
  asset: string;
  date: string;
  quantity: number;
  price_per_unit: number;
  total_cost: number;
  source: string | null;
  source_url: string | null;
};

export type SecondaryHoldingRow = {
  holding_id: string;
  entity_id: string;
  asset: string;
  amount: number;
  as_of: string | null;
  source: string | null;
  source_url: string | null;
  note: string | null;
};

export type InvestmentRow = {
  investment_id: string;
  entity_id: string;
  name: string;
  type: string;
  underlying_asset: string | null;
  fair_value: number | null;
  source_date: string | null;
  source: string | null;
  source_url: string | null;
  lst_amount: number | null;
  exchange_rate: number | null;
  underlying_amount: number | null;
  note: string | null;
};

export type CapitalEventRow = {
  event_id: string;
  entity_id: string;
  date: string;
  type: string;
  description: string | null;
  filed_date: string | null;
  accession_number: string | null;
  source_url: string | null;
  item: string | null;
  section: string | null;
  data_json: string | null;
  notes: string | null;
};

export type AssumptionRow = {
  assumption_id: string;
  entity_id: string;
  field: string;
  assumption: string;
  reason: string | null;
  trigger_event: string | null;
  source_needed: string | null;
  resolution_path: string | null;
  sensitivity: string | null;
  materiality: string | null;
  status: string;
  last_reviewed: string | null;
  introduced_by: string | null;
  review_notes: string | null;
  resolved_date: string | null;
  resolved_notes: string | null;
};

/** Get all entities, optionally filtered by asset */
export async function getEntities(asset?: string): Promise<EntityRow[]> {
  const d1 = D1Client.fromEnv();
  if (asset) {
    const out = await d1.query<EntityRow>(
      'SELECT * FROM entities WHERE asset = ? ORDER BY entity_id',
      [asset]
    );
    return out.results;
  }
  const out = await d1.query<EntityRow>('SELECT * FROM entities ORDER BY entity_id');
  return out.results;
}

/** Get a single entity by ticker */
export async function getEntity(ticker: string): Promise<EntityRow | null> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<EntityRow>(
    'SELECT * FROM entities WHERE entity_id = ?',
    [ticker.toUpperCase()]
  );
  return out.results[0] || null;
}

/** Get instruments for a ticker, optionally filtered by status */
export async function getInstruments(
  ticker: string,
  status: string = 'active'
): Promise<InstrumentRow[]> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<InstrumentRow>(
    'SELECT * FROM instruments WHERE entity_id = ? AND status = ? ORDER BY strike_price',
    [ticker.toUpperCase(), status]
  );
  return out.results;
}

/** Get all instruments for a ticker regardless of status */
export async function getAllInstruments(ticker: string): Promise<InstrumentRow[]> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<InstrumentRow>(
    'SELECT * FROM instruments WHERE entity_id = ? ORDER BY strike_price',
    [ticker.toUpperCase()]
  );
  return out.results;
}

/** Get purchase history for a ticker */
export async function getPurchasesFromD1(ticker: string): Promise<PurchaseRow[]> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<PurchaseRow>(
    'SELECT * FROM purchases WHERE entity_id = ? ORDER BY date',
    [ticker.toUpperCase()]
  );
  return out.results;
}

/** Get secondary crypto holdings for a ticker */
export async function getSecondaryHoldings(ticker: string): Promise<SecondaryHoldingRow[]> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<SecondaryHoldingRow>(
    'SELECT * FROM secondary_holdings WHERE entity_id = ? ORDER BY asset',
    [ticker.toUpperCase()]
  );
  return out.results;
}

/** Get crypto investments (funds, ETFs, LSTs) for a ticker */
export async function getInvestments(ticker: string): Promise<InvestmentRow[]> {
  const d1 = D1Client.fromEnv();
  const out = await d1.query<InvestmentRow>(
    'SELECT * FROM investments WHERE entity_id = ? ORDER BY name',
    [ticker.toUpperCase()]
  );
  return out.results;
}

/** Get capital events for a ticker, optionally filtered by type and date range */
export async function getCapitalEvents(
  ticker: string,
  opts?: { type?: string; startDate?: string; endDate?: string }
): Promise<CapitalEventRow[]> {
  const d1 = D1Client.fromEnv();
  let sql = 'SELECT * FROM capital_events WHERE entity_id = ?';
  const params: unknown[] = [ticker.toUpperCase()];

  if (opts?.type) {
    sql += ' AND type = ?';
    params.push(opts.type);
  }
  if (opts?.startDate) {
    sql += ' AND date >= ?';
    params.push(opts.startDate);
  }
  if (opts?.endDate) {
    sql += ' AND date <= ?';
    params.push(opts.endDate);
  }

  sql += ' ORDER BY date';
  const out = await d1.query<CapitalEventRow>(sql, params);
  return out.results;
}

/** Get assumptions for a ticker, optionally filtered by status */
export async function getAssumptions(
  ticker?: string,
  status?: string
): Promise<AssumptionRow[]> {
  const d1 = D1Client.fromEnv();
  let sql = 'SELECT * FROM assumptions';
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (ticker) {
    conditions.push('entity_id = ?');
    params.push(ticker.toUpperCase());
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY entity_id, field';

  const out = await d1.query<AssumptionRow>(sql, params);
  return out.results;
}
