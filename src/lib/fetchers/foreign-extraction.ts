/**
 * Foreign Filing Extraction — Shared Types and D1 Ingestion
 *
 * Standardized interface for all foreign fetchers to produce data that
 * flows into D1 with the same citation quality as SEC XBRL data.
 *
 * Pattern: fetcher extracts → ForeignDataPoint[] → ingestForeignDataPoints() → D1
 *
 * Reference implementation: AMF fetcher (src/lib/fetchers/amf.ts)
 */

import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { r2PutObject } from '@/lib/r2/client';

/**
 * A single data point extracted from a foreign regulatory filing.
 * This is the standard output format for all foreign fetchers.
 */
export interface ForeignDataPoint {
  /** Ticker symbol (e.g., '3350.T', '0434.HK', 'ALCPB') */
  entityId: string;
  /** Metric name matching D1 schema */
  metric: 'holdings_native' | 'basic_shares' | 'cash_usd' | 'debt_usd' | 'preferred_equity_usd';
  /** Numeric value */
  value: number;
  /** Unit (e.g., 'BTC', 'shares', 'USD', 'JPY') */
  unit: string;
  /** Date the value is as-of (e.g., '2026-02-28') */
  asOf: string;
  /** Date the filing was published */
  reportedAt: string;

  /** Filing system identifier (e.g., 'tdnet', 'hkex', 'amf', 'edinet', 'sedar') */
  filingSystem: string;
  /** Regulatory filing accession/document ID (real, not synthetic) */
  accession: string;
  /** URL to the source document */
  sourceUrl: string;
  /** Source type for artifact table */
  sourceType: string;

  /** Exact quote from the document supporting this value */
  citationQuote: string;
  /** Search term for highlighting in the filing viewer */
  citationSearchTerm: string;

  /** Extraction method (e.g., 'tdnet_pdf_regex', 'hkex_pdf_regex', 'amf_title_parse') */
  method: string;
  /** Confidence 0-1 */
  confidence: number;

  /** Optional: artifact already exists (skip R2 upload) */
  existingArtifactId?: string;

  /** Optional: raw source document bytes for R2 upload */
  sourceBytes?: Uint8Array;
  /** Content type for R2 upload (e.g., 'application/pdf', 'text/html') */
  sourceContentType?: string;
}

/**
 * Result of a foreign fetcher run for one ticker.
 */
export interface ForeignFetcherResult {
  ticker: string;
  filingSystem: string;
  dataPoints: ForeignDataPoint[];
  skipped: Array<{ id: string; reason: string }>;
  error?: string;
}

/**
 * Generate a citation for a foreign filing data point.
 */
export function generateForeignCitation(params: {
  metric: string;
  value: number;
  unit: string;
  filingSystem: string;
  asOf: string | null;
  accession: string | null;
}): { citation_quote: string; citation_search_term: string } {
  const METRIC_LABELS: Record<string, string> = {
    holdings_native: 'Digital asset holdings (native units)',
    basic_shares: 'Shares outstanding',
    cash_usd: 'Cash and cash equivalents',
    debt_usd: 'Total debt',
  };

  const label = METRIC_LABELS[params.metric] || params.metric;
  const formattedValue = params.value.toLocaleString('en-US');
  const unitSuffix = params.unit === 'USD' ? ' USD' : params.unit === 'shares' ? ' shares' : ` ${params.unit}`;

  const systemLabel = params.filingSystem.toUpperCase();
  const asOfStr = params.asOf ? ` (${params.asOf})` : '';
  const accStr = params.accession ? ` Filing: ${params.accession}.` : '';

  const quote = `[${systemLabel}]${asOfStr}: ${label} = ${formattedValue}${unitSuffix}.${accStr}`;

  return {
    citation_quote: quote,
    citation_search_term: formattedValue,
  };
}

/**
 * Make a deterministic proposal key for deduplication.
 */
function makeProposalKey(parts: {
  entityId: string;
  metric: string;
  proposalSource: string;
  asOf: string;
  reportedAt: string;
}): string {
  const raw = [
    'v1',
    parts.entityId,
    parts.metric,
    parts.proposalSource,
    parts.asOf,
    parts.reportedAt,
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Ingest foreign data points into D1.
 *
 * For each data point:
 * 1. Find or create an artifact record (linked to R2 doc if available)
 * 2. Insert a datapoint with proper citation and proposal_key deduplication
 *
 * Returns summary counts.
 */
export async function ingestForeignDataPoints(
  d1: D1Client,
  runId: string,
  dataPoints: ForeignDataPoint[],
): Promise<{
  inserted: number;
  updated: number;
  noop: number;
  errors: Array<{ entityId: string; metric: string; error: string }>;
}> {
  let inserted = 0;
  let updated = 0;
  let noop = 0;
  const errors: Array<{ entityId: string; metric: string; error: string }> = [];

  // Load entity-metric config for auto-approve gating
  const configRows = await d1.query<{ entity_id: string; metric: string }>(
    `SELECT entity_id, metric FROM entity_metric_config WHERE auto_approve = 0`
  ).catch(() => ({ results: [] as { entity_id: string; metric: string }[] }));
  const noAutoApprove = new Set(
    (configRows.results || []).map(r => `${r.entity_id}|${r.metric}`)
  );

  for (const dp of dataPoints) {
    try {
      // 1. Resolve artifact
      let artifactId = dp.existingArtifactId || null;

      if (!artifactId) {
        // Check if artifact exists by accession
        const existing = await d1.query<{ artifact_id: string }>(
          `SELECT artifact_id FROM artifacts WHERE accession = ? AND ticker = ? LIMIT 1;`,
          [dp.accession, dp.entityId]
        );

        if (existing.results.length > 0) {
          artifactId = existing.results[0].artifact_id;
        } else {
          // Create a minimal artifact record and optionally upload source to R2
          artifactId = crypto.randomUUID();
          const r2Key = `foreign-filings/${dp.entityId.toLowerCase()}/${dp.accession}`;
          const contentHash = dp.sourceBytes
            ? crypto.createHash('md5').update(dp.sourceBytes).digest('hex')
            : crypto.createHash('md5').update(`${dp.sourceType}|${dp.entityId}|${dp.accession}`).digest('hex');

          // Upload source document to R2 if bytes are provided
          if (dp.sourceBytes) {
            try {
              await r2PutObject({
                key: r2Key,
                body: dp.sourceBytes,
                contentType: dp.sourceContentType,
              });
            } catch (r2Err) {
              // Log but don't fail — artifact record is still useful without R2 doc
              console.error(`[R2] Failed to upload ${r2Key}:`, r2Err instanceof Error ? r2Err.message : r2Err);
            }
          }

          await d1.query(
            `INSERT OR IGNORE INTO artifacts (
               artifact_id, source_type, source_url, content_hash, fetched_at,
               r2_bucket, r2_key, ticker, accession
             ) VALUES (?, ?, ?, ?, ?, 'dat-tracker-filings', ?, ?, ?);`,
            [
              artifactId,
              dp.sourceType,
              dp.sourceUrl,
              contentHash,
              new Date().toISOString(),
              r2Key,
              dp.entityId,
              dp.accession,
            ]
          );

          // Re-query in case INSERT OR IGNORE hit a collision
          const actual = await d1.query<{ artifact_id: string }>(
            `SELECT artifact_id FROM artifacts WHERE accession = ? AND ticker = ? LIMIT 1;`,
            [dp.accession, dp.entityId]
          );
          if (actual.results[0]?.artifact_id) {
            artifactId = actual.results[0].artifact_id;
          }
        }
      }

      // 2. Build proposal key
      const proposalKey = makeProposalKey({
        entityId: dp.entityId,
        metric: dp.metric,
        proposalSource: dp.accession,
        asOf: dp.asOf,
        reportedAt: dp.reportedAt,
      });

      // 3. Check for existing datapoint with same proposal key
      const existingDp = await d1.query<{ value: number; status: string }>(
        `SELECT value, status FROM datapoints WHERE proposal_key = ? LIMIT 1;`,
        [proposalKey]
      );

      if (existingDp.results.length > 0) {
        const ex = existingDp.results[0];
        if (Number(ex.value) === dp.value) {
          noop += 1;
          continue;
        }
        // Value changed — update
        await d1.query(
          `UPDATE datapoints SET
             value = ?, citation_quote = ?, citation_search_term = ?,
             confidence = ?, method = ?
           WHERE proposal_key = ?;`,
          [dp.value, dp.citationQuote, dp.citationSearchTerm, dp.confidence, dp.method, proposalKey]
        );
        updated += 1;
        continue;
      }

      // 4. Insert new datapoint
      const dpId = crypto.randomUUID();
      const dpStatus = noAutoApprove.has(`${dp.entityId}|${dp.metric}`) ? 'candidate' : 'approved';
      await d1.query(
        `INSERT INTO datapoints (
           datapoint_id, entity_id, metric, value, unit, scale,
           as_of, reported_at, artifact_id, run_id,
           method, confidence, status, proposal_key, created_at,
           citation_quote, citation_search_term
         ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          dpId,
          dp.entityId,
          dp.metric,
          dp.value,
          dp.unit,
          dp.asOf,
          dp.reportedAt,
          artifactId,
          runId,
          dp.method,
          dp.confidence,
          dpStatus,
          proposalKey,
          new Date().toISOString(),
          dp.citationQuote,
          dp.citationSearchTerm,
        ]
      );
      inserted += 1;
    } catch (err) {
      errors.push({
        entityId: dp.entityId,
        metric: dp.metric,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { inserted, updated, noop, errors };
}
