import useSWR from 'swr';

export type D1Artifact = {
  artifact_id: string;
  source_type: string | null;
  source_url: string | null;
  fetched_at: string | null;
  r2_bucket: string | null;
  r2_key: string | null;
  cik: string | null;
  ticker: string | null;
  accession: string | null;
};

export type D1ArtifactResponse = {
  success: boolean;
  artifact_id: string;
  artifact: D1Artifact | null;
  error?: string;
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useD1Artifact(artifactId: string | null | undefined) {
  const id = (artifactId || '').trim();
  const key = id ? `/api/d1/artifact?artifact_id=${encodeURIComponent(id)}` : null;
  return useSWR<D1ArtifactResponse>(key, fetcher);
}
