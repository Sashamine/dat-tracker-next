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

// Types matching our schema
export type ComparisonField = 'holdings' | 'shares_outstanding' | 'debt' | 'cash' | 'preferred_equity';

export interface OurValue {
  ticker: string;
  companyId?: number;  // DB id, looked up during comparison
  field: ComparisonField;
  value: number;
  // Source info for verification (Phase 7b)
  sourceUrl?: string;
  sourceType?: HoldingsSource;
}

export interface ComparisonResult {
  ticker: string;
  field: ComparisonField;
  ourValue: number;
  sourceValues: Record<string, {
    value: number;
    url: string;
    date: string;
  }>;
  hasDiscrepancy: boolean;
  maxDeviationPct: number;
  severity: 'minor' | 'moderate' | 'major';
  // Phase 7b: Source verification result
  verification?: VerificationResult;
  // Phase 7c: Confidence scoring
  confidence?: ConfidenceResult;
}

/**
 * Load our current values from holdings-history.ts (primary) and companies.ts (fallback)
 *
 * Priority for comparison engine:
 * - Holdings: holdings-history.ts > companies.ts (history is more granular)
 * - Shares: companies.ts (sharesForMnav) > holdings-history.ts (companies.ts is actively maintained)
 * - Debt/Cash/Preferred: companies.ts (no history tracking yet)
 */
export function loadOurValues(): OurValue[] {
  const values: OurValue[] = [];

  for (const company of allCompanies) {
    // Get latest snapshot for source info (Phase 7b)
    const snapshot = getLatestSnapshot(company.ticker);

    // Holdings: prefer holdings-history.ts, fallback to companies.ts
    const holdingsFromHistory = getLatestHoldings(company.ticker);
    const holdings = holdingsFromHistory ?? company.holdings;
    values.push({
      ticker: company.ticker,
      field: 'holdings',
      value: holdings,
      sourceUrl: snapshot?.sourceUrl,
      sourceType: snapshot?.sourceType,
    });

    // Shares outstanding: prefer companies.ts sharesForMnav (actively maintained), fallback to holdings-history.ts
    const sharesFromHistory = getLatestDilutedShares(company.ticker);
    const shares = company.sharesForMnav ?? sharesFromHistory;
    if (shares !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'shares_outstanding',
        value: shares,
        sourceUrl: snapshot?.sourceUrl,
        sourceType: snapshot?.sourceType,
      });
    }

    // Debt (from companies.ts - no history tracking yet)
    if (company.totalDebt !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'debt',
        value: company.totalDebt,
      });
    }

    // Cash (from companies.ts - no history tracking yet)
    if (company.cashReserves !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'cash',
        value: company.cashReserves,
      });
    }

    // Preferred equity (from companies.ts - no history tracking yet)
    if (company.preferredEquity !== undefined) {
      values.push({
        ticker: company.ticker,
        field: 'preferred_equity',
        value: company.preferredEquity,
      });
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
 * Record a discrepancy in the database
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
 */
function compare(ourValue: OurValue, sources: FetchResult[]): ComparisonResult {
  const sourceValues: Record<string, { value: number; url: string; date: string }> = {};
  let maxDeviationPct = 0;
  let hasDiscrepancy = false;

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
      hasDiscrepancy = true;
      maxDeviationPct = Math.max(maxDeviationPct, deviationPct);
    }
  }

  return {
    ticker: ourValue.ticker,
    field: ourValue.field,
    ourValue: ourValue.value,
    sourceValues,
    hasDiscrepancy,
    maxDeviationPct,
    severity: calculateSeverity(maxDeviationPct),
  };
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

  // 1. Load our values
  let ourValues = loadOurValues();
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

      discrepancies.push(comparison);

      // Record in database
      if (!dryRun) {
        const companyId = await getCompanyId(ourValue.ticker);
        if (companyId) {
          await recordDiscrepancy(companyId, comparison);
        }
      }
    }
  }

  // Log summary
  console.log(`[Comparison] Complete:`);
  console.log(`  - Fetch results: ${allFetchResults.length} (${fetchResultsRecorded} recorded)`);
  console.log(`  - Discrepancies: ${discrepancies.length}`);
  console.log(`  - Errors: ${errors.length}`);

  if (discrepancies.length > 0) {
    console.log(`\n[Comparison] Discrepancies found:`);
    for (const d of discrepancies) {
      const verifyStatus = d.verification?.status || 'unknown';
      const confidenceLevel = d.confidence?.level || 'unknown';
      console.log(`  ${d.ticker} ${d.field}: ours=${d.ourValue}, deviation=${d.maxDeviationPct.toFixed(2)}% [${verifyStatus}] [${confidenceLevel}]`);
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
