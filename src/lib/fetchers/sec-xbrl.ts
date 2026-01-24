/**
 * SEC XBRL Fetcher
 *
 * Fetches balance sheet data from SEC EDGAR XBRL API.
 * This provides authoritative, audited financial data from quarterly filings.
 *
 * API endpoint: https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json
 *
 * Note: Data is from most recent 10-Q/10-K filing, which may be 1-3 months old.
 * For more current data, use official dashboards (strategy.com) or aggregators (mNAV).
 */

import { FetchResult, Fetcher, FetchField } from './types';

// Map tickers to SEC CIK numbers
// CIKs verified against SEC EDGAR on 2026-01-21
const TICKER_TO_CIK: Record<string, string> = {
  // BTC
  'MSTR': '0001050446',  // Strategy (fka MicroStrategy)
  'MARA': '0001507605',  // MARA Holdings
  'RIOT': '0001167419',  // Riot Platforms
  'CLSK': '0000827876',  // CleanSpark
  'HUT': '0001964789',   // Hut 8
  'CORZ': '0001839341',  // Core Scientific
  'BTDR': '0001899123',  // Bitdeer
  'KULR': '0001662684',  // KULR Technology
  'NAKA': '0001946573',  // Nakamoto (KindlyMD post-merger)
  'DJT': '0001849635',   // Trump Media
  'XXI': '0001865602',   // Twenty One Capital (Cantor Equity Partners)
  'ASST': '0001920406',  // Strive
  'NXTT': '0001784970',  // Next Technology Holding
  'ABTC': '0002068580',  // American Bitcoin
  // ETH
  'BMNR': '0001829311',  // Bitmine Immersion
  'SBET': '0001981535',  // SharpLink Gaming
  'ETHM': '0002080334',  // The Ether Machine (Dynamix merger)
  'BTBT': '0001710350',  // Bit Digital
  'BTCS': '0001436229',  // BTCS Inc
  'GAME': '0001714562',  // GameSquare Holdings
  // SOL
  'FWDI': '0000038264',  // Forward Industries
  'HSDT': '0001610853',  // Helius
  'DFDV': '0001805526',  // DeFi Development Corp
};

interface XBRLEntry {
  val: number;
  end: string;  // Period end date
  form: string; // 10-K, 10-Q, etc.
  filed: string;
  fy?: number;
  fp?: string;
}

interface XBRLUnits {
  USD?: XBRLEntry[];
  shares?: XBRLEntry[];
}

interface XBRLFact {
  units: XBRLUnits;
}

interface XBRLCompanyFacts {
  entityName: string;
  cik: string;
  facts: {
    'us-gaap'?: Record<string, XBRLFact>;
    'dei'?: Record<string, XBRLFact>;
  };
}

// XBRL field mappings to our comparison fields
const XBRL_FIELD_MAPPINGS: Record<FetchField, { gaapFields: string[]; deiFields?: string[] }> = {
  holdings: {
    // Holdings aren't in XBRL - they're disclosed in 8-K text, not structured data
    gaapFields: [],
  },
  shares_outstanding: {
    gaapFields: ['CommonStockSharesOutstanding'],
    deiFields: ['EntityCommonStockSharesOutstanding'],
  },
  debt: {
    gaapFields: [
      'LongTermDebt',
      'LongTermDebtNoncurrent',
      'DebtCurrent',
      'ConvertibleLongTermNotesPayable',
    ],
  },
  cash: {
    gaapFields: [
      'CashAndCashEquivalentsAtCarryingValue',
      'Cash',
      'CashCashEquivalentsAndShortTermInvestments',
    ],
  },
  preferred_equity: {
    gaapFields: [
      'TemporaryEquityCarryingAmountAttributableToParent', // MSTR's STRK/STRF
      'PreferredStockValue',
      'RedeemablePreferredStockCarryingAmount',
    ],
  },
  mnav: {
    // mNAV is calculated, not in SEC filings
    gaapFields: [],
  },
};

async function fetchCompanyFacts(cik: string): Promise<XBRLCompanyFacts | null> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DAT-Tracker research@dattracker.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[SEC XBRL] ${cik}: HTTP ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[SEC XBRL] Error fetching ${cik}:`, error);
    return null;
  }
}

/**
 * Get the most recent value for a field from XBRL data
 * Prefers 10-Q and 10-K filings over other form types
 */
function getMostRecentValue(
  facts: XBRLCompanyFacts['facts'],
  fieldName: string,
  namespace: 'us-gaap' | 'dei',
  unitType: 'USD' | 'shares'
): { value: number; date: string; form: string; filed: string } | null {
  const nsFacts = namespace === 'us-gaap' ? facts['us-gaap'] : facts['dei'];
  if (!nsFacts?.[fieldName]) return null;

  const entries = nsFacts[fieldName].units[unitType];
  if (!entries || entries.length === 0) return null;

  // Filter to quarterly filings (10-K, 10-Q, and their amendments)
  const quarterlyForms = ['10-K', '10-Q', '10-K/A', '10-Q/A'];
  const quarterlyEntries = entries.filter(e => quarterlyForms.includes(e.form));

  if (quarterlyEntries.length === 0) return null;

  // Sort by period end date descending, then by filed date descending
  const sorted = quarterlyEntries.sort((a, b) => {
    const dateCompare = b.end.localeCompare(a.end);
    if (dateCompare !== 0) return dateCompare;
    return b.filed.localeCompare(a.filed);
  });

  const latest = sorted[0];
  return {
    value: latest.val,
    date: latest.end,
    form: latest.form,
    filed: latest.filed,
  };
}

/**
 * Extract a comparison field value from XBRL data
 */
function extractFieldValue(
  facts: XBRLCompanyFacts['facts'],
  field: FetchField
): { value: number; date: string; form: string; filed: string } | null {
  const mapping = XBRL_FIELD_MAPPINGS[field];

  // Try us-gaap fields first
  for (const gaapField of mapping.gaapFields) {
    const unitType = field === 'shares_outstanding' ? 'shares' : 'USD';
    const result = getMostRecentValue(facts, gaapField, 'us-gaap', unitType);
    if (result && result.value > 0) {
      return result;
    }
  }

  // Try dei fields if available
  if (mapping.deiFields) {
    for (const deiField of mapping.deiFields) {
      const unitType = field === 'shares_outstanding' ? 'shares' : 'USD';
      const result = getMostRecentValue(facts, deiField, 'dei', unitType);
      if (result && result.value > 0) {
        return result;
      }
    }
  }

  return null;
}

export const secXbrlFetcher: Fetcher = {
  name: 'SEC XBRL',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    const fieldsToFetch: FetchField[] = ['shares_outstanding', 'debt', 'cash', 'preferred_equity'];

    for (const ticker of tickers) {
      const cik = TICKER_TO_CIK[ticker];
      if (!cik) {
        console.log(`[SEC XBRL] No CIK for ${ticker}, skipping`);
        continue;
      }

      console.log(`[SEC XBRL] Fetching ${ticker} (CIK ${cik})...`);
      const data = await fetchCompanyFacts(cik);

      if (!data?.facts) {
        console.log(`[SEC XBRL] No facts for ${ticker}`);
        continue;
      }

      const fetchedAt = new Date();

      for (const field of fieldsToFetch) {
        const extracted = extractFieldValue(data.facts, field);

        if (extracted) {
          results.push({
            ticker,
            field,
            value: extracted.value,
            source: {
              name: `SEC ${extracted.form}`,
              url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${extracted.form}`,
              date: extracted.date,  // Period end date
            },
            fetchedAt,
            raw: {
              filedDate: extracted.filed,
              form: extracted.form,
              periodEnd: extracted.date,
            },
          });
        }
      }

      // Rate limit - SEC requires polite access (max 10 req/sec)
      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`[SEC XBRL] Got ${results.length} data points`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return Object.keys(TICKER_TO_CIK);
}
