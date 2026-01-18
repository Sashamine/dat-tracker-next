/**
 * Company IR Page Monitor
 * Scrapes investor relations pages for press releases containing holdings updates
 */

import { SourceCheckResult } from '../types';
import { getCompanySource, COMPANY_SOURCES, type CompanySource } from './company-sources';

// IR page configurations - how to find and parse press releases
interface IRPageConfig {
  ticker: string;
  baseUrl: string;
  // How to find press release links
  linkSelector?: string;
  linkPattern?: RegExp;
  // How to identify holdings-related releases
  titlePatterns: RegExp[];
  // Date format in the page
  dateSelector?: string;
  dateFormat?: string;
}

const IR_PAGE_CONFIGS: IRPageConfig[] = [
  {
    ticker: 'CLSK',
    baseUrl: 'https://investors.cleanspark.com/news/news-details',
    titlePatterns: [
      /bitcoin mining update/i,
      /btc.*update/i,
      /production.*update/i,
    ],
  },
  {
    ticker: 'MARA',
    baseUrl: 'https://ir.mara.com/news-events/press-releases',
    titlePatterns: [
      /bitcoin production/i,
      /mining operation/i,
      /quarterly results/i,
      /shareholder letter/i,
    ],
  },
  {
    ticker: 'RIOT',
    baseUrl: 'https://www.riotplatforms.com/news-media/press-releases',
    titlePatterns: [
      /production update/i,
      /bitcoin.*update/i,
      /quarterly/i,
    ],
  },
  {
    ticker: 'HUT',
    baseUrl: 'https://hut8.com/investors/news/',
    titlePatterns: [
      /bitcoin reserve/i,
      /monthly.*update/i,
      /operational update/i,
    ],
  },
  {
    ticker: 'CORZ',
    baseUrl: 'https://investors.corescientific.com/news-events/press-releases',
    titlePatterns: [
      /production.*update/i,
      /operations update/i,
      /quarterly/i,
    ],
  },
  {
    ticker: 'KULR',
    baseUrl: 'https://kulr.ai/news/',
    titlePatterns: [
      /bitcoin/i,
      /btc/i,
      /treasury/i,
    ],
  },
  {
    ticker: 'ASST',
    baseUrl: 'https://ir.strive.com/news-events/press-releases',
    titlePatterns: [
      /bitcoin/i,
      /btc/i,
      /holdings/i,
    ],
  },
];

/**
 * Fetch and parse an IR page to find recent press releases
 */
async function fetchIRPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      console.error(`[IR] Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`[IR] Error fetching ${url}:`, error);
    return null;
  }
}

/**
 * Extract press release links from an IR page
 */
function extractPressReleaseLinks(html: string, baseUrl: string): Array<{ url: string; title: string; date?: string }> {
  const links: Array<{ url: string; title: string; date?: string }> = [];

  // Common patterns for press release links
  // Look for <a> tags with href containing common IR URL patterns
  const linkRegex = /<a[^>]*href=["']([^"']*(?:news|press|release|update)[^"']*)["'][^>]*>([^<]*)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let url = match[1];
    const title = match[2].trim();

    if (!title || title.length < 5) continue;

    // Make URL absolute
    if (url.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      url = `${urlObj.protocol}//${urlObj.host}${url}`;
    } else if (!url.startsWith('http')) {
      url = `${baseUrl}/${url}`;
    }

    links.push({ url, title });
  }

  // Also try to find links in common list structures
  const listItemRegex = /<li[^>]*>[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;

  while ((match = listItemRegex.exec(html)) !== null) {
    let url = match[1];
    // Clean HTML from title
    const title = match[2].replace(/<[^>]*>/g, '').trim();

    if (!title || title.length < 5) continue;
    if (links.some(l => l.url === url)) continue;

    // Make URL absolute
    if (url.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      url = `${urlObj.protocol}//${urlObj.host}${url}`;
    } else if (!url.startsWith('http')) {
      url = `${baseUrl}/${url}`;
    }

    links.push({ url, title });
  }

  return links;
}

/**
 * Fetch and clean press release content
 */
async function fetchPressReleaseContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return null;

    let content = await response.text();

    // Clean HTML
    content = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&#34;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;|&rdquo;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    return content;
  } catch (error) {
    console.error(`[IR] Error fetching press release ${url}:`, error);
    return null;
  }
}

/**
 * Check if content contains holdings information
 */
function containsHoldingsInfo(content: string, asset: string): boolean {
  const lowerContent = content.toLowerCase();

  const assetKeywords: Record<string, string[]> = {
    BTC: ['bitcoin', 'btc', 'satoshi'],
    ETH: ['ethereum', 'ether', 'eth'],
    SOL: ['solana', 'sol'],
  };

  const keywords = assetKeywords[asset] || ['digital asset', 'cryptocurrency'];
  const hasAsset = keywords.some(kw => lowerContent.includes(kw));

  const holdingsPatterns = [
    /hold[s]?\s+[\d,]+/i,
    /treasury\s+of\s+[\d,]+/i,
    /total[ly]?\s+[\d,]+\s*(btc|bitcoin|eth|sol)/i,
    /[\d,]+\s*(btc|bitcoin|eth|sol)\s*(held|holdings|reserve)/i,
    /reserve[s]?\s+of\s+[\d,]+/i,
  ];

  const hasHoldings = holdingsPatterns.some(pattern => pattern.test(content));

  return hasAsset && hasHoldings;
}

/**
 * Check IR pages for holdings updates
 */
export async function checkIRPages(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>,
  sinceDate: Date
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  for (const company of companies) {
    const config = IR_PAGE_CONFIGS.find(c => c.ticker === company.ticker);
    const companySource = getCompanySource(company.ticker);

    // Use config or company source for IR URL
    const irUrl = config?.baseUrl || companySource?.irPageUrl;
    if (!irUrl) continue;

    console.log(`[IR] Checking ${company.ticker} at ${irUrl}...`);

    try {
      const html = await fetchIRPage(irUrl);
      if (!html) continue;

      const links = extractPressReleaseLinks(html, irUrl);
      console.log(`[IR] Found ${links.length} links on ${company.ticker} IR page`);

      // Check title patterns to filter relevant releases
      const titlePatterns = config?.titlePatterns || [
        /bitcoin/i, /btc/i, /holdings/i, /treasury/i, /production/i, /update/i
      ];

      const relevantLinks = links.filter(link =>
        titlePatterns.some(pattern => pattern.test(link.title))
      );

      console.log(`[IR] ${relevantLinks.length} potentially relevant releases for ${company.ticker}`);

      // Check the first few relevant releases
      for (const link of relevantLinks.slice(0, 3)) {
        const content = await fetchPressReleaseContent(link.url);
        if (!content || content.length < 500) continue;

        if (containsHoldingsInfo(content, company.asset)) {
          console.log(`[IR] Found holdings info in ${company.ticker}: "${link.title}"`);

          results.push({
            sourceType: 'ir_press_release',
            companyId: company.id,
            ticker: company.ticker,
            asset: company.asset,
            detectedHoldings: undefined, // Needs LLM extraction
            confidence: 0.90,
            sourceUrl: link.url,
            sourceText: content.substring(0, 30000),
            sourceDate: new Date(), // Would need to parse from page
            trustLevel: 'official',
          });

          // Found one, move to next company
          break;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error(`[IR] Error checking ${company.ticker}:`, error);
    }

    // Rate limit between companies
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

/**
 * Get companies that have IR pages configured
 */
export function getIRPageCompanies(): string[] {
  const fromConfig = IR_PAGE_CONFIGS.map(c => c.ticker);
  const fromSources = COMPANY_SOURCES
    .filter(c => c.irPageUrl)
    .map(c => c.ticker);

  return [...new Set([...fromConfig, ...fromSources])];
}
