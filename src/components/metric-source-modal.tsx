import React from 'react';

type ArtifactMeta = {
  source_url: string | null;
  accession: string | null;
  source_type: string | null;
};

type DatapointRow = {
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
  artifact?: ArtifactMeta;
};

type LatestResponse = {
  success: boolean;
  ticker: string;
  metric: string;
  row: DatapointRow | null;
  error?: string;
};

type HistoryResponse = {
  success: boolean;
  ticker: string;
  metric: string;
  rows: DatapointRow[];
  error?: string;
};

function formatValue(row: DatapointRow): string {
  if (row.unit === 'USD') return `$${row.value.toLocaleString()}`;
  if (row.unit === 'shares') return `${row.value.toLocaleString()} shares`;
  return `${row.value.toLocaleString()} ${row.unit}`;
}

export function MetricSourceModal(props: {
  open: boolean;
  onClose: () => void;
  ticker: string;
  metric: string;
  title?: string;
  historyLimit?: number;
}) {
  const { open, onClose, ticker, metric, title, historyLimit = 10 } = props;

  const [latest, setLatest] = React.useState<LatestResponse | null>(null);
  const [history, setHistory] = React.useState<HistoryResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    async function run() {
      setLoading(true);
      setLatest(null);
      setHistory(null);
      try {
        const [latestRes, historyRes] = await Promise.all([
          fetch(`/api/company/${encodeURIComponent(ticker)}/metric/${encodeURIComponent(metric)}`).then(r => r.json()),
          fetch(
            `/api/company/${encodeURIComponent(ticker)}/metric/${encodeURIComponent(metric)}/history?limit=${historyLimit}&order=desc`
          ).then(r => r.json()),
        ]);
        if (cancelled) return;
        setLatest(latestRes);
        setHistory(historyRes);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();

    return () => {
      cancelled = true;
    };
  }, [open, ticker, metric, historyLimit]);

  if (!open) return null;

  const latestRow = latest?.row || null;
  const href = latestRow?.artifact?.source_url || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-950 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title || `${ticker} · ${metric}`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              D1 datapoints (latest + history)
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && (
            <div className="text-sm text-gray-600 dark:text-gray-300">Loading…</div>
          )}

          {latestRow && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Latest</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">as_of {latestRow.as_of || '—'}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-lg font-mono text-gray-900 dark:text-gray-100">{formatValue(latestRow)}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{latestRow.method || '—'}</div>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Source:{' '}
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    SEC
                  </a>
                ) : (
                  <span>—</span>
                )}
                {latestRow.artifact?.accession ? (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">({latestRow.artifact.accession})</span>
                ) : null}
              </div>
            </div>
          )}

          {history?.rows?.length ? (
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">History (last {history.rows.length})</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2 pr-4">As of</th>
                      <th className="py-2 pr-4">Value</th>
                      <th className="py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.rows.map((r) => (
                      <tr key={r.datapoint_id} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{r.as_of || '—'}</td>
                        <td className="py-2 pr-4 font-mono text-gray-900 dark:text-gray-100">{formatValue(r)}</td>
                        <td className="py-2 text-gray-500 dark:text-gray-400">
                          {r.artifact?.source_url ? (
                            <a href={r.artifact.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                              SEC
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
