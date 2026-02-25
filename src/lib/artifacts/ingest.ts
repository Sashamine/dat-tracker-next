import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { r2PutObject } from '@/lib/r2/client';

export type ArtifactIngestInput = {
  sourceType: string;
  ticker: string;
  accession?: string | null;
  sourceUrl?: string | null;
  r2Key: string;
  bytes: Uint8Array;
  contentType?: string;
  fetchedAt?: string; // ISO
};

export async function ingestArtifactToR2AndD1(input: ArtifactIngestInput): Promise<{
  artifactId: string;
  contentHash: string;
  inserted: boolean;
  r2Key: string;
  r2Bucket: string;
}> {
  const d1 = D1Client.fromEnv();
  const fetchedAt = input.fetchedAt || new Date().toISOString();
  const contentHash = crypto.createHash('sha256').update(input.bytes).digest('hex');
  const r2Bucket = process.env.R2_BUCKET || 'dat-tracker-filings';

  const pre = await d1.query<{ artifact_id: string }>(
    `SELECT artifact_id FROM artifacts WHERE content_hash = ? AND r2_key = ? LIMIT 1;`,
    [contentHash, input.r2Key]
  );
  const existedBefore = pre.results.length > 0;

  // Upload first. (If insert fails, we can still reinsert later; avoids D1 pointing at missing objects.)
  await r2PutObject({ key: input.r2Key, body: input.bytes, contentType: input.contentType });

  const artifactId = crypto.randomUUID();
  await d1.query(
    `INSERT OR IGNORE INTO artifacts (
       artifact_id, source_type, source_url, content_hash, fetched_at,
       r2_bucket, r2_key, cik, ticker, accession
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
    [
      artifactId,
      input.sourceType,
      input.sourceUrl || null,
      contentHash,
      fetchedAt,
      r2Bucket,
      input.r2Key,
      input.ticker.toUpperCase(),
      input.accession || null,
    ]
  );

  return {
    artifactId,
    contentHash,
    inserted: !existedBefore,
    r2Key: input.r2Key,
    r2Bucket,
  };
}
