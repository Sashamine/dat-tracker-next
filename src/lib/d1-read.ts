/**
 * D1 Read Layer — Unified functions for reading company data from D1.
 *
 * This is the "single source of truth" read path.
 * In Phase 2, consumers will switch from static files to these functions.
 * In Phase 3, these run alongside static reads in shadow mode.
 * In Phase 4, these become the only read path.
 */

import {
  D1Client,
  EntityRow,
  InstrumentRow,
  PurchaseRow,
  SecondaryHoldingRow,
  InvestmentRow,
  CapitalEventRow,
  AssumptionRow,
  LatestDatapointRow,
  DatapointHistoryRow,
  getEntity,
  getEntities,
  getInstruments,
  getAllInstruments,
  getPurchasesFromD1,
  getSecondaryHoldings,
  getInvestments,
  getCapitalEvents,
  getAssumptions,
  getLatestMetrics,
  getMetricHistory,
} from './d1';

// Re-export for convenience
export {
  getEntity,
  getEntities,
  getInstruments,
  getAllInstruments,
  getPurchasesFromD1,
  getSecondaryHoldings,
  getInvestments,
  getCapitalEvents,
  getAssumptions,
};

// ═══════════════════════════════════════════════════════════════════════════
// Composite read functions
// ═══════════════════════════════════════════════════════════════════════════

export interface LatestFinancials {
  holdings?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  shares?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  debt?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  cash?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  preferred?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  restrictedCash?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
  otherInvestments?: { value: number; asOf: string | null; source: string | null; confidence: number | null };
}

/** Get latest financial datapoints for a ticker, organized by metric */
export async function getLatestFinancials(ticker: string): Promise<LatestFinancials> {
  const rows = await getLatestMetrics(ticker, [
    'holdings_native',
    'basic_shares',
    'debt_usd',
    'cash_usd',
    'preferred_equity_usd',
    'restricted_cash_usd',
    'other_investments_usd',
  ]);

  const result: LatestFinancials = {};

  for (const row of rows) {
    const entry = {
      value: row.value,
      asOf: row.as_of,
      source: row.citation_quote || row.artifact?.source_url || null,
      confidence: row.confidence,
    };

    switch (row.metric) {
      case 'holdings_native': result.holdings = entry; break;
      case 'basic_shares': result.shares = entry; break;
      case 'debt_usd': result.debt = entry; break;
      case 'cash_usd': result.cash = entry; break;
      case 'preferred_equity_usd': result.preferred = entry; break;
      case 'restricted_cash_usd': result.restrictedCash = entry; break;
      case 'other_investments_usd': result.otherInvestments = entry; break;
    }
  }

  return result;
}

/** Get financial history for a ticker, optionally filtered by metric */
export async function getFinancialHistory(
  ticker: string,
  metric?: string,
  opts?: { limit?: number; order?: 'asc' | 'desc' }
): Promise<DatapointHistoryRow[]> {
  if (metric) {
    return getMetricHistory(ticker, metric, { ...opts, includeArtifacts: true });
  }

  // If no metric specified, get all key metrics
  const metrics = ['holdings_native', 'basic_shares', 'debt_usd', 'cash_usd', 'preferred_equity_usd'];
  const allRows: DatapointHistoryRow[] = [];

  for (const m of metrics) {
    const rows = await getMetricHistory(ticker, m, { ...opts, includeArtifacts: true });
    allRows.push(...rows);
  }

  // Sort by date
  allRows.sort((a, b) => {
    const dateA = a.as_of || '';
    const dateB = b.as_of || '';
    return opts?.order === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
  });

  return allRows;
}

/** Get purchase stats (cost basis) computed from D1 purchases */
export async function getPurchaseStatsFromD1(
  ticker: string
): Promise<{ totalQuantity: number; totalCost: number; costBasisAvg: number } | null> {
  const purchases = await getPurchasesFromD1(ticker);
  if (purchases.length === 0) return null;

  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.total_cost, 0);
  const costBasisAvg = totalQuantity > 0 ? Math.round(totalCost / totalQuantity) : 0;

  return { totalQuantity, totalCost, costBasisAvg };
}

/** Get a full company profile from D1 (entity + latest financials + instruments) */
export async function getFullCompanyProfile(ticker: string) {
  const [entity, financials, instruments, secondaryHoldings, investments] = await Promise.all([
    getEntity(ticker),
    getLatestFinancials(ticker),
    getInstruments(ticker),
    getSecondaryHoldings(ticker),
    getInvestments(ticker),
  ]);

  if (!entity) return null;

  return {
    entity,
    financials,
    instruments,
    secondaryHoldings,
    investments,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// History access functions (replaces holdings-history.ts access patterns)
// ═══════════════════════════════════════════════════════════════════════════

/** Get holdings at a specific date (nearest datapoint on or before date) */
export async function getHoldingsAtDateFromD1(
  ticker: string,
  date: string
): Promise<number | undefined> {
  const rows = await getMetricHistory(ticker, 'holdings_native', {
    limit: 500,
    order: 'asc',
    includeArtifacts: false,
  });

  // Find latest datapoint on or before the target date
  let result: number | undefined;
  for (const row of rows) {
    if (row.as_of && row.as_of <= date) {
      result = row.value;
    } else {
      break;
    }
  }
  return result;
}

/** Get shares at a specific date (nearest datapoint on or before date) */
export async function getSharesAtDateFromD1(
  ticker: string,
  date: string
): Promise<number | undefined> {
  const rows = await getMetricHistory(ticker, 'basic_shares', {
    limit: 500,
    order: 'asc',
    includeArtifacts: false,
  });

  let result: number | undefined;
  for (const row of rows) {
    if (row.as_of && row.as_of <= date) {
      result = row.value;
    } else {
      break;
    }
  }
  return result;
}

/** Get latest holdings value for a ticker */
export async function getLatestHoldingsFromD1(
  ticker: string
): Promise<number | undefined> {
  const rows = await getMetricHistory(ticker, 'holdings_native', {
    limit: 1,
    order: 'desc',
    includeArtifacts: false,
  });
  return rows[0]?.value;
}

/** Get latest shares value for a ticker */
export async function getLatestSharesFromD1(
  ticker: string
): Promise<number | undefined> {
  const rows = await getMetricHistory(ticker, 'basic_shares', {
    limit: 1,
    order: 'desc',
    includeArtifacts: false,
  });
  return rows[0]?.value;
}

// ═══════════════════════════════════════════════════════════════════════════
// Effective shares calculation from D1 instruments
// ═══════════════════════════════════════════════════════════════════════════

export interface EffectiveSharesFromD1 {
  basic: number;
  diluted: number;
  inTheMoneyDebtValue: number;
  inTheMoneyWarrantProceeds: number;
  breakdown: {
    type: string;
    strikePrice: number;
    potentialShares: number;
    faceValue: number | null;
    inTheMoney: boolean;
    source: string | null;
    notes: string | null;
  }[];
}

/** Calculate effective diluted shares using D1 instruments data */
export async function getEffectiveSharesFromD1(
  ticker: string,
  basicShares: number,
  stockPrice: number,
  asOfDate?: string
): Promise<EffectiveSharesFromD1> {
  const allInstruments = await getAllInstruments(ticker);
  const today = asOfDate || new Date().toISOString().split('T')[0];

  // Filter active instruments
  const activeInstruments = allInstruments.filter(inst => {
    if (inst.included_in_base) return false;
    if (inst.expiration && inst.expiration <= today) return false;
    if (asOfDate && inst.issued_date && inst.issued_date > asOfDate) return false;
    return true;
  });

  const breakdown = activeInstruments.map(inst => ({
    type: inst.type,
    strikePrice: inst.strike_price,
    potentialShares: inst.potential_shares,
    faceValue: inst.face_value,
    inTheMoney: stockPrice > inst.strike_price,
    source: inst.source,
    notes: inst.notes,
  }));

  const inTheMoneyShares = breakdown
    .filter(b => b.inTheMoney)
    .reduce((sum, b) => sum + b.potentialShares, 0);

  const inTheMoneyDebtValue = activeInstruments
    .filter(inst => {
      if (!inst.face_value || inst.type !== 'convertible') return false;
      if (stockPrice <= inst.strike_price) return false;
      const settlement = inst.settlement_type || 'full_share';
      return settlement === 'full_share';
    })
    .reduce((sum, inst) => sum + (inst.face_value || 0), 0);

  const inTheMoneyWarrantProceeds = breakdown
    .filter(b => b.inTheMoney && b.type === 'warrant')
    .reduce((sum, b) => sum + (b.potentialShares * b.strikePrice), 0);

  return {
    basic: basicShares,
    diluted: basicShares + inTheMoneyShares,
    inTheMoneyDebtValue,
    inTheMoneyWarrantProceeds,
    breakdown,
  };
}
