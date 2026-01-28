/**
 * Monitoring & Alerting
 * 
 * Centralized alerting for silent failures, extraction issues,
 * and system health. Sends to Discord and logs for persistence.
 * 
 * Priority 2 from sec-monitor-optimizations.md
 */

import { sendDiscordAlert } from '../discord';

// ============================================
// TYPES
// ============================================

export interface ExtractionRunStats {
  startTime: Date;
  endTime?: Date;
  companiesChecked: number;
  
  // Extraction stats
  xbrlAttempted: number;
  xbrlSuccess: number;
  xbrlFailed: number;
  
  llmAttempted: number;
  llmSuccess: number;
  llmFailed: number;
  llmSkipped: number;  // Skipped due to missing config
  llmSkipReason?: string;
  
  // Results
  updated: number;
  needsReview: number;
  unchanged: number;
  errors: string[];
}

export interface AlertConfig {
  discordEnabled: boolean;
  alertOnLlmSkip: boolean;
  alertOnErrors: boolean;
  alertOnSuccess: boolean;
  minErrorsToAlert: number;
}

// Default config
const DEFAULT_CONFIG: AlertConfig = {
  discordEnabled: true,
  alertOnLlmSkip: true,
  alertOnErrors: true,
  alertOnSuccess: false,  // Only alert on issues by default
  minErrorsToAlert: 1,
};

// ============================================
// STATE TRACKING
// ============================================

let currentRunStats: ExtractionRunStats | null = null;
let llmConfigWarningShown = false;  // Only warn once per process lifetime

/**
 * Start tracking a new extraction run
 */
export function startExtractionRun(): ExtractionRunStats {
  currentRunStats = {
    startTime: new Date(),
    companiesChecked: 0,
    xbrlAttempted: 0,
    xbrlSuccess: 0,
    xbrlFailed: 0,
    llmAttempted: 0,
    llmSuccess: 0,
    llmFailed: 0,
    llmSkipped: 0,
    updated: 0,
    needsReview: 0,
    unchanged: 0,
    errors: [],
  };
  return currentRunStats;
}

/**
 * Get current run stats
 */
export function getCurrentRunStats(): ExtractionRunStats | null {
  return currentRunStats;
}

/**
 * Record XBRL extraction attempt
 */
export function recordXbrlAttempt(success: boolean, error?: string): void {
  if (!currentRunStats) return;
  currentRunStats.xbrlAttempted++;
  if (success) {
    currentRunStats.xbrlSuccess++;
  } else {
    currentRunStats.xbrlFailed++;
    if (error) currentRunStats.errors.push(`XBRL: ${error}`);
  }
}

/**
 * Record LLM extraction attempt
 */
export function recordLlmAttempt(success: boolean, error?: string): void {
  if (!currentRunStats) return;
  currentRunStats.llmAttempted++;
  if (success) {
    currentRunStats.llmSuccess++;
  } else {
    currentRunStats.llmFailed++;
    if (error) currentRunStats.errors.push(`LLM: ${error}`);
  }
}

/**
 * Record LLM extraction skipped (no config)
 */
export function recordLlmSkipped(reason: string): void {
  if (!currentRunStats) return;
  currentRunStats.llmSkipped++;
  currentRunStats.llmSkipReason = reason;
}

/**
 * Record extraction result
 */
export function recordResult(type: 'updated' | 'needsReview' | 'unchanged' | 'error', errorMsg?: string): void {
  if (!currentRunStats) return;
  currentRunStats.companiesChecked++;
  
  switch (type) {
    case 'updated':
      currentRunStats.updated++;
      break;
    case 'needsReview':
      currentRunStats.needsReview++;
      break;
    case 'unchanged':
      currentRunStats.unchanged++;
      break;
    case 'error':
      if (errorMsg) currentRunStats.errors.push(errorMsg);
      break;
  }
}

// ============================================
// ALERTS
// ============================================

/**
 * Alert when LLM extraction is skipped due to missing config
 * Only alerts once per process lifetime to avoid spam
 */
export async function alertLlmConfigMissing(provider: string): Promise<void> {
  if (llmConfigWarningShown) return;
  llmConfigWarningShown = true;
  
  const envVar = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GROK_API_KEY';
  
  console.warn(`[Monitoring] LLM extraction disabled - missing ${envVar}`);
  
  await sendDiscordAlert(
    '⚠️ LLM Extraction Disabled',
    `SEC monitoring is running without LLM extraction.\n\n` +
    `**Reason:** Missing \`${envVar}\` environment variable\n` +
    `**Impact:** 8-K filings will only be processed via XBRL (10-K/10-Q data)\n\n` +
    `Set \`${envVar}\` to enable LLM-based 8-K text extraction.`,
    'warning'
  );
}

/**
 * Alert on extraction errors
 */
export async function alertExtractionErrors(errors: string[], context: string): Promise<void> {
  if (errors.length === 0) return;
  
  const errorList = errors.slice(0, 10).map(e => `• ${e}`).join('\n');
  const moreCount = errors.length > 10 ? `\n_...and ${errors.length - 10} more_` : '';
  
  await sendDiscordAlert(
    '🔴 SEC Extraction Errors',
    `**Context:** ${context}\n\n${errorList}${moreCount}`,
    'error'
  );
}

/**
 * Send summary alert for extraction run
 */
export async function alertRunSummary(
  stats: ExtractionRunStats,
  config: Partial<AlertConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  stats.endTime = new Date();
  const duration = Math.round((stats.endTime.getTime() - stats.startTime.getTime()) / 1000);
  
  // Determine if we should alert
  const hasErrors = stats.errors.length >= cfg.minErrorsToAlert;
  const hasLlmSkip = stats.llmSkipped > 0 && cfg.alertOnLlmSkip;
  const shouldAlert = hasErrors || hasLlmSkip || cfg.alertOnSuccess;
  
  if (!shouldAlert || !cfg.discordEnabled) {
    console.log(`[Monitoring] Run complete: ${stats.updated} updated, ${stats.errors.length} errors, ${duration}s`);
    return;
  }
  
  // Build summary message
  const parts: string[] = [];
  
  // Stats
  parts.push(`**Companies checked:** ${stats.companiesChecked}`);
  parts.push(`**Duration:** ${duration}s`);
  parts.push('');
  
  // Extraction breakdown
  if (stats.xbrlAttempted > 0) {
    parts.push(`**XBRL:** ${stats.xbrlSuccess}/${stats.xbrlAttempted} successful`);
  }
  if (stats.llmAttempted > 0) {
    parts.push(`**LLM:** ${stats.llmSuccess}/${stats.llmAttempted} successful`);
  }
  if (stats.llmSkipped > 0) {
    parts.push(`**LLM Skipped:** ${stats.llmSkipped} (${stats.llmSkipReason || 'no config'})`);
  }
  parts.push('');
  
  // Results
  parts.push(`**Updated:** ${stats.updated}`);
  parts.push(`**Needs Review:** ${stats.needsReview}`);
  parts.push(`**Unchanged:** ${stats.unchanged}`);
  
  // Errors
  if (stats.errors.length > 0) {
    parts.push('');
    parts.push(`**Errors (${stats.errors.length}):**`);
    const errorList = stats.errors.slice(0, 5).map(e => `• ${e}`).join('\n');
    parts.push(errorList);
    if (stats.errors.length > 5) {
      parts.push(`_...and ${stats.errors.length - 5} more_`);
    }
  }
  
  const severity = stats.errors.length > 0 ? 'warning' : 'info';
  const emoji = stats.errors.length > 0 ? '⚠️' : '✅';
  
  await sendDiscordAlert(
    `${emoji} SEC Extraction Run Complete`,
    parts.join('\n'),
    severity
  );
}

/**
 * Alert for specific critical failures
 */
export async function alertCriticalFailure(
  title: string,
  details: string,
  context?: Record<string, string>
): Promise<void> {
  let message = details;
  
  if (context) {
    const contextLines = Object.entries(context)
      .map(([k, v]) => `**${k}:** ${v}`)
      .join('\n');
    message = `${details}\n\n${contextLines}`;
  }
  
  await sendDiscordAlert(`🚨 ${title}`, message, 'error');
}

// ============================================
// HEALTH CHECK
// ============================================

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
  }[];
}

/**
 * Run health checks on extraction system
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult['checks'] = [];
  
  // Check LLM config
  const provider = process.env.MONITORING_LLM_PROVIDER || 'anthropic';
  const llmKey = provider === 'anthropic' 
    ? process.env.ANTHROPIC_API_KEY 
    : process.env.GROK_API_KEY;
  
  checks.push({
    name: 'LLM API Key',
    status: llmKey ? 'pass' : 'warn',
    message: llmKey ? `${provider} configured` : `Missing ${provider} API key - LLM extraction disabled`,
  });
  
  // Check Discord webhook
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  checks.push({
    name: 'Discord Webhook',
    status: discordWebhook ? 'pass' : 'warn',
    message: discordWebhook ? 'Configured' : 'Not configured - alerts will only go to logs',
  });
  
  // Check database (basic)
  // TODO: Add actual DB connection check
  checks.push({
    name: 'Database',
    status: process.env.DATABASE_URL ? 'pass' : 'fail',
    message: process.env.DATABASE_URL ? 'Connection string present' : 'Missing DATABASE_URL',
  });
  
  const healthy = checks.every(c => c.status !== 'fail');
  
  return { healthy, checks };
}

/**
 * Format health check for display
 */
export function formatHealthCheck(result: HealthCheckResult): string {
  const lines = result.checks.map(c => {
    const icon = c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
    return `${icon} **${c.name}:** ${c.message || c.status}`;
  });
  
  return lines.join('\n');
}
