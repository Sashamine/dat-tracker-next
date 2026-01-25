/**
 * Verification State Module
 *
 * Tracks verified data, processed filings, and share events to:
 * - Avoid re-doing verification work
 * - Maintain evidence chains for auditing
 * - Calculate current estimates from baseline + events
 */

// Types
export * from './types';

// Repository functions
export {
  // Baselines
  getLatestBaseline,
  getBaselinesForTicker,
  upsertBaseline,

  // Processed filings
  isFilingProcessed,
  getProcessedFilings,
  getLatestProcessedFilingDate,
  recordProcessedFiling,

  // Share events
  getShareEvents,
  recordShareEvent,
  calculateCurrentShares,

  // Filing check state
  getFilingCheckState,
  updateFilingCheckState,
  getTickersNeedingReview,

  // Aggregate state
  getCompanyVerificationState,
  needsFilingRefresh,
  getTickersNeedingRefresh,
} from './repository';
