/**
 * Cloudflare D1 client helpers.
 *
 * This repo uses Postgres for the main app, but we also use a Cloudflare D1
 * database for SEC artifact + datapoint ingestion.
 *
 * This helper talks to D1 via the HTTP API.
 */

export type D1QueryResult<T = any> = {
  results: T[];
  success: boolean;
  meta?: Record<string, any>;
};

export type D1Response<T = any> = {
  result: D1QueryResult<T>[];
  success: boolean;
  errors?: any[];
  messages?: any[];
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

  async query<T = any>(sql: string, params?: any[]): Promise<D1QueryResult<T>> {
    const body = [{ sql, params: params || [] }];

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
};

export async function getLatestMetrics(
  ticker: string,
  metrics: string[] = ['cash_usd', 'debt_usd', 'basic_shares']
): Promise<LatestDatapointRow[]> {
  const d1 = D1Client.fromEnv();

  // Build placeholders
  const inList = metrics.map(() => '?').join(',');

  const sql = `
    SELECT
      datapoint_id, entity_id, metric, value, unit, scale,
      as_of, reported_at, artifact_id, run_id, method, confidence,
      flags_json, created_at
    FROM latest_datapoints
    WHERE entity_id = ?
      AND metric IN (${inList})
    ORDER BY metric;
  `;

  const params = [ticker.toUpperCase(), ...metrics];
  const out = await d1.query<LatestDatapointRow>(sql, params);
  return out.results;
}
