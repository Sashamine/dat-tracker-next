/**
 * Direct Holdings Page Monitor
 * Fetches holdings from companies that publish real-time or near-real-time data
 */

import { SourceCheckResult } from '../types';
import { getCompanySource, COMPANY_SOURCES, type CompanySource } from './company-sources';

// Holdings page configurations - how to extract data from each
interface HoldingsPageConfig {
  ticker: string;
  url: string;
  // How to extract holdings - could be regex, JSON path, or custom
  extractionMethod: 'regex' | 'json' | 'html_selector' | 'api';
  // Patterns/paths for extraction
  holdingsPattern?: RegExp;
  jsonPath?: string;
  selector?: string;
  // API endpoint if different from page
  apiEndpoint?: string;
  // Asset type
  asset: string;
}

const HOLDINGS_PAGE_CONFIGS: HoldingsPageConfig[] = [
  {
    ticker: 'KULR',
    url: 'https://kulrbitcointracker.com/',
    extractionMethod: 'regex',
    // Look for patterns like "1,021 BTC" or "Total BTC: 1021"
    holdingsPattern: /(?:total[:\s]*)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
  {
    ticker: '3350.T',
    url: 'https://metaplanet.jp/en/analytics',
    extractionMethod: 'regex',
    holdingsPattern: /(?:total[:\s]*|holds?\s*)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
  {
    ticker: 'XXI',
    url: 'https://xxi.money/',
    extractionMethod: 'regex',
    holdingsPattern: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
  {
    ticker: 'NAKA',
    url: 'https://nakamoto.com/',
    extractionMethod: 'regex',
    holdingsPattern: /(?:holds?\s*|treasury[:\s]*)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
  {
    ticker: 'ABTC',
    url: 'https://www.abtc.com/',
    extractionMethod: 'regex',
    holdingsPattern: /(?:strategic reserve[:\s]*|holds?\s*)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
  {
    ticker: 'H100.ST',
    url: 'https://www.h100.group/',
    extractionMethod: 'regex',
    holdingsPattern: /(?:holds?\s*|treasury[:\s]*)(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    asset: 'BTC',
  },
];

/**
 * Fetch a holdings page
 */
async function fetchHoldingsPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/json',
      },
    });

    if (!response.ok) {
      console.error(`[Holdings] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`[Holdings] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Extract holdings number from page content
 */
function extractHoldings(content: string, config: HoldingsPageConfig): number | null {
  switch (config.extractionMethod) {
    case 'regex': {
      if (!config.holdingsPattern) return null;

      // Clean content first
      const cleanContent = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ');

      const match = cleanContent.match(config.holdingsPattern);
      if (match && match[1]) {
        // Remove commas and parse
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
      return null;
    }

    case 'json': {
      if (!config.jsonPath) return null;
      try {
        const data = JSON.parse(content);
        const parts = config.jsonPath.split('.');
        let value: any = data;
        for (const part of parts) {
          value = value?.[part];
        }
        return typeof value === 'number' ? value : parseFloat(value);
      } catch {
        return null;
      }
    }

    default:
      return null;
  }
}

/**
 * Find all numbers that could be holdings in content
 * Returns candidates with context
 */
function findHoldingsCandidates(content: string, asset: string): Array<{ value: number; context: string }> {
  const candidates: Array<{ value: number; context: string }> = [];

  // Clean content
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

  const assetKeywords: Record<string, string[]> = {
    BTC: ['bitcoin', 'btc'],
    ETH: ['ethereum', 'eth', 'ether'],
    SOL: ['solana', 'sol'],
  };

  const keywords = assetKeywords[asset] || ['digital asset'];

  // Find numbers near asset keywords
  for (const keyword of keywords) {
    // Pattern: number followed by keyword (e.g., "52,850 BTC")
    const pattern1 = new RegExp(
      `(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)\\s*${keyword}`,
      'gi'
    );

    let match;
    while ((match = pattern1.exec(cleanContent)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 0) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(cleanContent.length, match.index + match[0].length + 50);
        candidates.push({
          value,
          context: cleanContent.substring(start, end),
        });
      }
    }

    // Pattern: keyword followed by number (e.g., "Bitcoin: 52,850")
    const pattern2 = new RegExp(
      `${keyword}[:\\s]+(?:of\\s+)?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)`,
      'gi'
    );

    while ((match = pattern2.exec(cleanContent)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 0) {
        const start = Math.max(0, match.index - 50);
        const end = Math.min(cleanContent.length, match.index + match[0].length + 50);
        candidates.push({
          value,
          context: cleanContent.substring(start, end),
        });
      }
    }
  }

  // Deduplicate by value
  const seen = new Set<number>();
  return candidates.filter(c => {
    if (seen.has(c.value)) return false;
    seen.add(c.value);
    return true;
  });
}

/**
 * Check direct holdings pages
 */
export async function checkHoldingsPages(
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
    // Get config from our list or company sources
    const config = HOLDINGS_PAGE_CONFIGS.find(c => c.ticker === company.ticker);
    const companySource = getCompanySource(company.ticker);
    const url = config?.url || companySource?.holdingsPageUrl;

    if (!url) continue;

    console.log(`[Holdings] Checking ${company.ticker} at ${url}...`);

    try {
      const content = await fetchHoldingsPage(url);
      if (!content) continue;

      let detectedHoldings: number | undefined;
      let confidence = 0.85;

      // Try configured extraction first
      if (config) {
        const extracted = extractHoldings(content, config);
        if (extracted) {
          detectedHoldings = extracted;
          confidence = 0.95; // Higher confidence for configured extraction
          console.log(`[Holdings] ${company.ticker}: Extracted ${extracted} ${company.asset} via config`);
        }
      }

      // Fall back to candidate detection
      if (!detectedHoldings) {
        const candidates = findHoldingsCandidates(content, company.asset);

        if (candidates.length > 0) {
          // Use the largest reasonable number as the holdings
          // Filter out likely non-holdings numbers (market cap, prices, etc.)
          const validCandidates = candidates.filter(c => {
            // Holdings should be > 100 for most companies, < 1B
            if (c.value < 100 || c.value > 1_000_000_000) return false;

            // Check context doesn't mention price, market cap, etc.
            const lowerContext = c.context.toLowerCase();
            if (lowerContext.includes('price') || lowerContext.includes('market cap')) return false;
            if (lowerContext.includes('$') && !lowerContext.includes('worth')) return false;

            return true;
          });

          if (validCandidates.length > 0) {
            // Sort by value descending, take largest (likely total holdings)
            validCandidates.sort((a, b) => b.value - a.value);
            detectedHoldings = validCandidates[0].value;
            confidence = 0.75; // Lower confidence for auto-detection
            console.log(`[Holdings] ${company.ticker}: Auto-detected ${detectedHoldings} ${company.asset}`);
            console.log(`[Holdings] Context: "${validCandidates[0].context}"`);
          }
        }
      }

      if (detectedHoldings) {
        // Sanity check: if detected is very different from current, flag it
        const percentChange = Math.abs(detectedHoldings - company.holdings) / company.holdings;
        if (percentChange > 0.5) {
          console.log(`[Holdings] Warning: ${company.ticker} detected ${detectedHoldings} vs current ${company.holdings} (${(percentChange * 100).toFixed(1)}% change)`);
          confidence *= 0.7; // Reduce confidence for large changes
        }

        results.push({
          sourceType: 'holdings_page',
          companyId: company.id,
          ticker: company.ticker,
          asset: company.asset,
          detectedHoldings,
          confidence,
          sourceUrl: url,
          sourceText: content.substring(0, 10000),
          sourceDate: new Date(),
          trustLevel: 'official',
        });
      } else {
        console.log(`[Holdings] ${company.ticker}: No holdings found on page`);
      }
    } catch (error) {
      console.error(`[Holdings] Error checking ${company.ticker}:`, error);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

/**
 * Get companies that have holdings pages configured
 */
export function getHoldingsPageCompanies(): string[] {
  const fromConfig = HOLDINGS_PAGE_CONFIGS.map(c => c.ticker);
  const fromSources = COMPANY_SOURCES
    .filter(c => c.holdingsPageUrl)
    .map(c => c.ticker);

  return [...new Set([...fromConfig, ...fromSources])];
}
