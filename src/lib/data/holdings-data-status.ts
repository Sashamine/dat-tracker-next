// Track which companies have historical holdings/share data and which need it
// This helps identify gaps and prioritize data collection

import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY } from "./holdings-history";

export interface CompanyDataStatus {
  ticker: string;
  name: string;
  asset: string;
  hasHistoricalData: boolean;
  dataPoints: number;
  oldestData: string | null;
  newestData: string | null;
  lastChecked: string | null; // When we last looked for data
  notes: string | null; // Why data might not be available
  priority: "high" | "medium" | "low"; // Based on market cap tier
}

// Manual notes about data availability
const DATA_NOTES: Record<string, string> = {
  // Companies where data is hard to get
  "XXI": "Pre-merger SPAC, no historical holdings yet",
  "CEPO": "Pre-merger SPAC (BSTR Holdings), no public filings yet",
  "ASST": "Strive - newly formed BTC treasury",
  "NAKA": "New company, limited filings",
  "DJT": "Trump Media - recently announced BTC strategy",
  "PURR": "Hyperliquid Strategies - very new",
  "HYPD": "Hyperion DeFi - recently converted to HYPE treasury",

  // International companies with different disclosure
  "ALTBG": "France/Euronext - check AMF filings",
  "H100.ST": "Sweden - check Finansinspektionen",
  "0434.HK": "Hong Kong - check HKEX filings",

  // OTC/smaller companies
  "LUXFF": "OTC - limited disclosure requirements",
  "XTAIF": "OTC - limited disclosure",
  "IHLDF": "OTC - check SEDAR for Canadian filings",

  // Newer treasury companies
  "FWDI": "Forward Industries - SOL treasury announced 2024",
  "HSDT": "Solana Company - recently rebranded",
  "UPXI": "Upexi - SOL treasury announced late 2024",
  "BNC": "BNB Network Company - new",
  "NA": "Nano Labs - BNB holder",
  "TAOX": "TAO Synergies - new TAO treasury",
  "TWAV": "TaoWeave - recently converted",
  "CWD": "Caliber - LINK treasury",
  "TRON": "Tron Inc - TRX treasury",
  "XRPN": "Evernorth - XRP treasury",
  "CYPH": "Cypherpunk - ZEC focused",
  "LITS": "Lite Strategy - LTC treasury",
  "SUIG": "SUI Group - new SUI treasury",
  "ZONE": "CleanCore - DOGE treasury",
  "TBH": "Brag House - DOGE treasury",
  "BTOG": "Bit Origin - DOGE holder",
  "AVX": "AVAX One - new AVAX treasury",
};

// When each company was last checked for data (YYYY-MM-DD)
const LAST_CHECKED: Record<string, string> = {
  MSTR: "2025-01-12",
  MARA: "2025-01-12",
  RIOT: "2025-01-12",
  CLSK: "2025-01-12",
  "3350.T": "2025-01-12",
  SMLR: "2025-01-12",
  BTCS: "2025-01-12",
  BTBT: "2025-01-12",
  STKE: "2025-01-12",
  DFDV: "2025-01-12",
  KULR: "2026-01-12",
  "0434.HK": "2026-01-12",
  BMNR: "2026-01-12",
};

export function getCompanyDataStatus(): CompanyDataStatus[] {
  return allCompanies.map((company) => {
    const history = HOLDINGS_HISTORY[company.ticker] || HOLDINGS_HISTORY[company.ticker.toUpperCase()];
    const hasData = !!history && history.history.length >= 2;

    return {
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      hasHistoricalData: hasData,
      dataPoints: history?.history.length || 0,
      oldestData: history?.history[0]?.date || null,
      newestData: history?.history[history.history.length - 1]?.date || null,
      lastChecked: LAST_CHECKED[company.ticker] || null,
      notes: DATA_NOTES[company.ticker] || null,
      priority: company.tier === 1 ? "high" : company.tier === 2 ? "medium" : "low",
    };
  });
}

export function getCompaniesNeedingData(): CompanyDataStatus[] {
  return getCompanyDataStatus()
    .filter((c) => !c.hasHistoricalData)
    .sort((a, b) => {
      // Sort by priority first, then by asset
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.asset.localeCompare(b.asset);
    });
}

export function getDataCoverageSummary(): {
  total: number;
  withData: number;
  withoutData: number;
  coveragePercent: number;
  byAsset: Record<string, { total: number; withData: number }>;
} {
  const statuses = getCompanyDataStatus();
  const withData = statuses.filter((s) => s.hasHistoricalData).length;

  const byAsset: Record<string, { total: number; withData: number }> = {};
  for (const status of statuses) {
    if (!byAsset[status.asset]) {
      byAsset[status.asset] = { total: 0, withData: 0 };
    }
    byAsset[status.asset].total++;
    if (status.hasHistoricalData) {
      byAsset[status.asset].withData++;
    }
  }

  return {
    total: statuses.length,
    withData,
    withoutData: statuses.length - withData,
    coveragePercent: Math.round((withData / statuses.length) * 100),
    byAsset,
  };
}
