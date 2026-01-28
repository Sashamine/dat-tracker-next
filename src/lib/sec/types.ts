/**
 * Monitoring System Types
 */

export type SourceTrustLevel = 'official' | 'verified' | 'community' | 'unverified';
export type UpdateStatus = 'pending' | 'approved' | 'rejected' | 'superseded';
export type MonitoringRunStatus = 'running' | 'completed' | 'failed';

export interface SocialSource {
  id: number;
  companyId: number;
  platform: string;
  accountHandle: string;
  accountType: 'official' | 'analyst' | 'news';
  trustLevel: SourceTrustLevel;
  keywords?: string[];
  isActive: boolean;
  lastChecked?: Date;
  lastPostId?: string;
}

export interface PendingUpdate {
  id: number;
  companyId: number;
  detectedHoldings: number;
  detectedSharesOutstanding?: number;
  previousHoldings?: number;
  confidenceScore: number;
  sourceType: string;
  sourceUrl?: string;
  sourceText?: string;
  sourceDate?: Date;
  trustLevel: SourceTrustLevel;
  llmModel?: string;
  llmPromptVersion?: string;
  extractionReasoning?: string;
  status: UpdateStatus;
  autoApproved: boolean;
  autoApproveReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  holdingsSnapshotId?: number;
  monitoringRunId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonitoringRun {
  id: number;
  runType: 'hourly' | 'daily' | 'manual';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  status: MonitoringRunStatus;
  sourcesChecked: number;
  companiesChecked: number;
  updatesDetected: number;
  updatesAutoApproved: number;
  updatesPendingReview: number;
  notificationsSent: number;
  errorsCount: number;
  runLog?: string;
  errorDetails?: any;
  sourceStats?: Record<string, any>;
}

export interface Notification {
  id: number;
  notificationType: 'holdings_update' | 'stale_data' | 'discrepancy' | 'error' | 'run_summary' | 'early_signal';
  companyId?: number;
  pendingUpdateId?: number;
  monitoringRunId?: number;
  title: string;
  message: string;
  embedData?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channel: 'discord' | 'email' | 'slack';
  webhookUrl?: string;
  deliveredAt?: Date;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  deliveryResponse?: any;
  retryCount: number;
  dedupKey?: string;
  createdAt: Date;
}

// Source monitor result types
export interface SourceCheckResult {
  sourceType: string;
  companyId: number;
  ticker: string;
  asset: string;
  detectedHoldings?: number;
  confidence: number;
  sourceUrl?: string;
  sourceText?: string;
  sourceDate?: Date;
  trustLevel: SourceTrustLevel;
  error?: string;
  // Optional metadata for source-specific data (e.g., mNAV API returns mNAV, marketCap, etc.)
  metadata?: Record<string, unknown>;
}

// Early signal types - for pre-filing alerts (Twitter, on-chain)
export type EarlySignalType = 'twitter_announcement' | 'onchain_movement' | 'arkham_alert';

export interface EarlySignal {
  id?: number;
  companyId: number;
  ticker: string;
  asset: string;
  signalType: EarlySignalType;
  // What was detected
  description: string;
  estimatedHoldings?: number; // If we can estimate from the signal
  estimatedChange?: number;   // Estimated change in holdings
  // Source info
  sourceUrl?: string;
  sourceText?: string;
  sourceDate: Date;
  // For on-chain signals
  walletAddress?: string;
  transactionHash?: string;
  // Status
  status: 'pending_confirmation' | 'confirmed' | 'false_positive' | 'expired';
  confirmedByFilingId?: number; // Link to the SEC filing that confirmed this
  createdAt: Date;
  expiresAt?: Date; // Auto-expire if no confirmation within X days
}

export interface SECFilingResult {
  ticker: string;
  cik: string;
  filingType: '8-K' | '10-Q' | '10-K';
  filingDate: string;
  accessionNumber: string;
  documentUrl: string;
  containsCryptoTerms: boolean;
  rawContent?: string;
}

export interface TwitterMonitorResult {
  tweetId: string;
  accountHandle: string;
  companyId: number;
  content: string;
  postedAt: Date;
  mediaUrls?: string[];
  engagement?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

// LLM extraction types
export interface ExtractionResult {
  holdings: number | null;
  sharesOutstanding: number | null;
  // Dual-class share breakdown (for companies like XXI with Class A + Class B)
  classAShares: number | null;
  classBShares: number | null;
  costBasis: number | null;
  confidence: number;
  reasoning: string;
  extractedDate: string | null;
  rawNumbers: string[];
  // Transaction-based extraction (when total isn't explicitly stated)
  transactionType: 'purchase' | 'sale' | null;
  transactionAmount: number | null;
  holdingsExplicitlyStated: boolean;
}

export interface ExtractionContext {
  companyName: string;
  ticker: string;
  asset: string;
  currentHoldings: number;
  // For share extraction
  currentSharesOutstanding?: number;
  isDualClass?: boolean;
  shareClasses?: string[]; // e.g., ['Class A', 'Class B']
  // Filing context for targeted extraction
  formType?: string;        // '8-K', '40-F', '6-K', '10-Q', etc.
  itemCodes?: string[];     // 8-K item codes: ['7.01', '8.01']
}

// Approval decision
export interface ApprovalDecision {
  shouldAutoApprove: boolean;
  reason: string;
  requiredReviewLevel?: 'standard' | 'senior';
}

// Valid monitoring sources (ordered by trust level)
export const MONITORING_SOURCES = [
  // Primary sources (official/verified)
  'sec_edgar',               // SEC EDGAR filings (8-K, 10-Q, 10-K) - highest trust
  'international_exchanges', // CSE (Canada), HKEX (Hong Kong) - official exchange filings
  'holdings_pages',          // Direct holdings trackers (KULR tracker, Metaplanet, etc.)
  'mnav_api',                // mNAV.com API - real-time holdings for mid-tier treasury companies
  'sharplink_api',           // SharpLink dashboard API - SBET ETH holdings (official)
  'ir_pages',                // Company IR pages (press releases)
  // Early signal sources (pre-filing alerts)
  'twitter',                 // Twitter/X via Grok API - announcements before filings
  'arkham',                  // Arkham Intelligence - on-chain wallet monitoring
  // Aggregators (verification/fallback only)
  'aggregators',             // Aggregators (Bitbo, BitcoinTreasuries.net)
] as const;

export type MonitoringSource = typeof MONITORING_SOURCES[number];

// Monitoring config
export interface MonitoringConfig {
  runType: 'hourly' | 'daily' | 'manual';
  sources: MonitoringSource[];
  companyIds?: number[];
  dryRun?: boolean;
}

export interface MonitoringResult {
  runId: number;
  duration: number;
  sourcesChecked: number;
  companiesChecked: number;
  updatesDetected: number;
  updatesAutoApproved: number;
  updatesPendingReview: number;
  notificationsSent: number;
  errors: string[];
}
