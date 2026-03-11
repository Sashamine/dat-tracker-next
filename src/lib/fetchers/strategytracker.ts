/**
 * StrategyTracker.com Data Fetcher
 *
 * Fetches real-time BTC holdings data from StrategyTracker's public JSON API
 * at data.strategytracker.com. Updated every ~15 minutes.
 *
 * Coverage (17 companies as of March 2026):
 * - 3350.T (Metaplanet) — primary use case, real-time BTC holdings
 * - MSTR (Strategy), ASST (Strive), DDC, EMPD, ZOOZ, etc.
 * - BTCT.V, H100, DCC.AX, ALCPB.PA, SWC.AQ, OBTC3.SA, CASH3.SA
 *
 * Data source: analytics.metaplanet.jp is a whitelabel of StrategyTracker.
 * The underlying data API is at data.strategytracker.com (no auth required).
 *
 * API structure:
 *   GET /latest.json → { version, timestamp, files: { full, light } }
 *   GET /{light-file} → { timestamp, companies: { [ticker]: CompanyData } }
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
async function fetchLatest(): Promise<{ version: string; lightFile: string }> {
  const res = await fetch(`${DATA_BASE}/latest.json`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) throw new Error(`StrategyTracker latest.json failed: ${res.status}`);
  const data = await res.json();

  return {
    version: data.version,
    lightFile: data.files.light,
  };
}

/**
 * Fetch the light company data file.
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
