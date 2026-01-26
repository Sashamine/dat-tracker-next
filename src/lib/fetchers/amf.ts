/**
 * AMF (Autorité des marchés financiers) Fetcher
 *
 * Fetches regulatory filings from the French financial regulator's API.
 * API endpoint: https://dilaamf.opendatasoft.com/api/v2/
 *
 * Used for companies like Capital B (The Blockchain Group) - ALTBG on TSX Venture.
 *
 * API Documentation:
 * - Swagger: https://dilaamf.opendatasoft.com/api/v2/swagger.yaml
 * - Dataset: flux-amf-new-prod
 */

import { FetchResult, Fetcher } from './types';

// Map tickers to their ISIN codes for AMF lookup
const TICKER_TO_ISIN: Record<string, string> = {
  'ALTBG': 'FR0011053636',  // Capital B (The Blockchain Group)
};

// Map ISINs to company names (for display)
const ISIN_TO_NAME: Record<string, string> = {
  'FR0011053636': 'Capital B',
};

interface AmfRecordFields {
  identificationsociete_iso_cd_isi: string;  // ISIN
  identificationsociete_iso_nom_soc: string; // Company name
  informationdeposee_inf_dat_emt: string;    // Filing date (ISO 8601)
  informationdeposee_inf_tit_inf: string;    // Filing title
  url_de_recuperation: string;               // PDF URL
  identificationsociete_iso_cd_lei?: string; // LEI code
}

interface AmfApiRecord {
  record: {
    id: string;
    fields: AmfRecordFields;
  };
}

interface AmfApiResponse {
  total_count: number;
  records: AmfApiRecord[];
}

// Flattened record for internal use
interface AmfRecord {
  isin: string;
  companyName: string;
  filingDate: string;
  title: string;
  pdfUrl: string;
}

/**
 * Parse BTC holdings from AMF filing title.
 *
 * Example titles:
 * - "Capital B confirms the acquisition of 5 BTC for EUR0.4 million, the holding of a total of 2,823 BTC"
 * - "Capital B announces the acquisition of 100 BTC bringing total holdings to 3,000 BTC"
 *
 * Returns the total holdings number if found, null otherwise.
 */
export function parseBtcHoldingsFromTitle(title: string): number | null {
  // Pattern 1: "total of X,XXX BTC" or "total of X BTC"
  const totalOfMatch = title.match(/total\s+of\s+([\d,]+)\s*BTC/i);
  if (totalOfMatch) {
    return parseInt(totalOfMatch[1].replace(/,/g, ''), 10);
  }

  // Pattern 2: "holdings to X,XXX BTC" or "holdings to X BTC"
  const holdingsToMatch = title.match(/holdings?\s+to\s+([\d,]+)\s*BTC/i);
  if (holdingsToMatch) {
    return parseInt(holdingsToMatch[1].replace(/,/g, ''), 10);
  }

  // Pattern 3: "holding X,XXX BTC" (present tense)
  const holdingMatch = title.match(/holding\s+([\d,]+)\s*BTC/i);
  if (holdingMatch) {
    return parseInt(holdingMatch[1].replace(/,/g, ''), 10);
  }

  return null;
}

/**
 * Fetch AMF filings for a given ISIN.
 *
 * @param isin - ISIN code (e.g., FR0011053636)
 * @param limit - Max number of filings to return (default 50)
 */
/**
 * Extract YYYY-MM-DD date from ISO 8601 timestamp.
 */
function extractDate(isoTimestamp: string): string {
  // Handle format like "2025-12-08T07:00:00+00:00"
  return isoTimestamp.split('T')[0];
}

async function fetchAmfFilings(isin: string, limit: number = 50): Promise<AmfRecord[]> {
  try {
    const baseUrl = 'https://dilaamf.opendatasoft.com/api/v2/catalog/datasets/flux-amf-new-prod/records';
    const params = new URLSearchParams({
      where: `identificationsociete_iso_cd_isi="${isin}"`,
      order_by: 'informationdeposee_inf_dat_emt desc',
      limit: limit.toString(),
    });

    const url = `${baseUrl}?${params.toString()}`;
    console.log(`[AMF] Fetching filings for ISIN ${isin}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[AMF] HTTP ${response.status} for ISIN ${isin}`);
      return [];
    }

    const data: AmfApiResponse = await response.json();
    console.log(`[AMF] Found ${data.total_count} filings for ${isin}`);

    // Flatten the nested structure
    return data.records.map((record) => ({
      isin: record.record.fields.identificationsociete_iso_cd_isi,
      companyName: record.record.fields.identificationsociete_iso_nom_soc,
      filingDate: extractDate(record.record.fields.informationdeposee_inf_dat_emt),
      title: record.record.fields.informationdeposee_inf_tit_inf,
      pdfUrl: record.record.fields.url_de_recuperation,
    }));
  } catch (error) {
    console.error(`[AMF] Error fetching ISIN ${isin}:`, error);
    return [];
  }
}

/**
 * Find the most recent filing with BTC holdings data.
 */
function findLatestHoldingsFiling(filings: AmfRecord[]): { filing: AmfRecord; holdings: number } | null {
  for (const filing of filings) {
    const holdings = parseBtcHoldingsFromTitle(filing.title);
    if (holdings !== null && holdings > 0) {
      return { filing, holdings };
    }
  }
  return null;
}

export const amfFetcher: Fetcher = {
  name: 'AMF (France)',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];

    for (const ticker of tickers) {
      const isin = TICKER_TO_ISIN[ticker];
      if (!isin) {
        console.log(`[AMF] No ISIN mapping for ${ticker}, skipping`);
        continue;
      }

      const filings = await fetchAmfFilings(isin);
      if (filings.length === 0) {
        console.log(`[AMF] No filings found for ${ticker}`);
        continue;
      }

      const fetchedAt = new Date();
      const latestHoldings = findLatestHoldingsFiling(filings);

      if (latestHoldings) {
        const { filing, holdings } = latestHoldings;

        results.push({
          ticker,
          field: 'holdings',
          value: holdings,
          source: {
            name: 'AMF (France)',
            url: filing.pdfUrl || `https://info-financiere.fr/recherche?search=${isin}`,
            date: filing.filingDate,
          },
          fetchedAt,
          raw: {
            title: filing.title,
            companyName: filing.companyName,
            isin,
            filingDate: filing.filingDate,
          },
        });

        console.log(`[AMF] ${ticker}: ${holdings} BTC as of ${filing.filingDate}`);
      } else {
        console.log(`[AMF] ${ticker}: No holdings data found in recent filings`);
      }

      // Rate limit - be polite to their API
      await new Promise(r => setTimeout(r, 500));
    }

    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return Object.keys(TICKER_TO_ISIN);
}

/**
 * Direct API access for manual verification.
 * Returns all filings for a company, useful for debugging.
 */
export async function getAmfFilings(ticker: string, limit: number = 50): Promise<AmfRecord[]> {
  const isin = TICKER_TO_ISIN[ticker];
  if (!isin) {
    throw new Error(`No ISIN mapping for ticker ${ticker}`);
  }
  return fetchAmfFilings(isin, limit);
}

/**
 * Parse holdings from all filings (for historical analysis).
 */
export async function getHoldingsHistory(ticker: string): Promise<Array<{
  date: string;
  holdings: number;
  title: string;
  pdfUrl: string;
}>> {
  const filings = await getAmfFilings(ticker, 200);
  const history: Array<{
    date: string;
    holdings: number;
    title: string;
    pdfUrl: string;
  }> = [];

  for (const filing of filings) {
    const holdings = parseBtcHoldingsFromTitle(filing.title);
    if (holdings !== null && holdings > 0) {
      history.push({
        date: filing.filingDate,
        holdings,
        title: filing.title,
        pdfUrl: filing.pdfUrl,
      });
    }
  }

  return history;
}
