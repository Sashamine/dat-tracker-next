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
  notificationType: 'holdings_update' | 'stale_data' | 'discrepancy' | 'error' | 'run_summary';
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
  costBasis: number | null;
  confidence: number;
  reasoning: string;
  extractedDate: string | null;
  rawNumbers: string[];
}

export interface ExtractionContext {
  companyName: string;
  ticker: string;
  asset: string;
  currentHoldings: number;
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
  'ir_pages',                // Company IR pages (press releases)
  // Secondary sources
  'twitter',                 // Twitter/X via Grok API
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
