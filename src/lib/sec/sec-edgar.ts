/**
 * SEC EDGAR Filing Monitor
 * Checks for new filings that may contain crypto holdings information
 *
 * Key learnings from manual verification:
 * - File patterns vary by company (ex99, shareholder letters, earnings announcements)
 * - Must search ALL .htm files in filing index, not just primary document
 * - Balance sheets report in thousands (e.g., "$5,247,000" = $5.247B)
 */

import { SECFilingResult, SourceCheckResult } from './types';
import { getCompanySource, getSECMonitoredCompanies, type CompanySource } from './company-sources';

// Map tickers to SEC CIK numbers (legacy - use company-sources.ts instead)
// CIKs verified against SEC EDGAR on 2026-01-21
export const TICKER_TO_CIK: Record<string, string> = {
  // BTC
  "MSTR": "0001050446",  // Strategy (fka MicroStrategy)
  "MARA": "0001507605",  // MARA Holdings
  "RIOT": "0001167419",  // Riot Platforms
  "CLSK": "0000827876",  // CleanSpark
  // "HUT": "0001964789", // Removed - pivoted to AI/HPC, not a DAT company
  "CORZ": "0001839341",  // Core Scientific
  "BTDR": "0001899123",  // Bitdeer
  "KULR": "0001662684",  // KULR Technology
  "NAKA": "0001946573",  // Nakamoto (KindlyMD post-merger)
  "DJT": "0001849635",   // Trump Media
  "XXI": "0001865602",   // Twenty One Capital (Cantor Equity Partners)
  "CEPO": "0001865602",  // Same as XXI
  "ASST": "0001920406",  // Strive (acquired Semler Jan 2026)
  "NXTT": "0001784970",  // Next Technology Holding
  "ABTC": "0002068580",  // American Bitcoin (miner with HODL strategy)
  // ETH
  "BMNR": "0001829311",  // Bitmine Immersion
  "SBET": "0001981535",  // SharpLink Gaming
  "ETHM": "0002080334",  // The Ether Machine (Dynamix merger)
  "BTBT": "0001710350",  // Bit Digital
  "BTCS": "0001436229",  // BTCS Inc
  "GAME": "0001714562",  // GameSquare Holdings
  "FGNX": "0001591890",  // FG Nexus (fka Fundamental Global)
  // SOL
  "FWDI": "0000038264",  // Forward Industries
  "HSDT": "0001610853",  // Helius (neurotech, now SOL treasury)
  "DFDV": "0001805526",  // DeFi Development Corp
  "UPXI": "0001775194",  // Upexi
  // HYPE
  "PURR": "0002078856",  // Hyperliquid Strategies
  "HYPD": "0001682639",  // Hyperion DeFi (fka Eyenovia)
  // BNB
  "NA": "0001872302",    // Nano Labs
  // TAO
  "TAOX": "0001571934",  // TAO Synergies (fka Synaptogenix)
  "TWAV": "0000746210",  // TaoWeave (fka Oblong)
  // LINK
  "CWD": "0001627282",   // CaliberCos
  // TRX
  "TRON": "0001956744",  // TRON
  // LTC
  "LITS": "0001262104",  // Lite Strategy (fka MEI Pharma)
  // SUI
  "SUIG": "0001425355",  // Sui Group Holdings (fka Mill City Ventures)
  // DOGE
  "ZONE": "0001956741",  // CleanCore Solutions
  "TBH": "0001903595",   // TBH
  "BTOG": "0001735556",  // Bit Origin
  // AVAX
  "AVX": "0001826397",   // AVAX One Technology (fka AgriFORCE)
  // HBAR (OTC)
  "IHLDF": "0001905459", // IHLDF
};

// Crypto-related keywords by asset
const ASSET_KEYWORDS: Record<string, string[]> = {
  BTC: ['bitcoin', 'btc', 'digital asset', 'cryptocurrency', 'crypto asset'],
  ETH: ['ethereum', 'ether', 'eth', 'digital asset', 'cryptocurrency'],
  SOL: ['solana', 'sol token', 'digital asset', 'cryptocurrency'],
  HYPE: ['hyperliquid', 'hype token', 'digital asset'],
  BNB: ['binance coin', 'bnb', 'digital asset'],
  TAO: ['bittensor', 'tao token', 'digital asset'],
  LINK: ['chainlink', 'link token', 'digital asset'],
  TRX: ['tron', 'trx', 'digital asset'],
  XRP: ['xrp', 'ripple', 'digital asset'],
  ZEC: ['zcash', 'zec', 'digital asset'],
  LTC: ['litecoin', 'ltc', 'digital asset'],
  SUI: ['sui network', 'sui token', 'digital asset'],
  DOGE: ['dogecoin', 'doge', 'digital asset'],
  AVAX: ['avalanche', 'avax', 'digital asset'],
  ADA: ['cardano', 'ada', 'digital asset'],
  HBAR: ['hedera', 'hbar', 'digital asset'],
};

// Filing types we care about
const RELEVANT_FILING_TYPES = ['8-K', '10-K', '10-Q', '6-K', '20-F'];

interface SECCompanyData {
  name: string;
  cik: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

/**
 * Fetch company submission data from SEC EDGAR
 */
async function fetchSECSubmissions(cik: string): Promise<SECCompanyData | null> {
  try {
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`SEC EDGAR API error for CIK ${cik}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching SEC submissions for CIK ${cik}:`, error);
    return null;
  }
}

/**
 * Check if text contains crypto-related terms for a given asset
 */
function containsCryptoTerms(text: string, asset: string): boolean {
  const keywords = ASSET_KEYWORDS[asset] || ['digital asset', 'cryptocurrency'];
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Fetch the content of a filing document
 */
async function fetchFilingContent(documentUrl: string): Promise<string | null> {
  try {
    const response = await fetch(documentUrl, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch filing content: ${response.status}`);
      return null;
    }

    const content = await response.text();
    // Limit content size
    return content.substring(0, 100000);
  } catch (error) {
    console.error('Error fetching filing content:', error);
    return null;
  }
}

/**
 * Check SEC EDGAR for recent filings from tracked companies
 */
export async function checkSECFilings(
  companies: Array<{
    id: number;
    ticker: string;
    asset: string;
  }>,
  sinceDate: Date
): Promise<SECFilingResult[]> {
  const results: SECFilingResult[] = [];
  const sinceDateStr = sinceDate.toISOString().split('T')[0];

  for (const company of companies) {
    const cik = TICKER_TO_CIK[company.ticker.toUpperCase()];
    if (!cik) continue;

    try {
      const data = await fetchSECSubmissions(cik);
      if (!data?.filings?.recent) continue;

      const recent = data.filings.recent;
      const count = Math.min(recent.form.length, 30);

      for (let i = 0; i < count; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];

        // Only check recent filings
        if (filingDate < sinceDateStr) continue;

        // Only check relevant filing types
        const isRelevant = RELEVANT_FILING_TYPES.some(type =>
          formType.startsWith(type)
        );
        if (!isRelevant) continue;

        const accessionNumber = recent.accessionNumber[i].replace(/-/g, '');
        const cikNum = cik.replace(/^0+/, '');
        const primaryDoc = recent.primaryDocument[i];
        const documentUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNumber}/${primaryDoc}`;

        // Check if the filing description mentions crypto
        const description = recent.primaryDocDescription?.[i] || '';
        const hasCryptoInDesc = containsCryptoTerms(description, company.asset);

        // For 8-K filings, check the content
        let hasCryptoInContent = false;
        let rawContent: string | undefined;

        if (formType === '8-K') {
          const content = await fetchFilingContent(documentUrl);
          if (content) {
            hasCryptoInContent = containsCryptoTerms(content, company.asset);
            if (hasCryptoInContent) {
              // Extract relevant portion
              rawContent = extractRelevantContent(content, company.asset);
            }
          }
        }

        if (hasCryptoInDesc || hasCryptoInContent) {
          results.push({
            ticker: company.ticker,
            cik,
            filingType: formType as '8-K' | '10-Q' | '10-K',
            filingDate,
            accessionNumber: recent.accessionNumber[i],
            documentUrl,
            containsCryptoTerms: true,
            rawContent,
          });
        }
      }

      // Rate limiting - SEC requires polite access
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error checking SEC filings for ${company.ticker}:`, error);
    }
  }

  return results;
}

/**
 * Extract relevant content around crypto mentions
 */
function extractRelevantContent(content: string, asset: string): string {
  const keywords = ASSET_KEYWORDS[asset] || ['digital asset'];
  const lowerContent = content.toLowerCase();

  for (const keyword of keywords) {
    const index = lowerContent.indexOf(keyword.toLowerCase());
    if (index !== -1) {
      // Extract 1000 chars before and after
      const start = Math.max(0, index - 1000);
      const end = Math.min(content.length, index + keyword.length + 1000);
      return content.substring(start, end);
    }
  }

  return content.substring(0, 2000);
}

/**
 * Convert SEC filing results to source check results
 */
export async function checkSECFilingsForUpdates(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>,
  sinceDate: Date
): Promise<SourceCheckResult[]> {
  const filings = await checkSECFilings(
    companies.map(c => ({ id: c.id, ticker: c.ticker, asset: c.asset })),
    sinceDate
  );

  const results: SourceCheckResult[] = [];

  for (const filing of filings) {
    const company = companies.find(c => c.ticker === filing.ticker);
    if (!company) continue;

    // SEC filings are official sources - high trust
    // But we need LLM to extract the actual holdings
    results.push({
      sourceType: `sec_${filing.filingType.toLowerCase().replace('-', '')}`,
      companyId: company.id,
      ticker: company.ticker,
      asset: company.asset,
      // No detected holdings yet - needs LLM extraction
      detectedHoldings: undefined,
      confidence: 0.95, // High confidence for SEC filings
      sourceUrl: filing.documentUrl,
      sourceText: filing.rawContent,
      sourceDate: new Date(filing.filingDate),
      trustLevel: 'official',
    });
  }

  return results;
}

/**
 * Get recent filings for a specific company
 */
export async function getRecentFilingsForCompany(
  ticker: string,
  asset: string,
  days: number = 30
): Promise<SECFilingResult[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  return checkSECFilings(
    [{ id: 0, ticker, asset }],
    sinceDate
  );
}

// ============================================================
// ENHANCED FILING SEARCH (uses company-specific patterns)
// ============================================================

interface FilingDocument {
  name: string;
  type?: string;
  size?: number;
}

interface FilingIndex {
  directory: {
    item: FilingDocument[];
    name: string;
  };
}

/**
 * Fetch the filing index to find all documents in a filing
 */
async function fetchFilingIndex(cik: string, accessionNumber: string): Promise<FilingIndex | null> {
  try {
    const accNum = accessionNumber.replace(/-/g, '');
    const cikNum = cik.replace(/^0+/, '');
    const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}/index.json`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)' },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching filing index:', error);
    return null;
  }
}

/**
 * Default file patterns for finding holdings in 8-K filings
 * Companies can override via secFilingPatterns in company-sources.ts
 */
const DEFAULT_8K_PATTERNS = [
  /ex99|ex-99/i,           // Standard exhibits
  /press|release/i,         // Press releases
  /shareholder|letter/i,    // Shareholder letters (MARA)
  /announce|earnings/i,     // Earnings announcements
  /update/i,                // Production updates
  /^\w+-\d{8}\.htm$/i,      // Primary document: ticker-YYYYMMDD.htm (MSTR, etc.)
  /^d\d+d\w+\.htm$/i,       // Alternative: d123456dex991.htm format
];

/**
 * Search all documents in a filing for crypto holdings mentions
 * Uses company-specific patterns from company-sources.ts
 */
export async function searchFilingDocuments(
  ticker: string,
  cik: string,
  accessionNumber: string,
  asset: string
): Promise<{ documentUrl: string; content: string } | null> {
  const companySource = getCompanySource(ticker);
  const cikNum = cik.replace(/^0+/, '');
  const accNum = accessionNumber.replace(/-/g, '');

  // Get filing index
  const indexData = await fetchFilingIndex(cik, accessionNumber);
  if (!indexData?.directory?.item) return null;

  // Determine patterns to use
  // Always include primary document patterns, plus company-specific if defined
  const basePatterns = [
    /^\w+-\d{8}\.htm$/i,      // Primary document: ticker-YYYYMMDD.htm (MSTR, etc.)
    /^d\d+d\w+\.htm$/i,       // Alternative: d123456dex991.htm format
  ];
  const companyPatterns = companySource?.secFilingPatterns?.eightK || DEFAULT_8K_PATTERNS;
  const patterns = [...new Set([...basePatterns, ...companyPatterns])];

  // Find matching documents
  const matchingDocs = indexData.directory.item.filter(item => {
    if (!item.name.match(/\.htm$/i)) return false;
    return patterns.some(pattern => item.name.match(pattern));
  });

  // Sort by size (larger documents usually have more content)
  matchingDocs.sort((a, b) => (b.size || 0) - (a.size || 0));

  const keywords = ASSET_KEYWORDS[asset] || ['digital asset', 'cryptocurrency'];

  // Check each matching document for crypto mentions
  for (const doc of matchingDocs.slice(0, 5)) {
    const documentUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNum}/${doc.name}`;

    try {
      const response = await fetch(documentUrl, {
        headers: { 'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)' },
      });

      if (!response.ok) continue;

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

      if (content.length < 500) continue;

      // Check for crypto mentions
      const lowerContent = content.toLowerCase();
      const hasCrypto = keywords.some(kw => lowerContent.includes(kw.toLowerCase()));

      if (hasCrypto) {
        return { documentUrl, content };
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`Error fetching document ${doc.name}:`, error);
    }
  }

  return null;
}

/**
 * Enhanced filing check that searches all documents using company-specific patterns
 */
export async function checkSECFilingsEnhanced(
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
    const companySource = getCompanySource(company.ticker);
    const cik = companySource?.secCik || TICKER_TO_CIK[company.ticker.toUpperCase()];
    if (!cik) continue;

    console.log(`[SEC] Checking ${company.ticker}...`);

    try {
      const data = await fetchSECSubmissions(cik);
      if (!data?.filings?.recent) continue;

      const recent = data.filings.recent;
      const count = Math.min(recent.form.length, 30);

      for (let i = 0; i < count; i++) {
        const formType = recent.form[i];
        const filingDate = recent.filingDate[i];

        // Only check recent filings
        if (filingDate < sinceDateStr) break;

        // Only check relevant filing types
        if (!['8-K', '10-Q', '10-K'].includes(formType)) continue;

        const accessionNumber = recent.accessionNumber[i];

        // Search all documents in the filing
        const result = await searchFilingDocuments(
          company.ticker,
          cik,
          accessionNumber,
          company.asset
        );

        if (result) {
          console.log(`[SEC] Found crypto content in ${company.ticker} ${formType} from ${filingDate}`);

          results.push({
            sourceType: `sec_${formType.toLowerCase().replace('-', '')}`,
            companyId: company.id,
            ticker: company.ticker,
            asset: company.asset,
            detectedHoldings: undefined, // Needs LLM extraction
            confidence: 0.95,
            sourceUrl: result.documentUrl,
            sourceText: result.content.substring(0, 30000),
            sourceDate: new Date(filingDate),
            trustLevel: 'official',
          });

          // Found a filing with crypto content, move to next company
          break;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) {
      console.error(`[SEC] Error checking ${company.ticker}:`, error);
    }

    // Rate limit between companies
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}
