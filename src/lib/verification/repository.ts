/**
 * Verification State Repository
 *
 * Database operations for verification state tracking.
 * Handles baselines, processed filings, and share events.
 */

import { query, queryOne } from '../db';
import type {
  VerifiedBaseline,
  DbVerifiedBaseline,
  ProcessedFiling,
  DbProcessedFiling,
  ShareEvent,
  DbShareEvent,
  CompanyFilingCheck,
  DbCompanyFilingCheck,
  VerifiableField,
  CompanyVerificationState,
  FieldVerificationState,
  ExtractedData,
} from './types';

// ============================================
// CONVERTERS (DB → TypeScript)
// ============================================

function toVerifiedBaseline(row: DbVerifiedBaseline): VerifiedBaseline {
  return {
    id: row.id,
    ticker: row.ticker,
    field: row.field as VerifiableField,
    value: parseFloat(row.value),
    valueDate: row.value_date,
    sourceType: row.source_type as VerifiedBaseline['sourceType'],
    sourceAccession: row.source_accession || undefined,
    sourceUrl: row.source_url,
    extractionMethod: row.extraction_method as VerifiedBaseline['extractionMethod'],
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by as VerifiedBaseline['verifiedBy'],
    confidence: row.confidence as VerifiedBaseline['confidence'],
    notes: row.notes || undefined,
  };
}

function toProcessedFiling(row: DbProcessedFiling): ProcessedFiling {
  return {
    id: row.id,
    ticker: row.ticker,
    accessionNumber: row.accession_number,
    formType: row.form_type as ProcessedFiling['formType'],
    filedDate: row.filed_date,
    periodDate: row.period_date || undefined,
    processedAt: row.processed_at,
    processedBy: row.processed_by as ProcessedFiling['processedBy'],
    extractedData: row.extracted_data || undefined,
    skippedReason: row.skipped_reason as ProcessedFiling['skippedReason'],
    skippedNotes: row.skipped_notes || undefined,
  };
}

function toShareEvent(row: DbShareEvent): ShareEvent {
  return {
    id: row.id,
    ticker: row.ticker,
    eventDate: row.event_date,
    eventType: row.event_type as ShareEvent['eventType'],
    sharesDelta: parseInt(row.shares_delta, 10),
    splitRatio: row.split_ratio || undefined,
    sourceType: row.source_type as ShareEvent['sourceType'],
    sourceAccession: row.source_accession || undefined,
    sourceUrl: row.source_url,
    sourceExcerpt: row.source_excerpt || undefined,
    recordedAt: row.recorded_at,
    recordedBy: row.recorded_by as ShareEvent['recordedBy'],
    confidence: row.confidence as ShareEvent['confidence'],
  };
}

function toCompanyFilingCheck(row: DbCompanyFilingCheck): CompanyFilingCheck {
  return {
    ticker: row.ticker,
    lastCheckAt: row.last_check_at || undefined,
    latestFilingAccession: row.latest_filing_accession || undefined,
    latestFilingDate: row.latest_filing_date || undefined,
    needsReview: row.needs_review,
    reviewReason: row.review_reason || undefined,
  };
}

// ============================================
// VERIFIED BASELINES
// ============================================

/**
 * Get the latest verified baseline for a ticker/field
 */
export async function getLatestBaseline(
  ticker: string,
  field: VerifiableField
): Promise<VerifiedBaseline | null> {
  const row = await queryOne<DbVerifiedBaseline>(
    `SELECT * FROM verified_baselines
     WHERE ticker = $1 AND field = $2
     ORDER BY value_date DESC
     LIMIT 1`,
    [ticker, field]
  );
  return row ? toVerifiedBaseline(row) : null;
}

/**
 * Get all baselines for a ticker
 */
export async function getBaselinesForTicker(
  ticker: string
): Promise<VerifiedBaseline[]> {
  const rows = await query<DbVerifiedBaseline>(
    `SELECT * FROM verified_baselines
     WHERE ticker = $1
     ORDER BY field, value_date DESC`,
    [ticker]
  );
  return rows.map(toVerifiedBaseline);
}

/**
 * Upsert a verified baseline
 */
export async function upsertBaseline(
  baseline: Omit<VerifiedBaseline, 'id'>
): Promise<VerifiedBaseline> {
  const row = await queryOne<DbVerifiedBaseline>(
    `INSERT INTO verified_baselines (
      ticker, field, value, value_date,
      source_type, source_accession, source_url, extraction_method,
      verified_at, verified_by, confidence, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (ticker, field, value_date)
    DO UPDATE SET
      value = EXCLUDED.value,
      source_type = EXCLUDED.source_type,
      source_accession = EXCLUDED.source_accession,
      source_url = EXCLUDED.source_url,
      extraction_method = EXCLUDED.extraction_method,
      verified_at = EXCLUDED.verified_at,
      verified_by = EXCLUDED.verified_by,
      confidence = EXCLUDED.confidence,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      baseline.ticker,
      baseline.field,
      baseline.value,
      baseline.valueDate,
      baseline.sourceType,
      baseline.sourceAccession || null,
      baseline.sourceUrl,
      baseline.extractionMethod,
      baseline.verifiedAt,
      baseline.verifiedBy,
      baseline.confidence,
      baseline.notes || null,
    ]
  );
  return toVerifiedBaseline(row!);
}

// ============================================
// PROCESSED FILINGS
// ============================================

/**
 * Check if a filing has been processed
 */
export async function isFilingProcessed(
  accessionNumber: string
): Promise<boolean> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM processed_filings
     WHERE accession_number = $1`,
    [accessionNumber]
  );
  return parseInt(row?.count || '0', 10) > 0;
}

/**
 * Get all processed filings for a ticker since a date
 */
export async function getProcessedFilings(
  ticker: string,
  sinceDate?: string
): Promise<ProcessedFiling[]> {
  const rows = await query<DbProcessedFiling>(
    sinceDate
      ? `SELECT * FROM processed_filings
         WHERE ticker = $1 AND filed_date >= $2
         ORDER BY filed_date DESC`
      : `SELECT * FROM processed_filings
         WHERE ticker = $1
         ORDER BY filed_date DESC`,
    sinceDate ? [ticker, sinceDate] : [ticker]
  );
  return rows.map(toProcessedFiling);
}

/**
 * Get the latest processed filing date for a ticker
 */
export async function getLatestProcessedFilingDate(
  ticker: string
): Promise<string | null> {
  const row = await queryOne<{ max_date: string | null }>(
    `SELECT MAX(filed_date) as max_date FROM processed_filings
     WHERE ticker = $1`,
    [ticker]
  );
  return row?.max_date || null;
}

/**
 * Record a processed filing
 */
export async function recordProcessedFiling(
  filing: Omit<ProcessedFiling, 'id'>
): Promise<ProcessedFiling> {
  const row = await queryOne<DbProcessedFiling>(
    `INSERT INTO processed_filings (
      ticker, accession_number, form_type, filed_date, period_date,
      processed_at, processed_by, extracted_data, skipped_reason, skipped_notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (accession_number)
    DO UPDATE SET
      extracted_data = COALESCE(EXCLUDED.extracted_data, processed_filings.extracted_data),
      processed_at = EXCLUDED.processed_at
    RETURNING *`,
    [
      filing.ticker,
      filing.accessionNumber,
      filing.formType,
      filing.filedDate,
      filing.periodDate || null,
      filing.processedAt,
      filing.processedBy,
      filing.extractedData ? JSON.stringify(filing.extractedData) : null,
      filing.skippedReason || null,
      filing.skippedNotes || null,
    ]
  );
  return toProcessedFiling(row!);
}

// ============================================
// SHARE EVENTS
// ============================================

/**
 * Get share events for a ticker since a date
 */
export async function getShareEvents(
  ticker: string,
  sinceDate?: string
): Promise<ShareEvent[]> {
  const rows = await query<DbShareEvent>(
    sinceDate
      ? `SELECT * FROM share_events
         WHERE ticker = $1 AND event_date >= $2
         ORDER BY event_date ASC`
      : `SELECT * FROM share_events
         WHERE ticker = $1
         ORDER BY event_date ASC`,
    sinceDate ? [ticker, sinceDate] : [ticker]
  );
  return rows.map(toShareEvent);
}

/**
 * Record a share event
 */
export async function recordShareEvent(
  event: Omit<ShareEvent, 'id'>
): Promise<ShareEvent> {
  const row = await queryOne<DbShareEvent>(
    `INSERT INTO share_events (
      ticker, event_date, event_type, shares_delta, split_ratio,
      source_type, source_accession, source_url, source_excerpt,
      recorded_at, recorded_by, confidence
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (ticker, event_date, event_type, source_accession)
    DO NOTHING
    RETURNING *`,
    [
      event.ticker,
      event.eventDate,
      event.eventType,
      event.sharesDelta,
      event.splitRatio || null,
      event.sourceType,
      event.sourceAccession || null,
      event.sourceUrl,
      event.sourceExcerpt || null,
      event.recordedAt,
      event.recordedBy,
      event.confidence,
    ]
  );
  // If conflict, return the event as-is (it already exists)
  return row ? toShareEvent(row) : (event as ShareEvent);
}

/**
 * Calculate current shares from baseline + events
 */
export async function calculateCurrentShares(
  ticker: string
): Promise<{ estimate: number; baselineDate: string; eventsCount: number } | null> {
  const baseline = await getLatestBaseline(ticker, 'shares_outstanding');
  if (!baseline) return null;

  const events = await getShareEvents(ticker, baseline.valueDate);

  const totalDelta = events.reduce((sum, e) => sum + e.sharesDelta, 0);
  return {
    estimate: baseline.value + totalDelta,
    baselineDate: baseline.valueDate,
    eventsCount: events.length,
  };
}

// ============================================
// COMPANY FILING CHECK STATE
// ============================================

/**
 * Get filing check state for a ticker
 */
export async function getFilingCheckState(
  ticker: string
): Promise<CompanyFilingCheck | null> {
  const row = await queryOne<DbCompanyFilingCheck>(
    `SELECT * FROM company_filing_checks WHERE ticker = $1`,
    [ticker]
  );
  return row ? toCompanyFilingCheck(row) : null;
}

/**
 * Update filing check state
 */
export async function updateFilingCheckState(
  state: CompanyFilingCheck
): Promise<CompanyFilingCheck> {
  const row = await queryOne<DbCompanyFilingCheck>(
    `INSERT INTO company_filing_checks (
      ticker, last_check_at, latest_filing_accession, latest_filing_date,
      needs_review, review_reason
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (ticker)
    DO UPDATE SET
      last_check_at = EXCLUDED.last_check_at,
      latest_filing_accession = EXCLUDED.latest_filing_accession,
      latest_filing_date = EXCLUDED.latest_filing_date,
      needs_review = EXCLUDED.needs_review,
      review_reason = EXCLUDED.review_reason,
      updated_at = NOW()
    RETURNING *`,
    [
      state.ticker,
      state.lastCheckAt || null,
      state.latestFilingAccession || null,
      state.latestFilingDate || null,
      state.needsReview,
      state.reviewReason || null,
    ]
  );
  return toCompanyFilingCheck(row!);
}

/**
 * Get all tickers that need review
 */
export async function getTickersNeedingReview(): Promise<CompanyFilingCheck[]> {
  const rows = await query<DbCompanyFilingCheck>(
    `SELECT * FROM company_filing_checks
     WHERE needs_review = true
     ORDER BY ticker`
  );
  return rows.map(toCompanyFilingCheck);
}

// ============================================
// AGGREGATE STATE
// ============================================

/**
 * Get full verification state for a company
 */
export async function getCompanyVerificationState(
  ticker: string
): Promise<CompanyVerificationState> {
  // Get filing check state
  const filingCheck = await getFilingCheckState(ticker) || {
    ticker,
    needsReview: false,
  };

  // Get all baselines
  const baselines = await getBaselinesForTicker(ticker);

  // Build field states
  const fields: Partial<Record<VerifiableField, FieldVerificationState>> = {};

  for (const baseline of baselines) {
    // Only keep latest baseline per field
    if (fields[baseline.field]) continue;

    const events = await getShareEvents(ticker, baseline.valueDate);
    const totalDelta = events.reduce((sum, e) => sum + e.sharesDelta, 0);

    const daysSinceBaseline = Math.floor(
      (Date.now() - new Date(baseline.valueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    fields[baseline.field] = {
      baseline,
      eventsSinceBaseline: events,
      currentEstimate: baseline.value + totalDelta,
      estimateAsOf: events.length > 0
        ? events[events.length - 1].eventDate
        : baseline.valueDate,
      daysSinceBaseline,
      needsRefresh: daysSinceBaseline > 90 || filingCheck.needsReview,
    };
  }

  // Count unprocessed filings
  const latestProcessed = await getLatestProcessedFilingDate(ticker);
  // Note: actual unprocessed count would require fetching from SEC
  // For now, we'll indicate if we've never processed anything
  const unprocessedFilingsCount = latestProcessed ? 0 : -1; // -1 means unknown

  return {
    ticker,
    filingCheck,
    fields,
    unprocessedFilingsCount,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a company needs its filings refreshed
 */
export async function needsFilingRefresh(ticker: string): Promise<boolean> {
  const state = await getCompanyVerificationState(ticker);

  // Needs refresh if marked for review
  if (state.filingCheck.needsReview) return true;

  // Or if any field baseline is >90 days old
  for (const fieldState of Object.values(state.fields)) {
    if (fieldState && fieldState.daysSinceBaseline > 90) return true;
  }

  return false;
}

/**
 * Get all tickers that need filing refresh
 */
export async function getTickersNeedingRefresh(): Promise<string[]> {
  // Get tickers marked for review
  const needsReview = await query<{ ticker: string }>(
    `SELECT ticker FROM company_filing_checks WHERE needs_review = true`
  );

  // Get tickers with stale baselines (>90 days)
  const staleBaselines = await query<{ ticker: string }>(
    `SELECT DISTINCT ticker FROM verified_baselines
     WHERE value_date < CURRENT_DATE - INTERVAL '90 days'`
  );

  const allTickers = new Set([
    ...needsReview.map(r => r.ticker),
    ...staleBaselines.map(r => r.ticker),
  ]);

  return Array.from(allTickers).sort();
}
