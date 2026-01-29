/**
 * HKEX Fetcher
 *
 * Fetches announcements and filings from Hong Kong Stock Exchange (HKEX).
 * Unlike SEC EDGAR, HKEX does not have a structured XBRL API - filings are PDFs.
 *
 * Key endpoints:
 * - Stock list: https://www1.hkexnews.hk/ncms/script/eds/activestock_sehk_e.json
 * - Filing PDFs: https://www1.hkexnews.hk/listedco/listconews/sehk/{YYYY}/{MMDD}/{filename}.pdf
 *
 * Filing types we care about:
 * - Interim Results (H1) - typically Aug/Sep
 * - Annual Results (FY) - typically Mar/Apr
 * - Quarterly Updates - if company publishes them
 * - Inside Information / Voluntary Announcements - BTC purchase updates
 *
 * Note: Financial data must be manually extracted from PDFs or parsed via LLM.
 */

import { FetchResult, Fetcher, FetchField } from './types';

// Known HKEX stock codes for DAT companies
// Source: BitcoinTreasuries.net, company announcements
export const HKEX_DAT_COMPANIES: Record<string, {
  stockCode: string;
  name: string;
  asset: 'BTC' | 'ETH' | 'MULTI';  // Primary crypto holding
  notes?: string;
}> = {
  'boyaa': {
    stockCode: '434',
    name: 'Boyaa Interactive',
    asset: 'BTC',
    notes: 'HK largest BTC treasury. Also holds ETH.',
  },
  'meitu': {
    stockCode: '1357',
    name: 'Meitu Inc',
    asset: 'MULTI',
    notes: 'Photo app company. Holds BTC + ETH. Sold some in 2023.',
  },
  'coolpad': {
    stockCode: '2369',
    name: 'Coolpad Group',
    asset: 'BTC',
    notes: 'Smartphone maker. Announced BTC treasury 2024.',
  },
  'newhuotech': {
    stockCode: '1611',
    name: 'New Huo Technology',
    asset: 'MULTI',
    notes: 'Crypto infrastructure. Rebranded from Huobi Tech.',
  },
  'osl': {
    stockCode: '863',
    name: 'BC Technology Group (OSL)',
    asset: 'MULTI',
    notes: 'Licensed crypto exchange. Holds operational crypto.',
  },
};

// Filing URL pattern: https://www1.hkexnews.hk/listedco/listconews/sehk/{YYYY}/{MMDD}/{docId}.pdf
const HKEX_FILING_BASE = 'https://www1.hkexnews.hk/listedco/listconews/sehk';

// Document types we track
export type HKEXDocumentType =
  | 'interim-results'      // H1 results (半年度業績)
  | 'annual-results'       // Full year results (全年業績)
  | 'quarterly-update'     // Quarterly business update
  | 'inside-information'   // Inside information (內幕消息)
  | 'voluntary-announcement' // Voluntary announcement
  | 'monthly-return'       // Monthly return of equity issuer
  | 'other';

export interface HKEXFiling {
  stockCode: string;
  documentType: HKEXDocumentType;
  title: string;
  date: string;        // YYYY-MM-DD
  url: string;         // Full URL to PDF
  docId: string;       // Document ID from URL
}

export interface HKEXFilingMetadata {
  stockCode: string;
  companyName: string;
  filings: HKEXFiling[];
  lastChecked: string;
}

/**
 * Build filing URL from components
 */
export function buildFilingUrl(year: string, monthDay: string, docId: string): string {
  return `${HKEX_FILING_BASE}/${year}/${monthDay}/${docId}.pdf`;
}

/**
 * Parse filing URL to extract components
 */
export function parseFilingUrl(url: string): { year: string; monthDay: string; docId: string } | null {
  // Pattern: .../sehk/2025/1117/2025111700291.pdf
  const match = url.match(/\/sehk\/(\d{4})\/(\d{4})\/(\d+)\.pdf$/);
  if (!match) return null;
  return {
    year: match[1],
    monthDay: match[2],
    docId: match[3],
  };
}

/**
 * Known filings for Boyaa Interactive (0434.HK)
 * Manually maintained until we have automated scraping
 */
export const BOYAA_KNOWN_FILINGS: HKEXFiling[] = [
  // 2025
  {
    stockCode: '434',
    documentType: 'interim-results',
    title: 'Interim Results Announcement for H1 2025',
    date: '2025-08-28',
    url: buildFilingUrl('2025', '0828', '2025082800291'),
    docId: '2025082800291',
  },
  {
    stockCode: '434',
    documentType: 'quarterly-update',
    title: 'Third Quarterly Results Announcement 2025',
    date: '2025-11-17',
    url: 'https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf',
    docId: '2025111700291',
  },
  // 2024
  {
    stockCode: '434',
    documentType: 'annual-results',
    title: 'Annual Results Announcement for FY 2024',
    date: '2025-03-28',
    url: buildFilingUrl('2025', '0328', '2025032800291'),
    docId: '2025032800291',
  },
  {
    stockCode: '434',
    documentType: 'interim-results',
    title: 'Interim Results Announcement for H1 2024',
    date: '2024-08-28',
    url: buildFilingUrl('2024', '0828', '2024082800291'),
    docId: '2024082800291',
  },
];

// Manually maintained holdings data extracted from PDFs
// Updated when new filings are processed
export const BOYAA_EXTRACTED_DATA: Record<string, {
  holdings: number;
  sharesOutstanding: number;
  avgCost?: number;  // USD
  revenue?: number;  // HKD
  netIncome?: number; // HKD
  source: string;
}> = {
  '2025-06-30': {
    holdings: 3353,
    sharesOutstanding: 710698730,
    avgCost: 58695,
    revenue: 222605000,
    netIncome: 226020000,
    source: 'H1 2025 Interim Results',
  },
  '2025-09-30': {
    holdings: 4091,
    sharesOutstanding: 768004730,
    avgCost: 68114,
    source: 'Q3 2025 Results',
  },
};

// Known filings registry - add more as discovered
const KNOWN_FILINGS_REGISTRY: Record<string, HKEXFiling[]> = {
  '434': BOYAA_KNOWN_FILINGS,
  // TODO: Add Meitu (1357), Coolpad (2369), etc. as filings are identified
};

/**
 * Get known filings for a stock code
 */
export function getKnownFilings(stockCode: string): HKEXFiling[] {
  const code = stockCode.replace('.HK', '').replace(/^0+/, '');
  return KNOWN_FILINGS_REGISTRY[code] || [];
}

/**
 * Add a known filing to the registry (for runtime updates)
 */
export function addKnownFiling(stockCode: string, filing: HKEXFiling): void {
  const code = stockCode.replace('.HK', '').replace(/^0+/, '');
  if (!KNOWN_FILINGS_REGISTRY[code]) {
    KNOWN_FILINGS_REGISTRY[code] = [];
  }
  // Avoid duplicates
  if (!KNOWN_FILINGS_REGISTRY[code].some(f => f.url === filing.url)) {
    KNOWN_FILINGS_REGISTRY[code].unshift(filing); // Add to front (most recent)
  }
}

/**
 * Get extracted data for a specific date
 */
export function getExtractedData(stockCode: string, asOf?: string): typeof BOYAA_EXTRACTED_DATA[string] | null {
  const code = stockCode.replace('.HK', '').replace(/^0+/, '');
  if (code !== '434') return null;

  if (asOf && BOYAA_EXTRACTED_DATA[asOf]) {
    return BOYAA_EXTRACTED_DATA[asOf];
  }

  // Return most recent
  const dates = Object.keys(BOYAA_EXTRACTED_DATA).sort().reverse();
  return dates.length > 0 ? BOYAA_EXTRACTED_DATA[dates[0]] : null;
}

/**
 * Fetch a filing PDF and return raw bytes
 * Note: PDF parsing requires additional tooling (pdf-parse, LLM, etc.)
 */
export async function fetchFilingPdf(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DATTracker/1.0)',
      },
    });
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Failed to fetch HKEX filing: ${url}`, error);
    return null;
  }
}

/**
 * Check if a filing URL exists (HEAD request)
 */
export async function checkFilingExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DATTracker/1.0)',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Generate potential filing URLs for a date range
 * Used to discover new filings by probing
 */
export function generatePotentialFilingUrls(
  stockCode: string,
  startDate: Date,
  endDate: Date
): string[] {
  const urls: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const year = current.getFullYear().toString();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    const monthDay = `${month}${day}`;

    // Common doc ID patterns: YYYYMMDD00XXX where XXX varies
    // Boyaa typically uses 00291 suffix
    for (const suffix of ['00291', '00292', '00293', '00001', '00002']) {
      const docId = `${year}${monthDay}${suffix}`;
      urls.push(buildFilingUrl(year, monthDay, docId));
    }

    current.setDate(current.getDate() + 1);
  }

  return urls;
}

/**
 * Get supported HKEX tickers
 */
export function getSupportedTickers(): string[] {
  return Object.values(HKEX_DAT_COMPANIES).map(c => `0${c.stockCode}.HK`);
}

/**
 * Get company info by stock code
 */
export function getCompanyInfo(stockCode: string): typeof HKEX_DAT_COMPANIES[string] | null {
  const code = stockCode.replace('.HK', '').replace(/^0+/, '');
  return Object.values(HKEX_DAT_COMPANIES).find(c => c.stockCode === code) || null;
}

// ============ Fetcher Interface Implementation ============

/**
 * HKEX Fetcher - implements Fetcher interface
 * Note: Returns manually extracted data from PDFs
 */
export const hkexFetcher: Fetcher = {
  name: 'HKEX Filings',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];

    for (const ticker of tickers) {
      const code = ticker.replace('.HK', '').replace(/^0+/, '');
      if (code !== '434') continue;

      const data = getExtractedData(code);
      if (!data) continue;

      const filings = getKnownFilings(code);
      const latestFiling = filings[0];
      const sourceDate = Object.keys(BOYAA_EXTRACTED_DATA).sort().reverse()[0];

      // Return holdings data
      if (data.holdings) {
        results.push({
          ticker,
          field: 'holdings',
          value: data.holdings,
          source: {
            name: `HKEX - ${data.source}`,
            url: latestFiling?.url || '',
            date: sourceDate,
          },
          fetchedAt: new Date(),
        });
      }

      // Return shares data
      if (data.sharesOutstanding) {
        results.push({
          ticker,
          field: 'shares_outstanding',
          value: data.sharesOutstanding,
          source: {
            name: `HKEX - ${data.source}`,
            url: latestFiling?.url || '',
            date: sourceDate,
          },
          fetchedAt: new Date(),
        });
      }
    }

    return results;
  },
};

export default hkexFetcher;
