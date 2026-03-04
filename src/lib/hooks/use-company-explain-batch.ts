import useSWR from 'swr';

type ExplainReceipt = {
  source_url: string | null;
  accession: string | null;
  r2_key: string | null;
  artifact_id: string;
  run_id: string;
};

type ExplainDatapoint = {
  datapoint_id: string;
  value: number;
  unit: string;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number | null;
};

export type ExplainByMetric = Record<
  string,
  {
    datapoint: ExplainDatapoint;
    receipt: ExplainReceipt;
  }
>;

export type CompanyExplainBatchResponse = {
  success: boolean;
  ticker: string;
  metrics: string[];
  count: number;
  explain: ExplainByMetric;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useCompanyExplainBatch(
  ticker: string | null | undefined,
  metrics: string[]
) {
  const t = (ticker || '').toUpperCase();
  const metricsParam = metrics.filter(Boolean).join(',');

  const key = t && metricsParam
    ? `/api/d1/explain/batch?ticker=${encodeURIComponent(t)}&metrics=${encodeURIComponent(metricsParam)}`
    : null;

  return useSWR<CompanyExplainBatchResponse>(key, fetcher);
}

