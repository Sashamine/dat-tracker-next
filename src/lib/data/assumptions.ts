/**
 * Assumption Register
 *
 * Tracks all provisional assumptions in the dataset that affect
 * financial calculations (mNAV, EV, dilution). Each assumption
 * must have a resolution path and be periodically reviewed.
 *
 * This is a first-class control surface — integrity tests enforce
 * that assumptions are reviewed, valid, and reference real tickers.
 */

export type AssumptionSensitivity = 'low' | 'medium' | 'high';
export type AssumptionMateriality = 'low' | 'medium' | 'high';
export type AssumptionStatus = 'open' | 'monitoring' | 'resolved';

export interface Assumption {
  ticker: string;
  field: string;                   // e.g., "settlementType", "encumberedHoldings", "sharesForMnav"
  assumption: string;              // What we're assuming
  reason: string;                  // Why the assumption exists
  trigger: string;                 // What event would resolve it
  sourceNeeded: string;            // What document/source we need
  resolutionPath: string;          // How to verify/resolve when trigger fires
  sensitivity: AssumptionSensitivity;   // Impact on mNAV if wrong
  materiality: AssumptionMateriality;   // Dollar magnitude of error
  status: AssumptionStatus;
  lastReviewed: string;            // ISO date
  introducedBy?: string;           // Session/commit that added this
  reviewNotes?: string;            // Latest review findings
  resolvedDate?: string;           // ISO date when resolved
  resolvedNotes?: string;          // How it was resolved
}

/**
 * Review staleness threshold in days.
 * Open/monitoring assumptions must be reviewed within this window.
 */
export const ASSUMPTION_REVIEW_MAX_AGE_DAYS = 90;

export const ASSUMPTIONS: Assumption[] = [
  // ── Settlement Types ──────────────────────────────────────────────
  {
    ticker: 'CEPO',
    field: 'settlementType',
    assumption: 'full_share (provisional — likely issuer_election per Cantor playbook)',
    reason: 'S-4 not yet public; cannot verify indenture terms',
    trigger: 'First CEPO SEC filing (S-4 or 8-K post-merger)',
    sourceNeeded: 'S-4 registration statement with indenture terms',
    resolutionPath: 'Read S-4 indenture for cash/share/combination settlement language, reclassify accordingly',
    sensitivity: 'high',
    materiality: 'high',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'Red team audit session 2026-03-07',
  },

  // ── Encumbered Holdings ───────────────────────────────────────────
  {
    ticker: 'SQNS',
    field: 'encumberedHoldings',
    assumption: '1,617 BTC encumbered (being sold to redeem convertible at par)',
    reason: 'Company announced sale of BTC to fund $95M convertible redemption',
    trigger: 'Convertible redemption completes or next 10-Q filing',
    sourceNeeded: '10-Q or 8-K confirming redemption completion and remaining BTC count',
    resolutionPath: 'Check if convertible was fully redeemed; update holdings and remove encumbrance',
    sensitivity: 'high',
    materiality: 'medium',
    status: 'monitoring',
    lastReviewed: '2026-03-07',
    introducedBy: 'Red team audit session 2026-03-07',
  },

  // ── Pending Mergers ───────────────────────────────────────────────
  {
    ticker: 'TBH',
    field: 'holdings',
    assumption: 'holdings=0 pre-merger; expectedHoldings=730M DOGE post-merger',
    reason: 'TBH (Brag House) has no DOGE; House of Doge (private) holds 730M DOGE; merger pending',
    trigger: 'Merger close announcement (expected Q1 2026)',
    sourceNeeded: '8-K announcing merger completion + pro-forma share count',
    resolutionPath: 'Set holdings=730M, update sharesForMnav to post-merger diluted count, remove pendingMerger flag',
    sensitivity: 'high',
    materiality: 'medium',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'TBH verification session 2026-01-26',
  },
  {
    ticker: 'ETHM',
    field: 'holdings',
    assumption: 'Pre-merger SPAC with override market cap ($230M)',
    reason: 'Ether Machine pending SPAC merger with Dynamix; no reliable price feed',
    trigger: 'SPAC merger completion',
    sourceNeeded: '8-K announcing merger close + S-1 with pro-forma financials',
    resolutionPath: 'Update holdings, shares, remove market cap override, remove pendingMerger if set',
    sensitivity: 'medium',
    materiality: 'medium',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'Market cap overrides review',
  },

  // ── Market Cap Overrides ──────────────────────────────────────────
  {
    ticker: 'XXI',
    field: 'marketCap',
    assumption: 'Market cap override at $6.1B (dual-class: 651M total shares × ~$9.40)',
    reason: 'Pre-listing SPAC; no live price feed yet',
    trigger: 'XXI begins public trading',
    sourceNeeded: 'Live stock price from exchange',
    resolutionPath: 'Add sharesForMnav with total shares (Class A + Class B), remove MARKET_CAP_OVERRIDES entry',
    sensitivity: 'high',
    materiality: 'high',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'Market cap overrides review',
  },
  {
    ticker: 'NAKA',
    field: 'marketCap',
    assumption: 'Market cap override at $1.5B (no price feed)',
    reason: 'Nakamoto Inc. post-KindlyMD merger; no reliable price data',
    trigger: 'NAKA price becomes available via FMP or other feed',
    sourceNeeded: 'Live stock price + verified share count',
    resolutionPath: 'Add sharesForMnav, remove MARKET_CAP_OVERRIDES entry',
    sensitivity: 'high',
    materiality: 'high',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'Market cap overrides review',
  },
  {
    ticker: 'XRPN',
    field: 'marketCap',
    assumption: 'Market cap override at $1B (SPAC merger)',
    reason: 'Evernorth Holdings SPAC merger; no reliable price feed',
    trigger: 'XRPN begins public trading or merger closes',
    sourceNeeded: 'Live stock price or 8-K with pro-forma financials',
    resolutionPath: 'Add sharesForMnav, remove MARKET_CAP_OVERRIDES entry',
    sensitivity: 'medium',
    materiality: 'medium',
    status: 'open',
    lastReviewed: '2026-03-07',
    introducedBy: 'Market cap overrides review',
  },

  // ── Foreign Companies (No SEC Pipeline) ───────────────────────────
  {
    ticker: '3350.T',
    field: 'holdings',
    assumption: 'Holdings from company dashboard (metaplanet.jp/bitcoin), not regulatory filing',
    reason: 'Japanese company; TDNet filings not in automated pipeline',
    trigger: 'TDNet pipeline becomes operational OR holdings >30 days stale',
    sourceNeeded: 'TDNet filing or company IR page update',
    resolutionPath: 'Check metaplanet.jp/bitcoin dashboard; cross-reference TDNet if available',
    sensitivity: 'low',
    materiality: 'high',
    status: 'monitoring',
    lastReviewed: '2026-03-07',
    introducedBy: 'Foreign company gap analysis',
    reviewNotes: 'Dashboard updates daily; low risk of staleness but no automated verification',
  },
  {
    ticker: 'ALCPB',
    field: 'holdings',
    assumption: 'Holdings from AMF regulatory filing (French regulator)',
    reason: 'French company; AMF filings parsed via API but not in hourly pipeline',
    trigger: 'Holdings >60 days stale',
    sourceNeeded: 'AMF filing via dilaamf.opendatasoft.com API',
    resolutionPath: 'Run AMF fetcher; verify BTC count from filing title',
    sensitivity: 'low',
    materiality: 'medium',
    status: 'monitoring',
    lastReviewed: '2026-03-07',
    introducedBy: 'Foreign company gap analysis',
  },
];
