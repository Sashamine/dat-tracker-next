/**
 * HKEX Filing Monitor
 *
 * Monitors for new HKEX filings by:
 * 1. Probing known URL patterns for new documents
 * 2. Tracking last known filing dates
 * 3. Alerting when new filings are detected
 *
 * Run via cron or scheduled task to check for updates.
 */

import {
  HKEX_DAT_COMPANIES,
  HKEXFiling,
  buildFilingUrl,
  checkFilingExists,
  getKnownFilings,
} from './hkex';
import { extractBoyaaFiling, ExtractedHKEXData } from './hkex-pdf-extractor';

export interface MonitorConfig {
  stockCodes: string[];
  lookbackDays: number;      // How many days back to check
  lookforwardDays: number;   // How many days forward to check
  notifyWebhook?: string;    // Discord/Slack webhook for alerts
  extractData?: boolean;     // Whether to extract data from new filings
  apiKey?: string;           // Anthropic API key for extraction
}

export interface NewFilingAlert {
  stockCode: string;
  companyName: string;
  url: string;
  date: string;
  detectedAt: string;
  extractedData?: ExtractedHKEXData;
}

// Common document ID suffixes for different companies
const DOC_ID_SUFFIXES: Record<string, string[]> = {
  '434': ['00291', '00292', '00293'],  // Boyaa typically uses 00291
  'default': ['00001', '00002', '00003', '00291', '00292'],
};

/**
 * Generate date range for probing
 */
function getDateRange(lookbackDays: number, lookforwardDays: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = -lookbackDays; i <= lookforwardDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  
  return dates;
}

/**
 * Generate potential filing URLs for a stock code and date range
 */
function generateProbeUrls(stockCode: string, dates: Date[]): string[] {
  const urls: string[] = [];
  const suffixes = DOC_ID_SUFFIXES[stockCode] || DOC_ID_SUFFIXES['default'];

  for (const date of dates) {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const monthDay = `${month}${day}`;

    for (const suffix of suffixes) {
      const docId = `${year}${monthDay}${suffix}`;
      urls.push(buildFilingUrl(year, monthDay, docId));
    }
  }

  return urls;
}

/**
 * Check if a filing URL is already known
 */
function isKnownFiling(url: string, knownFilings: HKEXFiling[]): boolean {
  return knownFilings.some(f => f.url === url);
}

/**
 * Probe for new filings
 */
export async function probeForNewFilings(
  stockCode: string,
  config: Partial<MonitorConfig> = {}
): Promise<string[]> {
  const { lookbackDays = 7, lookforwardDays = 1 } = config;
  
  const dates = getDateRange(lookbackDays, lookforwardDays);
  const probeUrls = generateProbeUrls(stockCode, dates);
  const knownFilings = getKnownFilings(stockCode);
  
  const newFilings: string[] = [];

  // Probe URLs in parallel (with concurrency limit)
  const CONCURRENCY = 5;
  for (let i = 0; i < probeUrls.length; i += CONCURRENCY) {
    const batch = probeUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (url) => {
        if (isKnownFiling(url, knownFilings)) return null;
        const exists = await checkFilingExists(url);
        return exists ? url : null;
      })
    );
    
    for (const url of results) {
      if (url) newFilings.push(url);
    }
  }

  return newFilings;
}

/**
 * Send alert to webhook (Discord/Slack compatible)
 */
async function sendWebhookAlert(
  webhookUrl: string,
  alert: NewFilingAlert
): Promise<void> {
  try {
    const message = {
      content: null,
      embeds: [{
        title: `📄 New HKEX Filing Detected`,
        description: `**${alert.companyName}** (${alert.stockCode}.HK)`,
        color: 0x00ff00,
        fields: [
          { name: 'Date', value: alert.date, inline: true },
          { name: 'Detected', value: alert.detectedAt, inline: true },
          { name: 'URL', value: `[View Filing](${alert.url})` },
        ],
        ...(alert.extractedData?.btcHoldings && {
          fields: [
            { name: 'Date', value: alert.date, inline: true },
            { name: 'Detected', value: alert.detectedAt, inline: true },
            { name: 'BTC Holdings', value: alert.extractedData.btcHoldings.toLocaleString(), inline: true },
            { name: 'URL', value: `[View Filing](${alert.url})` },
          ],
        }),
      }],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Failed to send webhook alert:', error);
  }
}

/**
 * Run the monitor for all configured companies
 */
export async function runMonitor(config: MonitorConfig): Promise<NewFilingAlert[]> {
  const alerts: NewFilingAlert[] = [];
  const now = new Date().toISOString();

  for (const stockCode of config.stockCodes) {
    const companyInfo = Object.values(HKEX_DAT_COMPANIES).find(
      c => c.stockCode === stockCode
    );
    const companyName = companyInfo?.name || `Stock ${stockCode}`;

    console.log(`[HKEX Monitor] Checking ${companyName} (${stockCode}.HK)...`);

    try {
      const newFilings = await probeForNewFilings(stockCode, config);

      for (const url of newFilings) {
        // Extract date from URL
        const match = url.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
        const date = match 
          ? `${match[1]}-${match[2]}-${match[3]}`
          : 'Unknown';

        const alert: NewFilingAlert = {
          stockCode,
          companyName,
          url,
          date,
          detectedAt: now,
        };

        // Optionally extract data from the filing
        if (config.extractData && config.apiKey) {
          console.log(`[HKEX Monitor] Extracting data from ${url}...`);
          const extracted = await extractBoyaaFiling(url, { apiKey: config.apiKey });
          if (extracted) {
            alert.extractedData = extracted;
          }
        }

        alerts.push(alert);

        // Send webhook notification
        if (config.notifyWebhook) {
          await sendWebhookAlert(config.notifyWebhook, alert);
        }

        console.log(`[HKEX Monitor] New filing found: ${url}`);
      }
    } catch (error) {
      console.error(`[HKEX Monitor] Error checking ${stockCode}:`, error);
    }
  }

  return alerts;
}

/**
 * Default monitor configuration
 * Currently focused on Boyaa - other HK companies TBD
 */
export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  stockCodes: [
    '434',   // Boyaa Interactive - BTC treasury (ACTIVE)
    // TODO: Add these later:
    // '1357',  // Meitu - BTC/ETH
    // '2369',  // Coolpad - BTC
    // '1611',  // New Huo Technology - Multi
    // '863',   // BC Technology (OSL) - Multi
  ],
  lookbackDays: 7,
  lookforwardDays: 1,
  extractData: false,
};

/**
 * CLI-friendly monitor runner
 */
export async function main() {
  const config: MonitorConfig = {
    ...DEFAULT_MONITOR_CONFIG,
    notifyWebhook: process.env.DISCORD_WEBHOOK_URL,
    extractData: !!process.env.ANTHROPIC_API_KEY,
    apiKey: process.env.ANTHROPIC_API_KEY,
  };

  console.log('[HKEX Monitor] Starting...');
  console.log(`[HKEX Monitor] Checking stocks: ${config.stockCodes.join(', ')}`);

  const alerts = await runMonitor(config);

  if (alerts.length === 0) {
    console.log('[HKEX Monitor] No new filings found.');
  } else {
    console.log(`[HKEX Monitor] Found ${alerts.length} new filing(s).`);
    for (const alert of alerts) {
      console.log(`  - ${alert.companyName}: ${alert.url}`);
      if (alert.extractedData?.btcHoldings) {
        console.log(`    BTC: ${alert.extractedData.btcHoldings.toLocaleString()}`);
      }
    }
  }

  return alerts;
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default {
  probeForNewFilings,
  runMonitor,
  main,
  DEFAULT_MONITOR_CONFIG,
};
