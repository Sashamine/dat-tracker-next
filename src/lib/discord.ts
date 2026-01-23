/**
 * Discord Webhook Notifications
 *
 * Simple Discord webhook integration for sending alerts about data discrepancies
 * and verification system results.
 */

export type Severity = 'info' | 'warning' | 'error';

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// Discord embed colors
const COLORS = {
  info: 0x3498db,     // Blue
  warning: 0xf39c12,  // Orange
  error: 0xe74c3c,    // Red
  success: 0x2ecc71,  // Green
} as const;

/**
 * Send a simple text alert to Discord
 */
export async function sendDiscordAlert(
  title: string,
  message: string,
  severity: Severity = 'info'
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Discord] No DISCORD_WEBHOOK_URL configured, skipping notification');
    return false;
  }

  const payload: DiscordWebhookPayload = {
    username: 'DAT Tracker',
    embeds: [{
      title,
      description: message,
      color: COLORS[severity],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'DAT Tracker Verification System',
      },
    }],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Discord] Failed to send alert: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`[Discord] Alert sent: ${title}`);
    return true;
  } catch (error) {
    console.error('[Discord] Error sending alert:', error);
    return false;
  }
}

/**
 * Send a rich embed with multiple fields (for discrepancy reports)
 */
export async function sendDiscordEmbed(embed: DiscordEmbed): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Discord] No DISCORD_WEBHOOK_URL configured, skipping notification');
    return false;
  }

  const payload: DiscordWebhookPayload = {
    username: 'DAT Tracker',
    embeds: [{
      ...embed,
      timestamp: embed.timestamp ?? new Date().toISOString(),
      footer: embed.footer ?? { text: 'DAT Tracker Verification System' },
    }],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[Discord] Failed to send embed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`[Discord] Embed sent: ${embed.title}`);
    return true;
  } catch (error) {
    console.error('[Discord] Error sending embed:', error);
    return false;
  }
}

/**
 * Verification status from source-verifier (Phase 7b)
 */
type VerificationStatus = 'verified' | 'source_drift' | 'source_invalid' | 'source_available' | 'unverified';

/**
 * Confidence level from confidence-scorer (Phase 7c)
 */
type ConfidenceLevel = 'high' | 'medium' | 'low';
type RecommendedAction = 'auto_confirm' | 'review_conflict' | 'review_unverified' | 'log_external_error';

/**
 * Get the base URL for links (Vercel deployment URL or fallback)
 */
function getBaseUrl(): string {
  // In Vercel, VERCEL_URL is set to the deployment URL (without protocol)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Fallback to production URL
  return 'https://dat-tracker-next.vercel.app';
}

/**
 * Send a discrepancy summary report (simplified - just counts + link)
 */
export async function sendDiscrepancySummary(
  discrepancies: Array<{
    ticker: string;
    field: string;
    ourValue: number;
    sourceValues: Record<string, { value: number; url: string }>;
    maxDeviationPct: number;
    severity: 'minor' | 'moderate' | 'major';
    verification?: {
      status: VerificationStatus;
      sourceFetchedValue?: number;
    };
    confidence?: {
      level: ConfidenceLevel;
      action: RecommendedAction;
      reason: string;
    };
  }>,
  runDuration: number
): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Discord] No DISCORD_WEBHOOK_URL configured, skipping notification');
    return false;
  }

  // Skip if no discrepancies
  if (discrepancies.length === 0) {
    return true;
  }

  // Count by severity
  const major = discrepancies.filter(d => d.severity === 'major').length;
  const moderate = discrepancies.filter(d => d.severity === 'moderate').length;
  const minor = discrepancies.filter(d => d.severity === 'minor').length;

  // Count needs review
  const needsReview = discrepancies.filter(
    d => d.confidence?.action === 'review_conflict' || d.confidence?.action === 'review_unverified'
  ).length;

  // Determine color based on severity
  const color = major > 0 ? COLORS.error : moderate > 0 ? COLORS.warning : COLORS.info;

  // Build simple summary
  const reviewUrl = `${getBaseUrl()}/discrepancies`;

  const embed: DiscordEmbed = {
    title: `${discrepancies.length} Discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} Found`,
    description: [
      `**${major}** major · **${moderate}** moderate · **${minor}** minor`,
      '',
      needsReview > 0 ? `**${needsReview} need review**` : 'All auto-confirmed',
      '',
      `[View Details](${reviewUrl})`,
    ].join('\n'),
    color,
  };

  return sendDiscordEmbed(embed);
}

