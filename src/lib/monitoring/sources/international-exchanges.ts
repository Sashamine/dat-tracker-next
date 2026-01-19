/**
 * International Exchange Filing Monitors
 *
 * Supports:
 * - CSE (Canadian Securities Exchange) - Sol Strategies (STKE)
 * - HKEX (Hong Kong Stock Exchange) - Boyaa Interactive (0434.HK)
 * - TSE (Tokyo Stock Exchange) - Metaplanet (3350.T) via IR page
 */

import { SourceCheckResult } from '../types';

// ============================================================
// CSE (Canadian Securities Exchange) - Sol Strategies
// ============================================================

interface CSEFiling {
  url: string;
  document_description: string;
  document_category: string;
  document_language: string;
  filing_description: string;
  public_date: string;
  accession_number: string;
  status: string;
}

interface CSEFilingsResponse {
  categories: Record<string, number>;
  list: CSEFiling[];
}

// CSE company IDs (found via their website)
const CSE_COMPANY_IDS: Record<string, string> = {
  'STKE': '000020977',  // Sol Strategies (CSE: HODL)
};

// Categories that may contain financial/holdings info
const CSE_RELEVANT_CATEGORIES = [
  'FINANCIAL_STATEMENTS',
  'MATERIAL_CHANGE_REPORT',
  'NEWS_RELEASES',
  'ANNUAL_INFORMATION_FORM',
  'MANAGEMENT_DISCUSSION',
];

/**
 * Fetch filings from CSE API for Canadian companies
 */
async function fetchCSEFilings(companyId: string): Promise<CSEFilingsResponse | null> {
  try {
    const url = `https://webapi.thecse.com/trading/listed/sedar_filings/${companyId}.json`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DAT-Tracker/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`CSE API error for ${companyId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching CSE filings for ${companyId}:`, error);
    return null;
  }
}

/**
 * Check CSE filings for Canadian companies
 */
export async function checkCSEFilings(
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
  const sinceDateStr = sinceDate.toISOString().split('T')[0];

  for (const company of companies) {
    const companyId = CSE_COMPANY_IDS[company.ticker];
    if (!companyId) continue;

    console.log(`[CSE] Checking ${company.ticker}...`);

    try {
      const data = await fetchCSEFilings(companyId);
      if (!data?.list) continue;

      // Filter to recent, relevant filings
      const recentFilings = data.list.filter(filing => {
        if (filing.public_date < sinceDateStr) return false;
        if (filing.document_language !== 'English') return false;
        return CSE_RELEVANT_CATEGORIES.includes(filing.document_category);
      });

      // Sort by date descending
      recentFilings.sort((a, b) =>
        new Date(b.public_date).getTime() - new Date(a.public_date).getTime()
      );

      // Check the most recent relevant filings
      for (const filing of recentFilings.slice(0, 5)) {
        // Fetch the filing content
        const content = await fetchFilingContent(filing.url);
        if (!content) continue;

        // Check for crypto-related terms
        const lowerContent = content.toLowerCase();
        const hasCrypto = ['solana', 'sol', 'digital asset', 'cryptocurrency', 'staking', 'validator']
          .some(term => lowerContent.includes(term));

        if (hasCrypto) {
          console.log(`[CSE] Found crypto content in ${company.ticker} ${filing.document_category} from ${filing.public_date}`);

          results.push({
            sourceType: 'sedar_filing',
            companyId: company.id,
            ticker: company.ticker,
            asset: company.asset,
            detectedHoldings: undefined, // Needs LLM extraction
            confidence: 0.90,
            sourceUrl: filing.url,
            sourceText: content.substring(0, 30000),
            sourceDate: new Date(filing.public_date),
            trustLevel: 'official',
          });

          break; // Found one, move to next company
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (error) {
      console.error(`[CSE] Error checking ${company.ticker}:`, error);
    }

    // Rate limit between companies
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}


// ============================================================
// HKEX (Hong Kong Stock Exchange) - Boyaa Interactive
// ============================================================

interface HKEXAnnouncement {
  stockCode: string;
  stockName: string;
  title: string;
  dateTime: string;
  documentUrl: string;
  category: string;
}

// HKEX stock codes (with leading zeros)
const HKEX_STOCK_CODES: Record<string, string> = {
  '0434.HK': '00434',  // Boyaa Interactive
};

// Categories that may contain financial/holdings info
const HKEX_RELEVANT_CATEGORIES = [
  'Announcements and Notices',
  'Financial Statements/ESG Information',
  'Circulars',
  'Monthly Returns',
];

/**
 * Search HKEXnews for company announcements
 * Note: HKEX doesn't have a formal API, so we use their search endpoint
 */
async function searchHKEXAnnouncements(
  stockCode: string,
  sinceDate: Date
): Promise<HKEXAnnouncement[]> {
  try {
    // Format dates for HKEX
    const fromDate = sinceDate.toISOString().split('T')[0].replace(/-/g, '');
    const toDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // HKEX title search URL
    const searchUrl = `https://www1.hkexnews.hk/search/titlesearch.xhtml?` +
      `lang=en&` +
      `stock=${stockCode}&` +
      `category=0&` +  // All categories
      `from=${fromDate}&` +
      `to=${toDate}&` +
      `sort=0`;  // Sort by date desc

    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'DAT-Tracker/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`HKEX search error: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Parse announcements from HTML response
    return parseHKEXSearchResults(html, stockCode);
  } catch (error) {
    console.error(`Error searching HKEX for ${stockCode}:`, error);
    return [];
  }
}

/**
 * Parse HKEX search results HTML to extract announcements
 */
function parseHKEXSearchResults(html: string, stockCode: string): HKEXAnnouncement[] {
  const announcements: HKEXAnnouncement[] = [];

  // Extract table rows with announcement data
  // HKEX uses a specific table structure for search results
  const rowRegex = /<tr[^>]*class="[^"]*row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;

  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    // Extract link and title
    const linkMatch = linkRegex.exec(rowHtml);
    linkRegex.lastIndex = 0; // Reset regex

    if (linkMatch) {
      const documentUrl = linkMatch[1].startsWith('http')
        ? linkMatch[1]
        : `https://www1.hkexnews.hk${linkMatch[1]}`;
      const title = linkMatch[2].trim();

      // Extract date
      const dateMatch = rowHtml.match(dateRegex);
      const dateStr = dateMatch ? dateMatch[1] : '';

      if (title && documentUrl) {
        announcements.push({
          stockCode,
          stockName: '',
          title,
          dateTime: dateStr,
          documentUrl,
          category: '',
        });
      }
    }
  }

  return announcements;
}

/**
 * Check HKEX for Hong Kong company announcements
 */
export async function checkHKEXFilings(
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
    const stockCode = HKEX_STOCK_CODES[company.ticker];
    if (!stockCode) continue;

    console.log(`[HKEX] Checking ${company.ticker}...`);

    try {
      const announcements = await searchHKEXAnnouncements(stockCode, sinceDate);

      // Filter for crypto-related announcements
      const cryptoKeywords = ['bitcoin', 'btc', 'cryptocurrency', 'digital asset', 'crypto'];

      for (const announcement of announcements.slice(0, 10)) {
        const titleLower = announcement.title.toLowerCase();
        const hasCryptoInTitle = cryptoKeywords.some(kw => titleLower.includes(kw));

        // Also check common announcement types
        const isRelevantType =
          titleLower.includes('acquisition') ||
          titleLower.includes('investment') ||
          titleLower.includes('treasury') ||
          titleLower.includes('results') ||
          titleLower.includes('interim') ||
          titleLower.includes('annual');

        if (hasCryptoInTitle || isRelevantType) {
          // Fetch the announcement content
          const content = await fetchFilingContent(announcement.documentUrl);

          if (content) {
            const lowerContent = content.toLowerCase();
            const hasCryptoInContent = cryptoKeywords.some(kw => lowerContent.includes(kw));

            if (hasCryptoInContent) {
              console.log(`[HKEX] Found crypto content in ${company.ticker}: ${announcement.title}`);

              // Parse date from DD/MM/YYYY format
              let sourceDate = new Date();
              if (announcement.dateTime) {
                const parts = announcement.dateTime.split('/');
                if (parts.length === 3) {
                  sourceDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
              }

              results.push({
                sourceType: 'hkex_filing',
                companyId: company.id,
                ticker: company.ticker,
                asset: company.asset,
                detectedHoldings: undefined, // Needs LLM extraction
                confidence: 0.88,
                sourceUrl: announcement.documentUrl,
                sourceText: content.substring(0, 30000),
                sourceDate,
                trustLevel: 'official',
              });

              break; // Found one, move to next company
            }
          }
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) {
      console.error(`[HKEX] Error checking ${company.ticker}:`, error);
    }

    // Rate limit between companies
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}


// ============================================================
// Shared Utilities
// ============================================================

/**
 * Fetch and clean filing content from a URL
 */
async function fetchFilingContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/pdf,text/plain',
        'User-Agent': 'DAT-Tracker/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch filing content from ${url}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle PDF files - return URL for manual review
    if (contentType.includes('pdf')) {
      return `[PDF Document - URL: ${url}]`;
    }

    let content = await response.text();

    // Clean HTML
    content = content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&#34;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&ldquo;|&rdquo;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    return content.length > 100 ? content : null;
  } catch (error) {
    console.error(`Error fetching filing content from ${url}:`, error);
    return null;
  }
}

/**
 * Check all international exchanges for updates
 */
export async function checkInternationalExchanges(
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

  // Split companies by exchange
  const cseCompanies = companies.filter(c => CSE_COMPANY_IDS[c.ticker]);
  const hkexCompanies = companies.filter(c => HKEX_STOCK_CODES[c.ticker]);

  // Check CSE (Canada)
  if (cseCompanies.length > 0) {
    const cseResults = await checkCSEFilings(cseCompanies, sinceDate);
    results.push(...cseResults);
  }

  // Check HKEX (Hong Kong)
  if (hkexCompanies.length > 0) {
    const hkexResults = await checkHKEXFilings(hkexCompanies, sinceDate);
    results.push(...hkexResults);
  }

  return results;
}

/**
 * Get list of companies that can be monitored via international exchanges
 */
export function getInternationalMonitoredCompanies(): string[] {
  return [
    ...Object.keys(CSE_COMPANY_IDS),
    ...Object.keys(HKEX_STOCK_CODES),
  ];
}
