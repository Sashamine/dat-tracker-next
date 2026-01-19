/**
 * Financial Data Extractor
 *
 * Fetches EV-related financial data (debt, cash, preferred equity) for companies.
 * Uses FMP API for US companies, falls back to filing parsing for international.
 */

import { query } from '@/lib/db';

interface FinancialData {
  ticker: string;
  totalDebt: number | null;
  preferredEquity: number | null;
  cashReserves: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  sharesOutstanding: number | null;
  reportDate: string | null;
  source: string;
}

interface FMPBalanceSheet {
  date: string;
  symbol: string;
  reportedCurrency: string;
  fillingDate: string;
  totalDebt: number;
  cashAndCashEquivalents: number;
  shortTermInvestments: number;
  totalCurrentAssets: number;
  totalAssets: number;
  totalLiabilities: number;
  totalStockholdersEquity: number;
  preferredStock: number;
  commonStock: number;
  totalEquity: number;
  commonStockSharesOutstanding: number;
  // Debt breakdown
  shortTermDebt: number;
  longTermDebt: number;
  capitalLeaseObligations: number;
}

interface FMPQuote {
  symbol: string;
  sharesOutstanding: number;
  marketCap: number;
}

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

/**
 * Fetch balance sheet data from FMP API
 */
async function fetchFMPBalanceSheet(ticker: string): Promise<FMPBalanceSheet | null> {
  if (!FMP_API_KEY) {
    console.warn('[Financial] FMP_API_KEY not configured');
    return null;
  }

  try {
    // Try quarterly first (more recent)
    const url = `${FMP_BASE_URL}/balance-sheet-statement/${ticker}?period=quarter&limit=1&apikey=${FMP_API_KEY}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[Financial] FMP API error for ${ticker}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      // Try annual if quarterly not available
      const annualUrl = `${FMP_BASE_URL}/balance-sheet-statement/${ticker}?period=annual&limit=1&apikey=${FMP_API_KEY}`;
      const annualResponse = await fetch(annualUrl, { cache: 'no-store' });

      if (!annualResponse.ok) return null;

      const annualData = await annualResponse.json();
      return Array.isArray(annualData) && annualData.length > 0 ? annualData[0] : null;
    }

    return data[0];
  } catch (error) {
    console.error(`[Financial] Error fetching balance sheet for ${ticker}:`, error);
    return null;
  }
}

/**
 * Fetch shares outstanding from FMP quote API (more current than balance sheet)
 */
async function fetchFMPQuote(ticker: string): Promise<FMPQuote | null> {
  if (!FMP_API_KEY) return null;

  try {
    const url = `${FMP_BASE_URL}/quote/${ticker}?apikey=${FMP_API_KEY}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`[Financial] Error fetching quote for ${ticker}:`, error);
    return null;
  }
}

/**
 * Get financial data for a US company from FMP
 */
export async function getUSCompanyFinancials(ticker: string): Promise<FinancialData | null> {
  console.log(`[Financial] Fetching data for ${ticker}...`);

  const [balanceSheet, quote] = await Promise.all([
    fetchFMPBalanceSheet(ticker),
    fetchFMPQuote(ticker),
  ]);

  if (!balanceSheet) {
    console.log(`[Financial] No balance sheet data for ${ticker}`);
    return null;
  }

  // Calculate total debt (short + long + lease)
  const totalDebt = (balanceSheet.shortTermDebt || 0) +
                    (balanceSheet.longTermDebt || 0) +
                    (balanceSheet.capitalLeaseObligations || 0);

  // Cash includes short-term investments
  const cashReserves = (balanceSheet.cashAndCashEquivalents || 0) +
                       (balanceSheet.shortTermInvestments || 0);

  const financials: FinancialData = {
    ticker,
    totalDebt: totalDebt > 0 ? totalDebt : null,
    preferredEquity: balanceSheet.preferredStock > 0 ? balanceSheet.preferredStock : null,
    cashReserves: cashReserves > 0 ? cashReserves : null,
    totalAssets: balanceSheet.totalAssets || null,
    totalLiabilities: balanceSheet.totalLiabilities || null,
    sharesOutstanding: quote?.sharesOutstanding || balanceSheet.commonStockSharesOutstanding || null,
    reportDate: balanceSheet.date,
    source: 'fmp_api',
  };

  console.log(`[Financial] ${ticker}: debt=$${(totalDebt/1e9).toFixed(2)}B, cash=$${(cashReserves/1e9).toFixed(2)}B, pref=$${((balanceSheet.preferredStock || 0)/1e9).toFixed(2)}B`);

  return financials;
}

/**
 * Update company financials in database
 */
export async function updateCompanyFinancials(
  ticker: string,
  financials: Partial<FinancialData>
): Promise<boolean> {
  try {
    // Get company ID
    const companies = await query(
      'SELECT id FROM companies WHERE ticker = $1',
      [ticker]
    );

    if (!companies || companies.length === 0) {
      console.error(`[Financial] Company not found: ${ticker}`);
      return false;
    }

    const companyId = companies[0].id;

    // Update financials (upsert pattern)
    await query(`
      UPDATE company_financials
      SET
        total_debt = COALESCE($1, total_debt),
        preferred_equity = COALESCE($2, preferred_equity),
        cash_reserves = COALESCE($3, cash_reserves),
        shares_outstanding = COALESCE($4, shares_outstanding),
        updated_at = NOW()
      WHERE company_id = $5 AND end_date IS NULL
    `, [
      financials.totalDebt,
      financials.preferredEquity,
      financials.cashReserves,
      financials.sharesOutstanding,
      companyId,
    ]);

    console.log(`[Financial] Updated ${ticker} financials in database`);
    return true;
  } catch (error) {
    console.error(`[Financial] Error updating ${ticker}:`, error);
    return false;
  }
}

/**
 * Fetch and update financials for multiple companies
 */
export async function refreshCompanyFinancials(
  tickers: string[]
): Promise<{ updated: string[]; failed: string[] }> {
  const updated: string[] = [];
  const failed: string[] = [];

  for (const ticker of tickers) {
    try {
      const financials = await getUSCompanyFinancials(ticker);

      if (financials) {
        const success = await updateCompanyFinancials(ticker, financials);
        if (success) {
          updated.push(ticker);
        } else {
          failed.push(ticker);
        }
      } else {
        failed.push(ticker);
      }

      // Rate limit - FMP has request limits
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.error(`[Financial] Error processing ${ticker}:`, error);
      failed.push(ticker);
    }
  }

  return { updated, failed };
}

/**
 * List of tickers that have significant debt/preferred that should be monitored
 */
export const COMPANIES_WITH_DEBT = [
  'MSTR',  // $8.2B debt, $7.8B preferred
  'MARA',  // $1.8B converts
  'RIOT',  // $794M converts
  'CLSK',  // $1.15B debt
  'HUT',   // ~$350M debt
  'CORZ',  // Significant debt post-bankruptcy
];

/**
 * Quarterly financial refresh job
 * Should be run after earnings season (mid-Feb, mid-May, mid-Aug, mid-Nov)
 */
export async function runQuarterlyFinancialRefresh(): Promise<{
  updated: string[];
  failed: string[];
  timestamp: string;
}> {
  console.log('[Financial] Starting quarterly financial refresh...');

  const result = await refreshCompanyFinancials(COMPANIES_WITH_DEBT);

  console.log(`[Financial] Refresh complete: ${result.updated.length} updated, ${result.failed.length} failed`);

  return {
    ...result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Parse debt information from SEC 10-Q/10-K filing text
 * Used as fallback when FMP data is unavailable or for verification
 */
export function parseDebtFromFiling(
  filingText: string,
  _companyName: string
): { totalDebt: number | null; details: string[] } {
  const details: string[] = [];
  let totalDebt = 0;

  // Common patterns for debt disclosure
  const debtPatterns = [
    // Convertible notes
    /convertible\s+(?:senior\s+)?notes[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    // Long-term debt
    /long[- ]term\s+debt[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    // Total debt
    /total\s+debt[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    // Credit facility
    /credit\s+(?:facility|line)[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
  ];

  for (const pattern of debtPatterns) {
    let match;
    while ((match = pattern.exec(filingText)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const context = filingText.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50);

      // Check if million or billion
      const isBillion = /billion/i.test(match[0]);
      const isMillion = /million/i.test(match[0]);

      let value = amount;
      if (isBillion) value *= 1_000_000_000;
      else if (isMillion) value *= 1_000_000;
      else if (amount < 1000) value *= 1_000_000; // Assume millions if no unit and small number

      details.push(`Found: $${(value/1e9).toFixed(2)}B - "${context.trim()}"`);
      totalDebt = Math.max(totalDebt, value); // Take largest value found
    }
  }

  return {
    totalDebt: totalDebt > 0 ? totalDebt : null,
    details,
  };
}

/**
 * Parse cash/investments from SEC filing text
 */
export function parseCashFromFiling(
  filingText: string
): { cashReserves: number | null; details: string[] } {
  const details: string[] = [];
  let cashReserves = 0;

  const cashPatterns = [
    /cash\s+and\s+cash\s+equivalents[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    /total\s+cash[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
    /short[- ]term\s+investments[^$]*\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|billion)?/gi,
  ];

  for (const pattern of cashPatterns) {
    let match;
    while ((match = pattern.exec(filingText)) !== null) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      const context = filingText.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30);

      const isBillion = /billion/i.test(match[0]);
      const isMillion = /million/i.test(match[0]);

      let value = amount;
      if (isBillion) value *= 1_000_000_000;
      else if (isMillion) value *= 1_000_000;
      else if (amount < 1000) value *= 1_000_000;

      details.push(`Found: $${(value/1e9).toFixed(2)}B - "${context.trim()}"`);
      cashReserves = Math.max(cashReserves, value);
    }
  }

  return {
    cashReserves: cashReserves > 0 ? cashReserves : null,
    details,
  };
}
