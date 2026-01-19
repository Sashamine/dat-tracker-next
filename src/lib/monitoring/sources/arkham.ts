/**
 * Arkham Intelligence Monitor
 * Scrapes public entity pages for on-chain wallet data
 *
 * Note: This uses public web scraping. When API access is available,
 * this should be updated to use the official API.
 */

import { EarlySignal, SourceCheckResult } from '../types';

// Arkham entity URL patterns
const ARKHAM_BASE_URL = 'https://intel.arkm.com';
const ARKHAM_API_URL = 'https://api.arkm.com';

// Cache for entity data (15 min TTL)
interface ArkhamCache {
  data: ArkhamEntityData;
  timestamp: number;
}
const entityCache = new Map<string, ArkhamCache>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface ArkhamEntityData {
  entityId: string;
  name: string;
  holdings: {
    btc?: number;
    eth?: number;
    totalValueUsd?: number;
  };
  wallets?: string[];
  lastUpdated?: Date;
}

export interface ArkhamHoldingsChange {
  entityId: string;
  ticker: string;
  asset: string;
  previousHoldings: number;
  currentHoldings: number;
  changeAmount: number;
  changePct: number;
  detectedAt: Date;
}

// Known company entity mappings on Arkham
// Format: ticker -> Arkham entity slug
export const ARKHAM_ENTITY_MAP: Record<string, string> = {
  'MSTR': 'microstrategy',
  'MARA': 'marathon-digital',
  'RIOT': 'riot-platforms',
  'CLSK': 'cleanspark',
  'COIN': 'coinbase',
  'BITF': 'bitfarms',
  'HUT': 'hut-8',
  'CIFR': 'cipher-mining',
  'BTBT': 'bit-digital',
  'CORZ': 'core-scientific',
  'WULF': 'terawulf',
  'IREN': 'iris-energy',
  // Add more as needed
};

/**
 * Fetch entity data from Arkham's public page
 */
async function fetchArkhamEntity(entitySlug: string): Promise<ArkhamEntityData | null> {
  // Check cache first
  const cached = entityCache.get(entitySlug);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${ARKHAM_BASE_URL}/explorer/entity/${entitySlug}`;
    console.log(`[Arkham] Fetching entity: ${entitySlug}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`[Arkham] Failed to fetch ${entitySlug}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const data = parseArkhamEntityPage(html, entitySlug);

    if (data) {
      entityCache.set(entitySlug, { data, timestamp: Date.now() });
    }

    return data;
  } catch (error) {
    console.error(`[Arkham] Error fetching ${entitySlug}:`, error);
    return null;
  }
}

/**
 * Parse Arkham entity page HTML for holdings data
 */
function parseArkhamEntityPage(html: string, entitySlug: string): ArkhamEntityData | null {
  const data: ArkhamEntityData = {
    entityId: entitySlug,
    name: entitySlug,
    holdings: {},
  };

  // Try to extract from JSON-LD or embedded data
  // Arkham pages often have data in __NEXT_DATA__ script tags
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      // Navigate the Next.js data structure to find entity info
      const pageProps = nextData?.props?.pageProps;
      if (pageProps?.entity) {
        data.name = pageProps.entity.name || entitySlug;
        // Extract holdings if available in the data
        if (pageProps.entity.holdings) {
          data.holdings = pageProps.entity.holdings;
        }
      }
    } catch {
      // Fall back to regex parsing
    }
  }

  // Regex patterns to extract BTC holdings
  const btcPatterns = [
    // "holds approximately 415,230 Bitcoin"
    /holds?\s+(?:approximately\s+)?([\d,]+(?:\.\d+)?)\s*(?:bitcoin|btc)/i,
    // "415,230 BTC" or "415,230 Bitcoin"
    /([\d,]+(?:\.\d+)?)\s*(?:btc|bitcoin)(?:\s|$|,|\))/i,
    // "Bitcoin (BTC): 415,230"
    /bitcoin\s*\(?btc\)?[:\s]+([\d,]+(?:\.\d+)?)/i,
    // Data attribute or JSON value patterns
    /"(?:btc|bitcoin)"[:\s]+([\d,]+(?:\.\d+)?)/i,
    /total_btc[:\s"']+([\d,]+(?:\.\d+)?)/i,
  ];

  for (const pattern of btcPatterns) {
    const match = html.match(pattern);
    if (match) {
      const btcAmount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(btcAmount) && btcAmount > 0) {
        data.holdings.btc = btcAmount;
        break;
      }
    }
  }

  // Try to extract USD value
  const usdPatterns = [
    /\$([\d,]+(?:\.\d+)?)\s*(?:billion|B)\s*(?:USD)?/i,
    /valued?\s+(?:at\s+)?\$([\d,]+(?:\.\d+)?)\s*(?:billion|B)/i,
  ];

  for (const pattern of usdPatterns) {
    const match = html.match(pattern);
    if (match) {
      const usdBillions = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(usdBillions)) {
        data.holdings.totalValueUsd = usdBillions * 1_000_000_000;
        break;
      }
    }
  }

  // Extract wallet addresses if visible
  const walletPattern = /\b(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
  const wallets = html.match(walletPattern);
  if (wallets) {
    data.wallets = [...new Set(wallets)]; // Dedupe
  }

  // Only return if we got some holdings data
  if (data.holdings.btc || data.holdings.eth || data.holdings.totalValueUsd) {
    return data;
  }

  return null;
}

/**
 * Check Arkham for holdings changes (early signal detection)
 */
export async function checkArkhamForChanges(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>
): Promise<EarlySignal[]> {
  const signals: EarlySignal[] = [];

  for (const company of companies) {
    // Only check BTC companies for now (Arkham primarily tracks BTC)
    if (company.asset !== 'BTC') continue;

    const entitySlug = ARKHAM_ENTITY_MAP[company.ticker];
    if (!entitySlug) continue;

    console.log(`[Arkham] Checking ${company.ticker} (${entitySlug})...`);

    const arkhamData = await fetchArkhamEntity(entitySlug);
    if (!arkhamData || !arkhamData.holdings.btc) {
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
      continue;
    }

    const arkhamHoldings = arkhamData.holdings.btc;
    const difference = arkhamHoldings - company.holdings;
    const diffPct = Math.abs(difference / company.holdings) * 100;

    // Only flag if there's a meaningful difference (>1%)
    if (diffPct > 1) {
      const isIncrease = difference > 0;

      signals.push({
        companyId: company.id,
        ticker: company.ticker,
        asset: company.asset,
        signalType: 'arkham_alert',
        description: isIncrease
          ? `Arkham shows ${formatNumber(difference)} BTC increase (${diffPct.toFixed(1)}% change)`
          : `Arkham shows ${formatNumber(Math.abs(difference))} BTC decrease (${diffPct.toFixed(1)}% change)`,
        estimatedHoldings: arkhamHoldings,
        estimatedChange: difference,
        sourceUrl: `${ARKHAM_BASE_URL}/explorer/entity/${entitySlug}`,
        sourceText: `Arkham Intelligence reports ${formatNumber(arkhamHoldings)} BTC for ${company.name}. Our data shows ${formatNumber(company.holdings)} BTC.`,
        sourceDate: new Date(),
        status: 'pending_confirmation',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire in 7 days
      });
    }

    // Rate limit between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  return signals;
}

/**
 * Get Arkham data for a single company
 */
export async function getArkhamHoldings(ticker: string): Promise<ArkhamEntityData | null> {
  const entitySlug = ARKHAM_ENTITY_MAP[ticker];
  if (!entitySlug) {
    console.warn(`[Arkham] No entity mapping for ticker: ${ticker}`);
    return null;
  }

  return fetchArkhamEntity(entitySlug);
}

/**
 * Convert Arkham signals to SourceCheckResults for the monitoring pipeline
 * (for verification purposes, not as primary source)
 */
export async function checkArkhamForUpdates(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  for (const company of companies) {
    if (company.asset !== 'BTC') continue;

    const entitySlug = ARKHAM_ENTITY_MAP[company.ticker];
    if (!entitySlug) continue;

    const arkhamData = await fetchArkhamEntity(entitySlug);
    if (!arkhamData || !arkhamData.holdings.btc) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const arkhamHoldings = arkhamData.holdings.btc;
    const diffPct = Math.abs(arkhamHoldings - company.holdings) / company.holdings * 100;

    // Only report if difference > 1%
    if (diffPct > 1) {
      results.push({
        sourceType: 'arkham',
        companyId: company.id,
        ticker: company.ticker,
        asset: company.asset,
        detectedHoldings: arkhamHoldings,
        confidence: diffPct < 5 ? 0.85 : diffPct < 10 ? 0.75 : 0.65,
        sourceUrl: `${ARKHAM_BASE_URL}/explorer/entity/${entitySlug}`,
        sourceText: `Arkham Intelligence: ${formatNumber(arkhamHoldings)} BTC`,
        sourceDate: new Date(),
        trustLevel: 'verified', // On-chain data is verifiable
      });
    }

    await new Promise(r => setTimeout(r, 2000)); // Rate limit
  }

  return results;
}

/**
 * Format number for display
 */
function formatNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Add a new entity mapping
 */
export function addArkhamEntityMapping(ticker: string, entitySlug: string): void {
  ARKHAM_ENTITY_MAP[ticker] = entitySlug;
}
