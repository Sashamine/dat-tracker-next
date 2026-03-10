import useSWR from 'swr';

type D1MetricMap = Record<string, Record<string, number>>; // ticker -> metric -> value
type D1MetricSourceMap = Record<string, Record<string, string | null>>; // ticker -> metric -> source_url
type D1MetricDateMap = Record<string, Record<string, string | null>>; // ticker -> metric -> as_of/reported_at
type D1MetricQuoteMap = Record<string, Record<string, string | null>>; // ticker -> metric -> citation_quote
type D1MetricSearchTermMap = Record<string, Record<string, string | null>>; // ticker -> metric -> citation_search_term
type D1MetricAccessionMap = Record<string, Record<string, string | null>>; // ticker -> metric -> artifact accession

type D1FundamentalsResult = {
  data: D1MetricMap | null;
  sources: D1MetricSourceMap | null;
  dates: D1MetricDateMap | null;
  quotes: D1MetricQuoteMap | null;
  searchTerms: D1MetricSearchTermMap | null;
  accessions: D1MetricAccessionMap | null;
  isLoading: boolean;
};

type D1FetchResult = {
  values: D1MetricMap;
  sources: D1MetricSourceMap;
  dates: D1MetricDateMap;
  quotes: D1MetricQuoteMap;
  searchTerms: D1MetricSearchTermMap;
  accessions: D1MetricAccessionMap;
};

const fetcher = async (
  url: string,
  tickers: string[]
): Promise<D1FetchResult> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers }),
  });
  if (!res.ok) throw new Error('D1 batch fetch failed');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'D1 batch failed');

  // Transform: results[ticker] is an array of { metric, value } rows
  // Flatten into { ticker: { metric: value } }
  const values: D1MetricMap = {};
  const sources: D1MetricSourceMap = {};
  const dates: D1MetricDateMap = {};
  const quotes: D1MetricQuoteMap = {};
  const searchTerms: D1MetricSearchTermMap = {};
  const accessions: D1MetricAccessionMap = {};
  for (const [ticker, rows] of Object.entries(json.results)) {
    const map: Record<string, number> = {};
    const sourceMap: Record<string, string | null> = {};
    const dateMap: Record<string, string | null> = {};
    const quoteMap: Record<string, string | null> = {};
    const searchTermMap: Record<string, string | null> = {};
    const accessionMap: Record<string, string | null> = {};
    if (Array.isArray(rows)) {
      for (const row of rows as {
        metric: string;
        value: number;
        as_of?: string | null;
        reported_at?: string | null;
        citation_quote?: string | null;
        citation_search_term?: string | null;
        artifact?: { source_url: string | null; accession: string | null };
      }[]) {
        map[row.metric] = row.value;
        sourceMap[row.metric] = row.artifact?.source_url ?? null;
        dateMap[row.metric] = row.as_of ?? row.reported_at ?? null;
        quoteMap[row.metric] = row.citation_quote ?? null;
        searchTermMap[row.metric] = row.citation_search_term ?? null;
        accessionMap[row.metric] = row.artifact?.accession ?? null;
      }
    }
    values[ticker] = map;
    sources[ticker] = sourceMap;
    dates[ticker] = dateMap;
    quotes[ticker] = quoteMap;
    searchTerms[ticker] = searchTermMap;
    accessions[ticker] = accessionMap;
  }
  return { values, sources, dates, quotes, searchTerms, accessions };
};

/**
 * Batch-fetches D1 latest metrics for all tickers.
 * Returns null on error or when D1 is unconfigured (graceful fallback).
 */
export function useD1Fundamentals(tickers: string[]): D1FundamentalsResult {
  // Stable key: sort tickers to avoid refetching on reorder
  const sortedKey = tickers.length > 0
    ? `d1-fundamentals:${[...tickers].sort().join(',')}`
    : null;

  const { data, isLoading } = useSWR<D1FetchResult>(
    sortedKey,
    () => fetcher('/api/d1/latest-metrics/batch', tickers),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,    // Dedupe identical requests for 60s
      focusThrottleInterval: 300_000, // Don't refetch on focus more than every 5min
      errorRetryCount: 1,          // Only retry once on failure
      onError: () => {},           // Suppress error logging — fallback is silent
    },
  );

  return {
    data: data?.values ?? null,
    sources: data?.sources ?? null,
    dates: data?.dates ?? null,
    quotes: data?.quotes ?? null,
    searchTerms: data?.searchTerms ?? null,
    accessions: data?.accessions ?? null,
    isLoading,
  };
}
