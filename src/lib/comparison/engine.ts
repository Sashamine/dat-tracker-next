/**
 * Comparison Engine
 *
 * Compares our TypeScript values (companies.ts) against fetched values from sources.
 * Creates discrepancy records when values differ.
 *
 * Flow:
 * 1. Load our values from companies.ts
 * 2. Fetch from configured sources (mNAV, dashboards, etc.)
 * 3. Compare: if ANY source differs from our value → discrepancy
 * 4. Record fetch results and discrepancies in database
 */

import { allCompanies } from '../data/companies';
import { getLatestDilutedShares, getLatestHoldings, getLatestSnapshot } from '../data/holdings-history';
import { fetchers, FetchResult, FetchError } from '../fetchers';
import { query } from '../db';
import type { HoldingsSource } from '../types';
import { verifySource, VerificationResult } from './source-verifier';
import { calculateConfidence, ConfidenceResult } from './confidence-scorer';
import { calculateMNAV } from '../calculations';
import { getMarketCapForMnavSync } from '../utils/market-cap';
import { FALLBACK_RATES } from '../utils/currency';
import { getBinancePrices } from '../binance';
import { getCompanySources } from '../data/company-sources';

// Companies with official mNAV dashboards - we compare our calculated mNAV against theirs
const MNAV_DASHBOARD_TICKERS = new Set([
  '3350.T',   // Metaplanet - metaplanet.jp/analytics
  'MSTR',     // Strategy - strategy.com
  'SBET',     // SharpLink - sharplink.com/eth-dashboard
  'DFDV',     // DeFi Dev - defidevcorp.com/dashboard
  'LITS',     // Lite Strategy - litestrategy.com/dashboard
  'KULR',     // KULR Tech - kulrbitcointracker.com
  'UPXI',     // Upexi - upexi.com
  'ALTBG',    // Capital B - cptlb.com/analytics (NAV per share)
]);

// Price data interface for mNAV calculation
interface PriceData {
  crypto: Record<string, { price: number }>;
  stocks: Record<string, { price: number; marketCap: number }>;
  forex: Record<string, number>;
}

// Types matching our schema
export type ComparisonField = 'holdings' | 'shares_outstanding' | 'debt' | 'cash' | 'preferred_equity' | 'mnav';

export interface OurValue {
  ticker: string;
  companyId?: number;  // DB id, looked up during comparison
  field: ComparisonField;
  value: number;
  // Source info for verification (Phase 7b)
  sourceUrl?: string;
  sourceType?: HoldingsSource;
  // Date-aware comparison (Phase 7d)
  sourceDate?: string;  // YYYY-MM-DD - when our source data is from
}

export interface ComparisonResult {
  ticker: string;
  field: ComparisonField;
  ourValue: number;
  ourSourceDate?: string;  // YYYY-MM-DD - when our data is from
  ourSourceUrl?: string;   // URL we cite as source
  ourSourceType?: HoldingsSource;  // Type of source (sec-8k, sec-10k, dashboard, etc.)
  sourceValues: Record<string, {
    value: number;
    url: string;
    date: string;
  }>;
  hasDiscrepancy: boolean;
  maxDeviationPct: number;
  severity: 'minor' | 'moderate' | 'major';
  // Date-aware comparison (Phase 7d)
  newerSourceFound: boolean;  // true if any external source is newer than ours
  newerSourceDate?: string;   // date of the newest external source
  // Phase 7b: Source verification result
  verification?: VerificationResult;
  // Phase 7c: Confidence scoring
  confidence?: ConfidenceResult;
  // Verification hint based on source type
  verificationMethod?: 'xbrl' | 'fetcher' | 'manual';  // How this can be verified
}

// FMP API key for stock prices and forex
const FMP_API_KEY = process.env.FMP_API_KEY || '';

/**
 * Fetch live prices for mNAV calculation.
 * Uses direct API calls to avoid self-referential serverless function issues.
 */
async function fetchLivePrices(): Promise<PriceData | null> {
  try {
    console.log('[Comparison] Fetching live prices directly...');

    // 1. Get crypto prices from Binance
    const crypto = await getBinancePrices();
    console.log(`[Comparison] Got ${Object.keys(crypto).length} crypto prices`);

    // 2. Get forex rates from FMP
    let forex: Record<string, number> = { ...FALLBACK_RATES };
    if (FMP_API_KEY) {
      try {
        // Use stable/batch-quote endpoint (same as /api/prices)
        const forexResponse = await fetch(
          `https://financialmodelingprep.com/stable/batch-quote?symbols=USDJPY,USDHKD,USDSEK&apikey=${FMP_API_KEY}`,
          { cache: 'no-store' }
        );
        if (forexResponse.ok) {
          const forexData = await forexResponse.json();
          if (Array.isArray(forexData)) {
            for (const rate of forexData) {
              if (rate.symbol === 'USDJPY') forex.JPY = rate.price;
              if (rate.symbol === 'USDHKD') forex.HKD = rate.price;
              if (rate.symbol === 'USDSEK') forex.SEK = rate.price;
            }
          }
        }
      } catch (e) {
        console.warn('[Comparison] Forex fetch failed, using fallback rates');
      }
    }
    console.log(`[Comparison] Forex rates: JPY=${forex.JPY}`);

    // 3. Get stock prices from FMP (for non-USD stocks like 3350.T)
    const stocks: Record<string, { price: number; marketCap: number }> = {};
    if (FMP_API_KEY) {
      const stockTickers = ['3350.T', 'MSTR']; // Tickers with mNAV dashboards
      try {
        // Use stable/batch-quote endpoint (same as /api/prices)
        const stockResponse = await fetch(
          `https://financialmodelingprep.com/stable/batch-quote?symbols=${stockTickers.join(',')}&apikey=${FMP_API_KEY}`,
          { cache: 'no-store' }
        );
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          if (Array.isArray(stockData)) {
            for (const stock of stockData) {
              if (stock?.symbol) {
                stocks[stock.symbol] = {
                  price: stock.price || 0,
                  marketCap: stock.marketCap || 0,
                };
                console.log(`[Comparison] ${stock.symbol}: price=${stock.price}`);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Comparison] Failed to fetch stock prices');
      }
    }

    return { crypto, stocks, forex };
  } catch (error) {
    console.error('[Comparison] Error fetching prices:', error);
    return null;
  }
}

/**
 * Load our current values from holdings-history.ts (primary) and companies.ts (fallback)
 *
 * Priority for comparison engine:
 * - Holdings: holdings-history.ts > companies.ts (history is more granular)
 * - Shares: companies.ts (sharesForMnav) > holdings-history.ts (companies.ts is actively maintained)
 * - Debt/Cash/Preferred: companies.ts (no history tracking yet)
 *
 * Date-aware comparison (Phase 7d):
 * Each value includes a sourceDate so we can compare against external source dates.
 * Only flag discrepancy if external source is NEWER than our source.
 *
 * @param prices - Optional live price data for accurate mNAV calculation
 */
export function loadOurValues(prices?: PriceData | null): OurValue[] {
  const values: OurValue[] = [];

  for (const company of allCompanies) {
    // Get latest snapshot for source info (Phase 7b)
    const snapshot = getLatestSnapshot(company.ticker);

    // Holdings: prefer holdings-history.ts, fallback to companies.ts
    const holdingsFromHistory = getLatestHoldings(company.ticker);
    const holdings = holdingsFromHistory ?? company.holdings;
    // Date: snapshot date > holdingsLastUpdated
    const holdingsDate = snapshot?.date ?? company.holdingsLastUpdated;
    values.push({
      ticker: company.ticker,
      field: 'holdings',
      value: holdings,
      sourceUrl: snapshot?.sourceUrl,
      sourceType: snapshot?.sourceType,
      sourceDate: holdingsDate,
    });

    // Shares outstanding: prefer companies.ts sharesForMnav (actively maintained), fallback to holdings-history.ts
    const sharesFromHistory = getLatestDilutedShares(company.ticker);
    const shares = company.sharesForMnav ?? sharesFromHistory;
    if (shares !== undefined) {
      // Date: sharesAsOf from snapshot > snapshot date > holdingsLastUpdated
      const sharesDate = snapshot?.sharesAsOf ?? snapshot?.date ?? company.holdingsLastUpdated;
      values.push({
        ticker: company.ticker,
        field: 'shares_outstanding',
        value: shares,
        sourceUrl: snapshot?.sourceUrl,
        sourceType: snapshot?.sourceType,
        sourceDate: sharesDate,
      });
    }

    // Debt (from companies.ts - no history tracking yet)
    if (company.totalDebt !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'debt',
        value: company.totalDebt,
        sourceDate: company.debtAsOf,
      });
    }

    // Cash (from companies.ts - no history tracking yet)
    if (company.cashReserves !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'cash',
        value: company.cashReserves,
        sourceDate: company.cashAsOf,
      });
    }

    // Preferred equity (from companies.ts - no history tracking yet)
    if (company.preferredEquity !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'preferred_equity',
        value: company.preferredEquity,
        // Preferred equity doesn't have its own date field, use debt date as proxy
        sourceDate: company.debtAsOf,
      });
    }

    // mNAV (calculated) - only for companies with official dashboards
    // Must have holdings to calculate mNAV
    if (MNAV_DASHBOARD_TICKERS.has(company.ticker) && company.holdings > 0) {
      // Get crypto price (live if available, otherwise skip mNAV comparison)
      const cryptoPrice = prices?.crypto[company.asset]?.price;
      if (!cryptoPrice || cryptoPrice <= 0) {
        console.log(`[Comparison] Skipping mNAV for ${company.ticker}: no crypto price`);
        continue;
      }

      // Get stock data for market cap calculation
      const stockData = prices?.stocks[company.ticker];

      // Calculate market cap using the same method as frontend
      // This uses sharesForMnav × stockPrice × forex (for non-USD stocks)
      const { marketCap } = getMarketCapForMnavSync(
        company,
        stockData ? { price: stockData.price, marketCap: stockData.marketCap } : null,
        prices?.forex
      );

      if (marketCap <= 0) {
        console.log(`[Comparison] Skipping mNAV for ${company.ticker}: no market cap`);
        continue;
      }

      const ourMnav = calculateMNAV(
        marketCap,
        company.holdings,
        cryptoPrice,
        company.cashReserves ?? 0,
        0, // otherInvestments
        company.totalDebt ?? 0,
        company.preferredEquity ?? 0,
        company.restrictedCash ?? 0
      );

      if (ourMnav !== null && ourMnav > 0 && ourMnav < 10) {
        values.push({
          ticker: company.ticker,
          field: 'mnav',
          value: ourMnav,
          sourceDate: new Date().toISOString().split('T')[0], // Today
        });
        console.log(`[Comparison] ${company.ticker} mNAV: ${ourMnav.toFixed(3)} (marketCap=$${(marketCap/1e9).toFixed(2)}B, ${company.asset}=$${cryptoPrice.toLocaleString()})`);
      }
    }
  }

  return values;
}

/**
 * Get company ID from database by ticker
 */
async function getCompanyId(ticker: string): Promise<number | null> {
  const rows = await query<{ id: number }>(
    'SELECT id FROM companies WHERE ticker = $1',
    [ticker]
  );
  return rows[0]?.id ?? null;
}

/**
 * Record a fetch result in the database
 */
async function recordFetchResult(
  companyId: number,
  result: FetchResult
): Promise<void> {
  await query(
    `INSERT INTO fetch_results (company_id, field, value, source_name, source_url, source_date)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      companyId,
      result.field,
      result.value,
      result.source.name,
      result.source.url,
      result.source.date,
    ]
  );
}

/**
 * Check if there's a recent dismissal/resolution for this company/field with the SAME disagreement
 * Same disagreement = same source reporting the same (wrong) value
 * If the source updates to a different value, that's a NEW discrepancy to review
 */
async function hasRecentDismissal(
  companyId: number,
  field: ComparisonField,
  currentSourceValues: Record<string, { value: number; url: string; date: string }>
): Promise<boolean> {
  // Check for dismissals OR resolutions in the last 30 days
  const rows = await query<{ id: number; source_values: string | Record<string, unknown> }>(
    `SELECT id, source_values FROM discrepancies
     WHERE company_id = $1
       AND field = $2
       AND status IN ('dismissed', 'resolved')
       AND created_at > NOW() - INTERVAL '30 days'
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId, field]
  );

  if (rows.length === 0) return false;

  // Check if the dismissed discrepancy had the same source VALUES (not just names)
  try {
    // JSONB is already parsed by pg driver - handle both cases
    const dismissedSources = typeof rows[0].source_values === 'string'
      ? JSON.parse(rows[0].source_values)
      : rows[0].source_values;

    // For each current source, check if it was dismissed with the SAME value
    for (const [sourceName, sourceData] of Object.entries(currentSourceValues)) {
      const dismissed = dismissedSources[sourceName];
      if (dismissed) {
        // Same source exists in dismissed record - check if value is the same
        // Allow 0.1% tolerance for floating point
        const dismissedValue = dismissed.value;
        const currentValue = sourceData.value;
        const tolerance = Math.abs(dismissedValue) * 0.001;

        if (Math.abs(dismissedValue - currentValue) <= tolerance) {
          // Same source, same value = same disagreement, skip it
          return true;
        }
        // Source has updated to a different value = new discrepancy
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Record a discrepancy in the database
 * Note: Dismissal check is done earlier in runComparison, not here
 */
async function recordDiscrepancy(
  companyId: number,
  comparison: ComparisonResult
): Promise<number | null> {
  const rows = await query<{ id: number }>(
    `INSERT INTO discrepancies (
      company_id, field, our_value, source_values, severity, max_deviation_pct
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (company_id, field, created_date)
    DO UPDATE SET
      our_value = EXCLUDED.our_value,
      source_values = EXCLUDED.source_values,
      severity = EXCLUDED.severity,
      max_deviation_pct = EXCLUDED.max_deviation_pct
    RETURNING id`,
    [
      companyId,
      comparison.field,
      comparison.ourValue,
      JSON.stringify(comparison.sourceValues),
      comparison.severity,
      comparison.maxDeviationPct,
    ]
  );
  return rows[0]?.id ?? null;
}

/**
 * Calculate severity based on deviation percentage
 */
function calculateSeverity(deviationPct: number): 'minor' | 'moderate' | 'major' {
  const abs = Math.abs(deviationPct);
  if (abs < 1) return 'minor';
  if (abs < 5) return 'moderate';
  return 'major';
}

/**
 * Compare our value against fetched values from sources
 *
 * Date-aware comparison (Phase 7d):
 * - Only flag discrepancy if external source is NEWER than our source
 * - If our data is more recent, external sources showing older values is expected
 */
function compare(ourValue: OurValue, sources: FetchResult[]): ComparisonResult {
  const sourceValues: Record<string, { value: number; url: string; date: string }> = {};
  let maxDeviationPct = 0;
  let hasValueDifference = false;
  let newerSourceFound = false;
  let newerSourceDate: string | undefined;

  // Parse our source date for comparison
  const ourDate = ourValue.sourceDate ? new Date(ourValue.sourceDate) : null;

  for (const source of sources) {
    sourceValues[source.source.name] = {
      value: source.value,
      url: source.source.url,
      date: source.source.date,
    };

    // Calculate deviation
    const deviationPct = ourValue.value === 0
      ? (source.value === 0 ? 0 : 100)  // If we have 0 and source has non-zero, 100% deviation
      : Math.abs((source.value - ourValue.value) / ourValue.value * 100);

    if (deviationPct > 0) {
      hasValueDifference = true;
      maxDeviationPct = Math.max(maxDeviationPct, deviationPct);
    }

    // Check if this external source is newer than or same as our source
    // For live data (like mNAV), same-day data should be compared
    if (source.source.date && ourDate) {
      const sourceDate = new Date(source.source.date);
      // Use >= for same-day comparison (important for live data like mNAV)
      if (sourceDate >= ourDate) {
        newerSourceFound = true;
        // Track the newest external source date
        if (!newerSourceDate || sourceDate > new Date(newerSourceDate)) {
          newerSourceDate = source.source.date;
        }
      }
    } else if (!ourDate) {
      // If we don't have a source date, treat external sources as potentially newer
      newerSourceFound = true;
      if (source.source.date) {
        if (!newerSourceDate || new Date(source.source.date) > new Date(newerSourceDate)) {
          newerSourceDate = source.source.date;
        }
      }
    }
  }

  // Only flag as discrepancy if:
  // 1. Values differ AND
  // 2. External source is newer (or we have no date to compare)
  const hasDiscrepancy = hasValueDifference && newerSourceFound;

  // Determine verification method based on source type and company metadata
  const verificationMethod = getVerificationMethod(ourValue.ticker, ourValue.field, ourValue.sourceType, ourValue.sourceUrl);

  return {
    ticker: ourValue.ticker,
    field: ourValue.field,
    ourValue: ourValue.value,
    ourSourceDate: ourValue.sourceDate,
    ourSourceUrl: ourValue.sourceUrl,
    ourSourceType: ourValue.sourceType,
    sourceValues,
    hasDiscrepancy,
    maxDeviationPct,
    severity: calculateSeverity(maxDeviationPct),
    newerSourceFound,
    newerSourceDate,
    verificationMethod,
  };
}

/**
 * Determine how a value can be verified based on its source type, URL, and company metadata
 *
 * Returns:
 * - 'xbrl': Can be verified via SEC XBRL API (10-K, 10-Q filings)
 * - 'fetcher': Can be verified via automated fetcher (dashboards)
 * - 'manual': Needs manual verification (8-K filings, press releases, etc.)
 */
function getVerificationMethod(
  ticker: string,
  field: ComparisonField,
  sourceType?: HoldingsSource,
  sourceUrl?: string
): 'xbrl' | 'fetcher' | 'manual' {
  const url = sourceUrl?.toLowerCase() || '';

  // Check URL for SEC filing type
  if (url.includes('sec.gov')) {
    // 8-K filings need manual verification (XBRL doesn't have holdings from 8-K)
    if (url.includes('8-k') || url.includes('8k')) {
      return 'manual';
    }
    // 10-K and 10-Q can be verified via XBRL
    if (url.includes('10-k') || url.includes('10k') ||
        url.includes('10-q') || url.includes('10q')) {
      return 'xbrl';
    }
    // Generic SEC URL - assume it might have XBRL for balance sheet items
    return 'xbrl';
  }

  // Dashboards with automated fetchers
  if (url.includes('strategy.com') ||
      url.includes('sharplink.com') ||
      url.includes('metaplanet.jp') ||
      url.includes('defidevcorp.com') ||
      url.includes('litestrategy.com') ||
      url.includes('mempool.space')) {
    return 'fetcher';
  }

  // Company website/dashboard source type
  if (sourceType === 'company-website') {
    return 'fetcher';
  }

  // On-chain sources could have automated verification
  if (sourceType === 'on-chain') {
    return 'fetcher';
  }

  // If no source URL, derive from company metadata
  const companySources = getCompanySources(ticker);
  if (companySources) {
    // Holdings can be verified via fetcher if company has a dashboard
    if (field === 'holdings' && companySources.officialDashboard) {
      return 'fetcher';
    }
    // mNAV can be verified via fetcher if company reports daily mNAV
    if (field === 'mnav' && companySources.reportsMnavDaily) {
      return 'fetcher';
    }
    // Balance sheet items (shares, debt, cash) can be verified via XBRL if company has SEC CIK
    if (companySources.secCik && (field === 'shares_outstanding' || field === 'debt' || field === 'cash' || field === 'preferred_equity')) {
      return 'xbrl';
    }
    // Holdings from SEC-registered companies can also try XBRL (some have Bitcoin in XBRL)
    if (companySources.secCik && field === 'holdings') {
      // Could try XBRL, but most holdings come from 8-K which isn't in XBRL
      // Default to manual unless they have a dashboard
      return companySources.officialDashboard ? 'fetcher' : 'manual';
    }
  }

  // Everything else needs manual verification:
  // - Press releases
  // - Aggregators (shouldn't be used as primary source anyway)
  // - Manual entries
  // - Unknown sources
  return 'manual';
}

/**
 * Run comparison for specified tickers (or all if not specified)
 */
export async function runComparison(options?: {
  tickers?: string[];
  sources?: string[];
  dryRun?: boolean;  // If true, don't write to database
}): Promise<{
  discrepancies: ComparisonResult[];
  errors: FetchError[];
  fetchResults: number;
}> {
  const { tickers, sources, dryRun = false } = options || {};

  // 1. Fetch live prices for accurate mNAV calculation
  console.log('[Comparison] Fetching live prices for mNAV calculation...');
  const prices = await fetchLivePrices();
  if (prices) {
    console.log(`[Comparison] Got prices: ${Object.keys(prices.crypto).length} crypto, ${Object.keys(prices.stocks).length} stocks`);
  } else {
    console.log('[Comparison] Warning: Could not fetch live prices, mNAV comparison may be inaccurate');
  }

  // 2. Load our values (with live prices for mNAV)
  let ourValues = loadOurValues(prices);
  if (tickers) {
    ourValues = ourValues.filter(v => tickers.includes(v.ticker));
  }

  // Get unique tickers to fetch
  const tickersToFetch = Array.from(new Set(ourValues.map(v => v.ticker)));
  console.log(`[Comparison] Checking ${tickersToFetch.length} tickers:`, tickersToFetch.join(', '));

  // 2. Fetch from all sources
  const fetcherList = sources
    ? sources.map(name => ({ name, fetcher: fetchers[name] })).filter(f => f.fetcher)
    : Object.entries(fetchers).map(([name, fetcher]) => ({ name, fetcher }));

  const allFetchResults: FetchResult[] = [];
  const errors: FetchError[] = [];

  for (const { name, fetcher } of fetcherList) {
    try {
      console.log(`[Comparison] Fetching from ${name}...`);
      const results = await fetcher.fetch(tickersToFetch);
      allFetchResults.push(...results);
      console.log(`[Comparison] Got ${results.length} results from ${name}`);
    } catch (error) {
      console.error(`[Comparison] Error from ${name}:`, error);
      errors.push({
        ticker: 'batch',
        source: name,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    }
  }

  // 3. Record fetch results in database
  let fetchResultsRecorded = 0;
  if (!dryRun) {
    for (const result of allFetchResults) {
      const companyId = await getCompanyId(result.ticker);
      if (companyId) {
        await recordFetchResult(companyId, result);
        fetchResultsRecorded++;
      }
    }
  }

  // 4. Compare and find discrepancies
  const discrepancies: ComparisonResult[] = [];

  for (const ourValue of ourValues) {
    // Find fetch results matching this ticker and field
    const sourcesForValue = allFetchResults.filter(
      r => r.ticker === ourValue.ticker && r.field === ourValue.field
    );

    if (sourcesForValue.length === 0) {
      // No sources to compare against
      continue;
    }

    const comparison = compare(ourValue, sourcesForValue);

    if (comparison.hasDiscrepancy) {
      // Phase 7b: Verify our source
      const verification = await verifySource(
        ourValue.ticker,
        ourValue.field,
        ourValue.value,
        ourValue.sourceUrl,
        ourValue.sourceType
      );
      comparison.verification = verification;

      // Phase 7c: Calculate confidence level
      const confidence = calculateConfidence(
        verification,
        ourValue.value,
        comparison.sourceValues,
        ourValue.ticker,
        ourValue.field
      );
      comparison.confidence = confidence;

      // Check for recent dismissal/resolution - applies to both dry run and real runs
      const companyId = await getCompanyId(ourValue.ticker);
      if (companyId) {
        const wasDismissed = await hasRecentDismissal(companyId, comparison.field, comparison.sourceValues);
        if (wasDismissed) {
          console.log(`[Comparison] Skipping ${comparison.ticker} ${comparison.field} - recently dismissed/resolved`);
          continue;
        }

        // Record in database only if not dry run
        if (!dryRun) {
          await recordDiscrepancy(companyId, comparison);
        }
        discrepancies.push(comparison);
      } else if (dryRun) {
        // In dry run, include even if no company ID (company might not be in DB yet)
        discrepancies.push(comparison);
      }
    }
  }

  // Log summary
  console.log(`[Comparison] Complete:`);
  console.log(`  - Fetch results: ${allFetchResults.length} (${fetchResultsRecorded} recorded)`);
  console.log(`  - Discrepancies: ${discrepancies.length}`);
  console.log(`  - Errors: ${errors.length}`);

  if (discrepancies.length > 0) {
    console.log(`\n[Comparison] Discrepancies found (newer external sources):`);
    for (const d of discrepancies) {
      const verifyStatus = d.verification?.status || 'unknown';
      const confidenceLevel = d.confidence?.level || 'unknown';
      const ourDateStr = d.ourSourceDate || 'unknown';
      const extDateStr = d.newerSourceDate || 'unknown';
      console.log(`  ${d.ticker} ${d.field}: ours=${d.ourValue} (${ourDateStr}), deviation=${d.maxDeviationPct.toFixed(2)}%, ext=${extDateStr} [${verifyStatus}] [${confidenceLevel}]`);
    }
  }

  return { discrepancies, errors, fetchResults: fetchResultsRecorded };
}

/**
 * Run comparison for a single ticker (useful for testing)
 */
export async function compareOne(ticker: string, options?: { dryRun?: boolean }) {
  return runComparison({ tickers: [ticker], ...options });
}
