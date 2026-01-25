/**
 * Verification State Types
 *
 * Types for tracking verified data, processed filings, and share events.
 * Used to avoid re-doing verification work and maintain evidence chains.
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type VerifiableField =
  | 'shares_outstanding'
  | 'holdings'
  | 'total_debt'
  | 'cash'
  | 'preferred_equity';

export type SourceType =
  | '10-K'
  | '10-Q'
  | '8-K'
  | 'S-3'
  | '424B5'
  | 'DEF-14A'
  | 'dashboard'
  | 'press-release'
  | 'on-chain';

export type ExtractionMethod =
  | 'xbrl'      // Structured SEC XBRL data - auto-commit
  | 'llm'       // LLM extraction from text - human review
  | 'fetcher'   // Automated dashboard scraper - auto-commit
  | 'manual';   // Human entered - already reviewed

export type ShareEventType =
  | 'atm_offering'       // Sold shares via ATM program
  | 'public_offering'    // Traditional equity raise
  | 'warrant_exercise'   // Warrants converted to shares
  | 'option_exercise'    // Employee options exercised
  | 'note_conversion'    // Convertible notes → shares
  | 'stock_split'        // N:1 split (positive delta)
  | 'reverse_split'      // 1:N reverse split (negative delta)
  | 'share_repurchase'   // Buyback (negative delta)
  | 'other';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type VerifiedBy = 'auto' | 'human';

// ============================================
// VERIFIED BASELINE
// ============================================

export interface VerifiedBaseline {
  id?: number;
  ticker: string;
  field: VerifiableField;

  // The verified value
  value: number;
  valueDate: string;  // YYYY-MM-DD - what date this value is FOR

  // Source evidence
  sourceType: SourceType;
  sourceAccession?: string;  // SEC filing accession number
  sourceUrl: string;
  extractionMethod: ExtractionMethod;

  // Verification metadata
  verifiedAt: string;  // ISO timestamp
  verifiedBy: VerifiedBy;
  confidence: ConfidenceLevel;
  notes?: string;
}

// Database row format
export interface DbVerifiedBaseline {
  id: number;
  ticker: string;
  field: string;
  value: string;  // NUMERIC comes as string
  value_date: string;
  source_type: string;
  source_accession: string | null;
  source_url: string;
  extraction_method: string;
  verified_at: string;
  verified_by: string;
  confidence: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROCESSED FILING
// ============================================

export interface ExtractedData {
  field: VerifiableField;
  value: number;
  context?: string;  // Text snippet where we found it
}

export interface ProcessedFiling {
  id?: number;
  ticker: string;

  // Filing identification
  accessionNumber: string;
  formType: SourceType;
  filedDate: string;  // YYYY-MM-DD
  periodDate?: string;  // YYYY-MM-DD - period covered

  // Processing metadata
  processedAt: string;  // ISO timestamp
  processedBy: VerifiedBy;

  // What we extracted (if anything relevant)
  extractedData?: ExtractedData[];

  // Or why we skipped it
  skippedReason?: 'no_relevant_data' | 'duplicate' | 'superseded' | 'error';
  skippedNotes?: string;
}

// Database row format
export interface DbProcessedFiling {
  id: number;
  ticker: string;
  accession_number: string;
  form_type: string;
  filed_date: string;
  period_date: string | null;
  processed_at: string;
  processed_by: string;
  extracted_data: ExtractedData[] | null;
  skipped_reason: string | null;
  skipped_notes: string | null;
  created_at: string;
}

// ============================================
// SHARE EVENT
// ============================================

export interface ShareEvent {
  id?: number;
  ticker: string;

  // Event details
  eventDate: string;  // YYYY-MM-DD
  eventType: ShareEventType;

  // Impact
  sharesDelta: number;  // Positive for issuance, negative for buyback
  splitRatio?: string;  // "4:1" for splits

  // Source evidence
  sourceType: SourceType;
  sourceAccession?: string;
  sourceUrl: string;
  sourceExcerpt?: string;  // Actual text proving this

  // Processing metadata
  recordedAt: string;  // ISO timestamp
  recordedBy: VerifiedBy;
  confidence: ConfidenceLevel;
}

// Database row format
export interface DbShareEvent {
  id: number;
  ticker: string;
  event_date: string;
  event_type: string;
  shares_delta: string;  // BIGINT comes as string
  split_ratio: string | null;
  source_type: string;
  source_accession: string | null;
  source_url: string;
  source_excerpt: string | null;
  recorded_at: string;
  recorded_by: string;
  confidence: string;
  created_at: string;
}

// ============================================
// COMPANY FILING CHECK STATE
// ============================================

export interface CompanyFilingCheck {
  ticker: string;
  lastCheckAt?: string;  // ISO timestamp
  latestFilingAccession?: string;
  latestFilingDate?: string;  // YYYY-MM-DD
  needsReview: boolean;
  reviewReason?: string;
}

// Database row format
export interface DbCompanyFilingCheck {
  id: number;
  ticker: string;
  last_check_at: string | null;
  latest_filing_accession: string | null;
  latest_filing_date: string | null;
  needs_review: boolean;
  review_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// AGGREGATE TYPES
// ============================================

export interface FieldVerificationState {
  // Baseline (from 10-Q/10-K)
  baseline: VerifiedBaseline;

  // Events since baseline
  eventsSinceBaseline: ShareEvent[];

  // Computed current estimate
  currentEstimate: number;
  estimateAsOf: string;  // YYYY-MM-DD

  // Staleness
  daysSinceBaseline: number;
  needsRefresh: boolean;  // true if >90 days or new filings exist
}

export interface CompanyVerificationState {
  ticker: string;

  // Filing check state
  filingCheck: CompanyFilingCheck;

  // Per-field verification state
  fields: Partial<Record<VerifiableField, FieldVerificationState>>;

  // Unprocessed filings count
  unprocessedFilingsCount: number;
}

// ============================================
// VERIFICATION CHECK RESULT
// ============================================

export interface VerificationCheckResult {
  ticker: string;
  checkedAt: string;  // ISO timestamp

  // What we found
  newFilings: ProcessedFiling[];
  newEvents: ShareEvent[];

  // Changes detected
  changes: {
    field: VerifiableField;
    previousEstimate: number;
    newEstimate: number;
    reason: string;
  }[];

  // Action needed
  actionRequired: 'none' | 'review' | 'urgent';
  actionReason?: string;
}

// ============================================
// AUTO-COMMIT RULES
// ============================================

/**
 * Determine if extracted data should auto-commit or require human review
 *
 * Auto-commit: XBRL extraction, dashboard fetchers
 * Human review: LLM extraction from text
 */
export function shouldAutoCommit(method: ExtractionMethod): boolean {
  return method === 'xbrl' || method === 'fetcher';
}
