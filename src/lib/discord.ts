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
 * Send a discrepancy summary report
 */
export async function sendDiscrepancySummary(
  discrepancies: Array<{
    ticker: string;
    field: string;
    ourValue: number;
    sourceValues: Record<string, { value: number; url: string }>;
    maxDeviationPct: number;
    severity: 'minor' | 'moderate' | 'major';
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

  // Group by severity
  const major = discrepancies.filter(d => d.severity === 'major');
  const moderate = discrepancies.filter(d => d.severity === 'moderate');
  const minor = discrepancies.filter(d => d.severity === 'minor');

  // Determine overall severity for color
  const overallSeverity = major.length > 0 ? 'error' : moderate.length > 0 ? 'warning' : 'info';

  // Format fields for embed
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  // Summary stats
  fields.push({
    name: 'Summary',
    value: [
      `**Major**: ${major.length}`,
      `**Moderate**: ${moderate.length}`,
      `**Minor**: ${minor.length}`,
    ].join('\n'),
    inline: true,
  });

  fields.push({
    name: 'Run Time',
    value: `${(runDuration / 1000).toFixed(1)}s`,
    inline: true,
  });

  // Major discrepancies (show details)
  if (major.length > 0) {
    const majorDetails = major.slice(0, 5).map(d => {
      const sourceName = Object.keys(d.sourceValues)[0];
      const sourceValue = d.sourceValues[sourceName]?.value;
      return `**${d.ticker}** ${d.field}: ours=${formatNumber(d.ourValue)} vs ${sourceName}=${formatNumber(sourceValue)} (${d.maxDeviationPct.toFixed(1)}%)`;
    }).join('\n');

    fields.push({
      name: `Major Discrepancies (>5%)`,
      value: majorDetails + (major.length > 5 ? `\n...and ${major.length - 5} more` : ''),
    });
  }

  // Moderate discrepancies (show brief)
  if (moderate.length > 0) {
    const moderateDetails = moderate.slice(0, 3).map(d =>
      `${d.ticker} ${d.field}: ${d.maxDeviationPct.toFixed(1)}%`
    ).join(', ');

    fields.push({
      name: `Moderate Discrepancies (1-5%)`,
      value: moderateDetails + (moderate.length > 3 ? ` ...+${moderate.length - 3} more` : ''),
    });
  }

  const embed: DiscordEmbed = {
    title: `Data Verification: ${discrepancies.length} Discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} Found`,
    color: COLORS[overallSeverity],
    fields,
  };

  return sendDiscordEmbed(embed);
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}
