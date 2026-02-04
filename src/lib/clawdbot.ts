/**
 * Clawdbot Integration
 *
 * Direct integration with Clawdbot Gateway to trigger actions
 * when important notifications occur (new filings, discrepancies, etc.)
 */

interface ClawdbotMessage {
  text: string;
  channel?: string;
  sessionKey?: string;
}

/**
 * Send a message to Clawdbot to trigger action
 * Uses the Gateway's wake endpoint or session send
 */
export async function notifyClawdbot(message: string): Promise<boolean> {
  const gatewayUrl = process.env.CLAWDBOT_GATEWAY_URL;
  const gatewayToken = process.env.CLAWDBOT_GATEWAY_TOKEN;

  if (!gatewayUrl || !gatewayToken) {
    console.log('[Clawdbot] No CLAWDBOT_GATEWAY_URL or CLAWDBOT_GATEWAY_TOKEN configured, skipping');
    return false;
  }

  try {
    // Use the cron wake endpoint to send a message to Clawdbot
    const response = await fetch(`${gatewayUrl}/api/cron/wake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        text: message,
        mode: 'now',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Clawdbot] Failed to notify: ${response.status} ${errorText}`);
      return false;
    }

    console.log(`[Clawdbot] Notification sent successfully`);
    return true;
  } catch (error) {
    console.error('[Clawdbot] Error sending notification:', error);
    return false;
  }
}

/**
 * Notify Clawdbot about new SEC filings that need review
 */
export async function notifyNewFilings(
  filings: Array<{ ticker: string; formType: string; items?: string[] }>
): Promise<boolean> {
  if (filings.length === 0) return true;

  const filingList = filings
    .map(f => {
      const items = f.items?.length ? ` [${f.items.join(',')}]` : '';
      return `- ${f.ticker}: ${f.formType}${items}`;
    })
    .join('\n');

  const message = `🔔 **New SEC Filings Detected**

${filings.length} new filing(s) need review:

${filingList}

Please check these filings and update holdings data if needed.`;

  return notifyClawdbot(message);
}

/**
 * Notify Clawdbot about discrepancies needing review
 */
export async function notifyDiscrepancies(
  count: number,
  majorCount: number,
  needsReviewCount: number
): Promise<boolean> {
  if (count === 0) return true;

  const message = `⚠️ **Data Discrepancies Found**

${count} discrepancies detected:
- ${majorCount} major (>5% deviation)
- ${needsReviewCount} need manual review

Please review at /discrepancies`;

  return notifyClawdbot(message);
}
