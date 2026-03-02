import useSWR from 'swr';

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

export type CompanyMetricLatestResponse = {
  success: boolean;
  ticker: string;
  metrics: string[];
  rows: LatestDatapointRow[];
  error?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useCompanyD1Latest(ticker: string | null | undefined, metrics: string[]) {
  const t = (ticker || '').toUpperCase();
  const metricsParam = metrics.filter(Boolean).join(',');

  const key = t && metricsParam
    ? `/api/d1/latest-metrics?ticker=${encodeURIComponent(t)}&metrics=${encodeURIComponent(metricsParam)}`
    : null;

  return useSWR<CompanyMetricLatestResponse>(key, fetcher);
}

export function latestRowByMetric(rows: LatestDatapointRow[] | undefined | null): Record<string, LatestDatapointRow> {
  const out: Record<string, LatestDatapointRow> = {};
  for (const r of rows || []) out[r.metric] = r;
  return out;
}
