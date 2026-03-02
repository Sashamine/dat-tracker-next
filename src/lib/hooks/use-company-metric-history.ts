import useSWR from 'swr';

export type DatapointRow = {
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

export type CompanyMetricHistoryResponse = {
  success: boolean;
  ticker: string;
  metrics: string[];
  includeArtifacts?: boolean;
  series: Record<string, DatapointRow[]>;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useCompanyMetricHistory(
  ticker: string | null | undefined,
  metrics: string[],
  limit: number = 12,
  order: 'asc' | 'desc' = 'desc',
  includeArtifacts: boolean = true
) {
  const t = (ticker || '').toUpperCase();
  const metricsParam = metrics.filter(Boolean).join(',');

  const key = t && metricsParam
    ? `/api/company/${encodeURIComponent(t)}/history?metrics=${encodeURIComponent(metricsParam)}&limit=${limit}&order=${order}&includeArtifacts=${includeArtifacts ? 'true' : 'false'}`
    : null;

  return useSWR<CompanyMetricHistoryResponse>(key, fetcher);
}
