/**
 * Aggregator Sources Monitor
 * Fetches holdings data from aggregator sources:
 * - Bitbo.io (scrape)
 * - BitcoinTreasuries.net (scrape)
 *
 * Used for:
 * - Non-US companies without SEC filings
 * - Cross-verification of extracted data
 * - Fallback when primary sources unavailable
 */

import { SourceCheckResult } from '../types';
import { getCompanySource, COMPANY_SOURCES, type CompanySource } from './company-sources';

// ============================================================
// BITBO.IO (Scrape)
// ============================================================

interface BitboHoldings {
  ticker: string;
  holdings: number;
  asOfDate?: string;
}

async function fetchBitboHoldings(slug: string): Promise<BitboHoldings | null> {
  try {
    const url = `https://bitbo.io/treasuries/${slug}/`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      console.error(`[Bitbo] Failed to fetch ${slug}: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Look for patterns like "owns 52,850 bitcoins"
    const holdingsMatch = html.match(/owns?\s+([\d,]+(?:\.\d+)?)\s*bitcoin/i);
    if (!holdingsMatch) return null;

    const holdings = parseFloat(holdingsMatch[1].replace(/,/g, ''));
    if (isNaN(holdings) || holdings <= 0) return null;

    // Try to extract date
    const dateMatch = html.match(/as of\s+(\w+\.?\s+\d{1,2},?\s+\d{4})/i);
    const asOfDate = dateMatch ? dateMatch[1] : undefined;

    return {
      ticker: slug.toUpperCase(),
      holdings,
      asOfDate,
    };
  } catch (error) {
    console.error(`[Bitbo] Error fetching ${slug}:`, error);
    return null;
  }
}

// ============================================================
// BITCOINTREASURIES.NET (Scrape)
// ============================================================

async function fetchBitcoinTreasuriesNet(slug: string): Promise<BitboHoldings | null> {
  try {
    const url = `https://bitcointreasuries.net/entities/${slug}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      // Try alternate URL format
      const altUrl = `https://bitcointreasuries.net/public-companies/${slug}`;
      const altResponse = await fetch(altUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
          'Accept': 'text/html',
        },
      });

      if (!altResponse.ok) {
        console.error(`[BTCTreasuries] Failed to fetch ${slug}`);
        return null;
      }

      const html = await altResponse.text();
      return extractHoldingsFromBTCTreasuries(html, slug);
    }

    const html = await response.text();
    return extractHoldingsFromBTCTreasuries(html, slug);
  } catch (error) {
    console.error(`[BTCTreasuries] Error fetching ${slug}:`, error);
    return null;
  }
}

function extractHoldingsFromBTCTreasuries(html: string, slug: string): BitboHoldings | null {
  // Look for patterns like "holds 52,850 BTC" or "52,850 BTC"
  const patterns = [
    /holds?\s+([\d,]+(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
    /([\d,]+(?:\.\d+)?)\s*(?:btc|bitcoin)\s*(?:held|holdings|treasury)/i,
    /total[:\s]+([\d,]+(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const holdings = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(holdings) && holdings > 0) {
        return {
          ticker: slug.toUpperCase(),
          holdings,
        };
      }
    }
  }

  return null;
}

// ============================================================
// COMBINED AGGREGATOR CHECK
// ============================================================

export interface AggregatorResult {
  source: 'bitbo' | 'bitcointreasuries';
  ticker: string;
  holdings: number;
  asOfDate?: string;
  confidence: number;
}

/**
 * Check all aggregator sources for a company
 * Uses Bitbo and BitcoinTreasuries.net (no CoinGecko per user preference)
 */
export async function checkAggregatorsForCompany(
  ticker: string,
  currentHoldings: number
): Promise<AggregatorResult[]> {
  const results: AggregatorResult[] = [];
  const companySource = getCompanySource(ticker);

  // Check Bitbo if we have a slug
  const bitboSlug = companySource?.aggregators?.bitbo;
  if (bitboSlug) {
    const bitboData = await fetchBitboHoldings(bitboSlug);
    if (bitboData) {
      results.push({
        source: 'bitbo',
        ticker,
        holdings: bitboData.holdings,
        asOfDate: bitboData.asOfDate,
        confidence: 0.80,
      });
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  // Check BitcoinTreasuries.net if we have a slug
  const btcTreasSlug = companySource?.aggregators?.bitcoinTreasuries;
  if (btcTreasSlug) {
    const btcTreasData = await fetchBitcoinTreasuriesNet(btcTreasSlug);
    if (btcTreasData) {
      results.push({
        source: 'bitcointreasuries',
        ticker,
        holdings: btcTreasData.holdings,
        confidence: 0.80,
      });
    }
    await new Promise(r => setTimeout(r, 500)); // Rate limit
  }

  return results;
}

/**
 * Check aggregators for all companies (for verification/fallback)
 * Uses Bitbo and BitcoinTreasuries.net only
 */
export async function checkAggregatorsForUpdates(
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
    // Only check BTC companies for now (aggregators mainly track BTC)
    if (company.asset !== 'BTC') continue;

    const companySource = getCompanySource(company.ticker);

    // Check Bitbo for non-US companies or those without SEC filings
    if (companySource?.aggregators?.bitbo) {
      console.log(`[Aggregators] Checking Bitbo for ${company.ticker}...`);

      const bitboData = await fetchBitboHoldings(companySource.aggregators.bitbo);
      if (bitboData && bitboData.holdings > 0) {
        const discrepancyPct = Math.abs(bitboData.holdings - company.holdings) / company.holdings;

        if (discrepancyPct > 0.01) {
          results.push({
            sourceType: 'aggregator_bitbo',
            companyId: company.id,
            ticker: company.ticker,
            asset: company.asset,
            detectedHoldings: bitboData.holdings,
            confidence: discrepancyPct < 0.05 ? 0.85 : discrepancyPct < 0.10 ? 0.75 : 0.65,
            sourceUrl: `https://bitbo.io/treasuries/${companySource.aggregators.bitbo}/`,
            sourceText: `Bitbo reports ${bitboData.holdings.toLocaleString()} BTC for ${company.name}`,
            sourceDate: new Date(),
            trustLevel: 'community',
          });
        }
      }

      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    // Also check BitcoinTreasuries.net if configured
    if (companySource?.aggregators?.bitcoinTreasuries) {
      console.log(`[Aggregators] Checking BitcoinTreasuries.net for ${company.ticker}...`);

      const btcTreasData = await fetchBitcoinTreasuriesNet(companySource.aggregators.bitcoinTreasuries);
      if (btcTreasData && btcTreasData.holdings > 0) {
        const discrepancyPct = Math.abs(btcTreasData.holdings - company.holdings) / company.holdings;

        if (discrepancyPct > 0.01) {
          results.push({
            sourceType: 'aggregator_btctreasuries',
            companyId: company.id,
            ticker: company.ticker,
            asset: company.asset,
            detectedHoldings: btcTreasData.holdings,
            confidence: discrepancyPct < 0.05 ? 0.85 : discrepancyPct < 0.10 ? 0.75 : 0.65,
            sourceUrl: `https://bitcointreasuries.net/entities/${companySource.aggregators.bitcoinTreasuries}`,
            sourceText: `BitcoinTreasuries.net reports ${btcTreasData.holdings.toLocaleString()} BTC for ${company.name}`,
            sourceDate: new Date(),
            trustLevel: 'community',
          });
        }
      }

      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }
  }

  return results;
}

/**
 * Get companies that need aggregator monitoring (no SEC filings)
 */
export function getAggregatorOnlyCompanies(): CompanySource[] {
  return COMPANY_SOURCES.filter(c => !c.secCik && c.aggregators);
}
