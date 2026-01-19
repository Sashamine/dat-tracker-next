/**
 * Discord Notification Service
 * Sends formatted embeds to Discord webhooks for monitoring alerts
 */

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  url?: string;
  thumbnail?: {
    url: string;
  };
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// Embed colors
export const EMBED_COLORS = {
  success: 0x22c55e,    // Green - Holdings update applied
  warning: 0xeab308,    // Yellow - Stale data
  error: 0xef4444,      // Red - Errors
  info: 0x3b82f6,       // Blue - General info
  pending: 0xa855f7,    // Purple - Pending review
  discrepancy: 0xf97316, // Orange - Discrepancy detected
} as const;

// Asset emoji mapping
const ASSET_EMOJIS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  SOL: '◎',
  HYPE: '🔥',
  BNB: '🔶',
  TAO: '🧠',
  LINK: '⛓️',
  TRX: '🔺',
  XRP: '💧',
  ZEC: '🛡️',
  LTC: '🪙',
  SUI: '🌊',
  DOGE: '🐕',
  AVAX: '🔴',
  ADA: '🟢',
  HBAR: '⬡',
};

/**
 * Send a webhook payload to Discord
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string; response?: any }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'DAT Tracker',
        ...payload,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        success: false,
        error: `Discord webhook failed: ${response.status} ${text}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Discord webhook error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Format a number with appropriate precision
 */
function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/**
 * Format holdings with asset emoji
 */
function formatHoldings(holdings: number, asset: string): string {
  const emoji = ASSET_EMOJIS[asset] || '🪙';
  return `${emoji} ${formatNumber(holdings)} ${asset}`;
}

/**
 * Build embed for holdings update notification
 */
export function buildHoldingsUpdateEmbed(params: {
  companyName: string;
  ticker: string;
  asset: string;
  previousHoldings: number;
  newHoldings: number;
  sourceType: string;
  sourceUrl?: string;
  confidence: number;
  autoApproved: boolean;
  reasoning?: string;
}): DiscordEmbed {
  const {
    companyName,
    ticker,
    asset,
    previousHoldings,
    newHoldings,
    sourceType,
    sourceUrl,
    confidence,
    autoApproved,
    reasoning,
  } = params;

  const change = newHoldings - previousHoldings;
  const changePct = previousHoldings > 0 ? (change / previousHoldings) * 100 : 0;
  const isIncrease = change >= 0;

  const emoji = ASSET_EMOJIS[asset] || '🪙';
  const changeEmoji = isIncrease ? '📈' : '📉';

  return {
    title: `${emoji} Holdings Update: ${ticker}`,
    description: `**${companyName}** - New ${asset} holdings detected`,
    color: autoApproved ? EMBED_COLORS.success : EMBED_COLORS.pending,
    fields: [
      {
        name: 'Previous',
        value: formatHoldings(previousHoldings, asset),
        inline: true,
      },
      {
        name: 'New',
        value: formatHoldings(newHoldings, asset),
        inline: true,
      },
      {
        name: 'Change',
        value: `${changeEmoji} ${isIncrease ? '+' : ''}${formatNumber(change)} (${isIncrease ? '+' : ''}${changePct.toFixed(2)}%)`,
        inline: true,
      },
      {
        name: 'Source',
        value: sourceUrl ? `[${formatSourceType(sourceType)}](${sourceUrl})` : formatSourceType(sourceType),
        inline: true,
      },
      {
        name: 'Confidence',
        value: `${(confidence * 100).toFixed(0)}%`,
        inline: true,
      },
      {
        name: 'Status',
        value: autoApproved ? '✅ Auto-approved' : '⏳ Pending Review',
        inline: true,
      },
      ...(reasoning ? [{
        name: 'Extraction Notes',
        value: reasoning.length > 200 ? reasoning.substring(0, 197) + '...' : reasoning,
        inline: false,
      }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker Monitoring',
    },
  };
}

/**
 * Build embed for stale data alert
 */
export function buildStaleDataEmbed(params: {
  companies: Array<{
    ticker: string;
    asset: string;
    daysOld: number;
    source: string;
  }>;
}): DiscordEmbed {
  const { companies } = params;

  const fields = companies.slice(0, 15).map((c) => ({
    name: c.ticker,
    value: `${ASSET_EMOJIS[c.asset] || '🪙'} ${c.daysOld}d old (${c.source})`,
    inline: true,
  }));

  const remaining = companies.length - 15;

  return {
    title: '⚠️ Stale Data Alert',
    description: `**${companies.length}** companies have stale holdings data (>7 days)`,
    color: EMBED_COLORS.warning,
    fields: [
      ...fields,
      ...(remaining > 0 ? [{
        name: 'And more...',
        value: `+${remaining} other companies`,
        inline: false,
      }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker Monitoring',
    },
  };
}

/**
 * Build embed for discrepancy warning
 */
export function buildDiscrepancyEmbed(params: {
  companyName: string;
  ticker: string;
  asset: string;
  ourHoldings: number;
  externalHoldings: number;
  externalSource: string;
  discrepancyPct: number;
}): DiscordEmbed {
  const {
    companyName,
    ticker,
    asset,
    ourHoldings,
    externalHoldings,
    externalSource,
    discrepancyPct,
  } = params;

  const emoji = ASSET_EMOJIS[asset] || '🪙';

  return {
    title: `${emoji} Holdings Discrepancy: ${ticker}`,
    description: `**${companyName}** - Mismatch detected with external source`,
    color: EMBED_COLORS.discrepancy,
    fields: [
      {
        name: 'Our Data',
        value: formatHoldings(ourHoldings, asset),
        inline: true,
      },
      {
        name: 'External Data',
        value: formatHoldings(externalHoldings, asset),
        inline: true,
      },
      {
        name: 'Difference',
        value: `${discrepancyPct.toFixed(1)}%`,
        inline: true,
      },
      {
        name: 'External Source',
        value: externalSource,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker Monitoring',
    },
  };
}

/**
 * Build embed for monitoring run summary
 */
export function buildRunSummaryEmbed(params: {
  runType: string;
  duration: number;
  sourcesChecked: number;
  updatesDetected: number;
  updatesAutoApproved: number;
  updatesPendingReview: number;
  errors: number;
}): DiscordEmbed {
  const {
    runType,
    duration,
    sourcesChecked,
    updatesDetected,
    updatesAutoApproved,
    updatesPendingReview,
    errors,
  } = params;

  const status = errors > 0 ? '⚠️' : updatesDetected > 0 ? '✅' : '✓';

  return {
    title: `${status} Monitoring Run Complete`,
    description: `${runType.charAt(0).toUpperCase() + runType.slice(1)} scan finished in ${(duration / 1000).toFixed(1)}s`,
    color: errors > 0 ? EMBED_COLORS.warning : EMBED_COLORS.info,
    fields: [
      {
        name: 'Sources Checked',
        value: String(sourcesChecked),
        inline: true,
      },
      {
        name: 'Updates Found',
        value: String(updatesDetected),
        inline: true,
      },
      {
        name: 'Auto-Approved',
        value: String(updatesAutoApproved),
        inline: true,
      },
      {
        name: 'Pending Review',
        value: String(updatesPendingReview),
        inline: true,
      },
      ...(errors > 0 ? [{
        name: 'Errors',
        value: String(errors),
        inline: true,
      }] : []),
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker Monitoring',
    },
  };
}

/**
 * Build embed for error notification
 */
export function buildErrorEmbed(params: {
  title: string;
  error: string;
  context?: string;
}): DiscordEmbed {
  const { title, error, context } = params;

  return {
    title: `❌ ${title}`,
    description: error.length > 400 ? error.substring(0, 397) + '...' : error,
    color: EMBED_COLORS.error,
    fields: context ? [{
      name: 'Context',
      value: context,
      inline: false,
    }] : undefined,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker Monitoring',
    },
  };
}

/**
 * Build embed for early signal alert (pre-filing notification)
 */
export function buildEarlySignalEmbed(params: {
  companyName: string;
  ticker: string;
  asset: string;
  signalType: 'twitter_announcement' | 'onchain_movement' | 'arkham_alert';
  description: string;
  estimatedChange?: number;
  currentHoldings: number;
  sourceUrl?: string;
  sourceText?: string;
}): DiscordEmbed {
  const {
    companyName,
    ticker,
    asset,
    signalType,
    description,
    estimatedChange,
    currentHoldings,
    sourceUrl,
    sourceText,
  } = params;

  const emoji = ASSET_EMOJIS[asset] || '🪙';

  // Signal type icons
  const signalIcons: Record<string, string> = {
    twitter_announcement: '🐦',
    onchain_movement: '⛓️',
    arkham_alert: '🔍',
  };
  const signalIcon = signalIcons[signalType] || '📡';

  const signalLabels: Record<string, string> = {
    twitter_announcement: 'Twitter Announcement',
    onchain_movement: 'On-Chain Movement',
    arkham_alert: 'Arkham Alert',
  };

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    {
      name: 'Signal Type',
      value: `${signalIcon} ${signalLabels[signalType] || signalType}`,
      inline: true,
    },
    {
      name: 'Current Holdings',
      value: `${emoji} ${formatNumber(currentHoldings)} ${asset}`,
      inline: true,
    },
  ];

  if (estimatedChange) {
    const changeEmoji = estimatedChange >= 0 ? '📈' : '📉';
    fields.push({
      name: 'Est. Change',
      value: `${changeEmoji} ${estimatedChange >= 0 ? '+' : ''}${formatNumber(estimatedChange)} ${asset}`,
      inline: true,
    });
  }

  if (sourceUrl) {
    fields.push({
      name: 'Source',
      value: `[View Source](${sourceUrl})`,
      inline: true,
    });
  }

  if (sourceText) {
    fields.push({
      name: 'Details',
      value: sourceText.length > 300 ? sourceText.substring(0, 297) + '...' : sourceText,
      inline: false,
    });
  }

  fields.push({
    name: 'Status',
    value: '⏳ Awaiting official confirmation (SEC filing)',
    inline: false,
  });

  return {
    title: `${signalIcon} Early Signal: ${ticker}`,
    description: `**${companyName}** - ${description}`,
    color: 0x00d4ff, // Cyan color for early signals
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'DAT Tracker - Early Signal (Unconfirmed)',
    },
  };
}

/**
 * Format source type for display
 */
function formatSourceType(sourceType: string): string {
  const labels: Record<string, string> = {
    sec_8k: 'SEC 8-K Filing',
    sec_10q: 'SEC 10-Q Filing',
    sec_10k: 'SEC 10-K Filing',
    twitter: 'Twitter/X',
    ir_page: 'IR Page',
    press_release: 'Press Release',
  };
  return labels[sourceType] || sourceType;
}

/**
 * High-level notification functions
 */
export class DiscordNotificationService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendHoldingsUpdate(params: Parameters<typeof buildHoldingsUpdateEmbed>[0]) {
    const embed = buildHoldingsUpdateEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendStaleDataAlert(params: Parameters<typeof buildStaleDataEmbed>[0]) {
    const embed = buildStaleDataEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendDiscrepancyWarning(params: Parameters<typeof buildDiscrepancyEmbed>[0]) {
    const embed = buildDiscrepancyEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendRunSummary(params: Parameters<typeof buildRunSummaryEmbed>[0]) {
    const embed = buildRunSummaryEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendError(params: Parameters<typeof buildErrorEmbed>[0]) {
    const embed = buildErrorEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendEarlySignal(params: Parameters<typeof buildEarlySignalEmbed>[0]) {
    const embed = buildEarlySignalEmbed(params);
    return sendDiscordWebhook(this.webhookUrl, { embeds: [embed] });
  }

  async sendCustom(payload: DiscordWebhookPayload) {
    return sendDiscordWebhook(this.webhookUrl, payload);
  }
}

/**
 * Create notification service from environment
 */
export function createDiscordNotificationService(): DiscordNotificationService | null {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('DISCORD_WEBHOOK_URL not set - notifications disabled');
    return null;
  }
  return new DiscordNotificationService(webhookUrl);
}
