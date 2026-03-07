import useSWR from 'swr';

export interface AdoptionEvent {
  id: string;
  ticker: string;
  event_type: 'first_purchase' | 'accumulation' | 'sell' | 'governance' | 'treasury_policy';
  event_date: string;
  description: string;
  significance: number;
  artifact_id: string | null;
  source_url: string | null;
  meta: string | null;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAdoptionEvents(ticker: string) {
  const { data, error, isLoading } = useSWR(
    ticker ? `/api/adoption-events/${ticker}` : null,
    fetcher
  );

  return {
    events: (data?.results as AdoptionEvent[]) || [],
    isLoading,
    isError: error,
  };
}
