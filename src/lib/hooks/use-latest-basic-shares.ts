'use client';

import { useQuery } from '@tanstack/react-query';

type LatestMetricsRow = {
  metric: string;
  value: number;
  as_of: string | null;
  reported_at: string | null;
  created_at: string;
};

type LatestMetricsResp = {
  success: boolean;
  ticker: string;
  metrics: string[];
  rows: LatestMetricsRow[];
};

export function useLatestBasicShares(ticker: string) {
  const t = (ticker || '').trim().toUpperCase();

  return useQuery<{ shares: number | null; asOf: string | null; source: 'd1' | 'none' }>(
    {
      queryKey: ['latest-basic-shares', t],
      enabled: !!t,
      queryFn: async () => {
        const res = await fetch(`/api/d1/latest-metrics?ticker=${encodeURIComponent(t)}&metrics=basic_shares`);
        const json = (await res.json()) as LatestMetricsResp;
        if (!res.ok || !json.success) throw new Error((json as any)?.error || `HTTP ${res.status}`);
        const row = (json.rows || []).find(r => r.metric === 'basic_shares');
        if (!row || !Number.isFinite(row.value)) return { shares: null, asOf: null, source: 'none' };
        return { shares: row.value, asOf: (row.as_of || row.reported_at || null), source: 'd1' };
      },
      staleTime: 5 * 60 * 1000,
    }
  );
}
