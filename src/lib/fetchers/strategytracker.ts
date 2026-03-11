/**
 * StrategyTracker.com Data Fetcher
 *
 * Fetches real-time BTC holdings and capital structure data from
 * StrategyTracker's public JSON API at data.strategytracker.com.
 * Updated every ~15 minutes.
 *
 * Coverage (17 companies as of March 2026):
 * - 3350.T (Metaplanet) — primary use case, real-time BTC + capital structure
 * - MSTR (Strategy), ASST (Strive), DDC, EMPD, ZOOZ, etc.
 * - BTCT.V, H100, DCC.AX, ALCPB.PA, SWC.AQ, OBTC3.SA, CASH3.SA
 *
 * Data source: analytics.metaplanet.jp is a whitelabel of StrategyTracker.
 * The underlying data API is at data.strategytracker.com (no auth required).
 *
 * Two data tiers:
 *   Light file: holdings, mNAV, stock price (small payload, fast)
 *   Full file:  + preferred stocks, debt instruments, shares, cash (~1MB)
 *
 * API structure:
 *   GET /latest.json → { version, timestamp, files: { full, light } }
 *   GET /{light-file} → { timestamp, companies: { [ticker]: LightCompanyData } }
 *   GET /{full-file} → { timestamp, companies: { [ticker]: FullCompanyData } }
 *   GET /prices-live.json → { prices: { [ticker]: PriceData } }
 */

const DATA_BASE = 'https://data.strategytracker.com';
const USER_AGENT = 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)';

export interface StrategyTrackerCompany {
  name: string;
  ticker: string;
  verified: boolean;
  holdings: number;
  marketCap: number;
  navPremium: number;
  stockPrice: number;
  satsPerShare: number;
  btcYieldYtd: number;
  btcYieldQuarterly: number;
  country: string;
  originalCurrency: string;
  partner_key: string;
}

/** Full data includes processedMetrics with capital structure detail */
export interface StrategyTrackerFullCompany {
  processedMetrics: {
    sharesOutstanding: number | null;
    latestTotalShares: number | null;
    latestDilutedShares: number | null;
    latestDebt: number | null;
    latestCashBalance: number | null;
    latestBtcBalance: number | null;
    latestCostBasis: number | null;
    latestTreasuryDate: string | null;
    navPremiumBasic: number | null;
    navPremiumDiluted: number | null;
    hasPreferredStocks: boolean;
    hasDebtInstruments: boolean;
    preferredStocks: StrategyTrackerPreferred[] | null;
    debtSummary: {
      totalDebt: number;
      totalDebtUsd: number;
      instrumentCount: number;
      convertibleCount: number;
    } | null;
  };
  [key: string]: unknown;
}

export interface StrategyTrackerPreferred {
  ticker: string;
  name: string;
  notionalMillions: number;
  notionalUSD: number;
  currency: string;
  dividendRate: number;
  isTraded: boolean;
}

export interface StrategyTrackerData {
  timestamp: string;
  version: string;
  aggregate: {
    totalCompanies: number;
    totalBtcHoldings: number;
    totalMarketCap: number;
    avgBtcPrice: number;
    totalHoldingsValue: number;
  };
  companies: Record<string, StrategyTrackerCompany>;
}

export interface StrategyTrackerFullData {
  timestamp: string;
  companies: Record<string, StrategyTrackerFullCompany>;
}

/**
 * Mapping from StrategyTracker tickers to our entity IDs.
 * Only map companies we actually track in our system.
 */
export const ST_TICKER_TO_ENTITY: Record<string, string> = {
  '3350.T': '3350.T',       // Metaplanet
  'BTCT.V': 'BTCT.V',       // Bitcoin Treasury Corp
  'H100': 'H100.ST',         // H100 Group (Sweden)
  'DCC.AX': 'DCC.AX',       // DigitalX (Australia)
  'ALCPB.PA': 'ALCPB',      // The Blockchain Group (France)
  'SWC.AQ': 'SWC',          // Samara Asset Group
  'OBTC3.SA': 'OBTC3',      // Oranje BTC (Brazil)
  'CASH3.SA': 'CASH3',      // Meliuz (Brazil)
  'MSTR': 'MSTR',           // Strategy (cross-reference only)
};

/**
 * Fetch the latest version pointer from StrategyTracker.
 */
async function fetchLatest(): Promise<{ version: string; lightFile: string; fullFile: string }> {
  const res = await fetch(`${DATA_BASE}/latest.json`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`StrategyTracker latest.json failed: ${res.status}`);
  const data = await res.json();

  return {
    version: data.version,
    lightFile: data.files.light,
    fullFile: data.files.full,
  };
}

/**
 * Fetch the light company data file (small, fast — holdings + mNAV only).
 */
export async function fetchStrategyTrackerData(): Promise<StrategyTrackerData> {
  const { lightFile } = await fetchLatest();

  const res = await fetch(`${DATA_BASE}/${lightFile}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`StrategyTracker data file failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch the full company data file (~1MB — includes capital structure,
 * preferred stocks, debt instruments, shares outstanding, etc.)
 */
export async function fetchStrategyTrackerFullData(): Promise<StrategyTrackerFullData> {
  const { fullFile } = await fetchLatest();

  const res = await fetch(`${DATA_BASE}/${fullFile}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`StrategyTracker full data file failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch data for a specific company by our entity ID.
 * Returns null if the company is not in StrategyTracker's dataset.
 */
export async function fetchCompanyFromStrategyTracker(
  entityId: string
): Promise<{ company: StrategyTrackerCompany; timestamp: string } | null> {
  const stTicker = Object.entries(ST_TICKER_TO_ENTITY).find(
    ([, eid]) => eid === entityId
  )?.[0];

  if (!stTicker) return null;

  const data = await fetchStrategyTrackerData();
  const company = data.companies[stTicker];

  if (!company) return null;

  return { company, timestamp: data.timestamp };
}
