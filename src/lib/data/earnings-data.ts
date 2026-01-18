// Earnings data for DAT companies
// Sources: SEC EDGAR, company IR pages, investor presentations

import { EarningsRecord, EarningsCalendarEntry, TreasuryYieldMetrics, Asset, CalendarQuarter } from "../types";
import { allCompanies } from "./companies";
import { HOLDINGS_HISTORY, calculateHoldingsGrowth } from "./holdings-history";

// Upcoming and recent earnings dates
// Status: "upcoming" = scheduled, "confirmed" = date confirmed by company, "reported" = results released
export const EARNINGS_DATA: EarningsRecord[] = [
  // ==================== BTC COMPANIES ====================

  // Strategy (MSTR) - Q4 2025
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-04",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // MSTR Q3 2025 - Reported
  {
    ticker: "MSTR",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-10-30",
    earningsTime: "AMC",
    epsActual: -1.72,
    epsEstimate: -0.12,
    revenueActual: 116_100_000,
    revenueEstimate: 122_660_000,
    netIncome: -340_200_000,
    holdingsAtQuarterEnd: 252220,
    sharesAtQuarterEnd: 182_000_000,
    holdingsPerShare: 0.001386,
    source: "sec-filing",
    sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q",
    status: "reported",
  },

  // Marathon Digital (MARA) - Q4 2025
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-26",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
  // MARA Q3 2025 - Reported
  {
    ticker: "MARA",
    fiscalYear: 2025,
    fiscalQuarter: 3,
    earningsDate: "2025-11-12",
    earningsTime: "AMC",
    epsActual: 0.32,
    epsEstimate: 0.05,
    revenueActual: 131_600_000,
    revenueEstimate: 145_000_000,
    holdingsAtQuarterEnd: 52850,
    sharesAtQuarterEnd: 470_126_000,
    holdingsPerShare: 0.0001124,
    source: "sec-filing",
    status: "reported",
  },

  // Riot Platforms (RIOT) - Q4 2025
  {
    ticker: "RIOT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // CleanSpark (CLSK) - Q1 FY2026 (fiscal year ends Sept)
  {
    ticker: "CLSK",
    fiscalYear: 2026,
    fiscalQuarter: 1,
    earningsDate: "2026-02-05",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // Hut 8 (HUT) - Q4 2025
  {
    ticker: "HUT",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-13",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },

  // Metaplanet (3350.T) - Q4 FY2024 (fiscal year ends Dec)
  {
    ticker: "3350.T",
    fiscalYear: 2024,
    fiscalQuarter: 4,
    earningsDate: "2026-02-14",
    earningsTime: null,
    source: "press-release",
    status: "upcoming",
  },

  // Semler Scientific (SMLR) - Q4 2025
  {
    ticker: "SMLR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // KULR Technology - Q4 2025
  {
    ticker: "KULR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-27",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // Strive (ASST) - Q4 2025
  {
    ticker: "ASST",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // Core Scientific (CORZ) - Q4 2025
  {
    ticker: "CORZ",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-12",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // Bitdeer (BTDR) - Q4 2025
  {
    ticker: "BTDR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-05",
    earningsTime: "BMO",
    source: "sec-filing",
    status: "upcoming",
  },

  // ==================== ETH COMPANIES ====================

  // Bitmine Immersion (BMNR) - Q4 2025
  {
    ticker: "BMNR",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-02-28",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // BTCS Inc - Q4 2025
  {
    ticker: "BTCS",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-20",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },

  // ==================== SOL COMPANIES ====================

  // Sol Strategies (STKE) - Q4 2025
  {
    ticker: "STKE",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-28",
    earningsTime: null,
    source: "press-release",
    status: "upcoming",
  },

  // DeFi Development Corp (DFDV) - Q4 2025
  {
    ticker: "DFDV",
    fiscalYear: 2025,
    fiscalQuarter: 4,
    earningsDate: "2026-03-15",
    earningsTime: "AMC",
    source: "sec-filing",
    status: "upcoming",
  },
];

// Helper: Get days until a date
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get earnings calendar entries
export function getEarningsCalendar(options?: {
  days?: number;
  asset?: Asset;
  upcoming?: boolean;
}): EarningsCalendarEntry[] {
  const { days = 90, asset, upcoming = true } = options || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: EarningsCalendarEntry[] = [];

  for (const earnings of EARNINGS_DATA) {
    const daysUntil = getDaysUntil(earnings.earningsDate);

    // Filter by upcoming/past
    if (upcoming && daysUntil < 0) continue;
    if (!upcoming && daysUntil >= 0) continue;

    // Filter by days range
    if (Math.abs(daysUntil) > days) continue;

    // Find company
    const company = allCompanies.find((c) => c.ticker === earnings.ticker);
    if (!company) continue;

    // Filter by asset
    if (asset && company.asset !== asset) continue;

    // Calculate EPS surprise if reported
    let epsSurprisePct: number | undefined;
    if (earnings.status === "reported" && earnings.epsActual !== undefined && earnings.epsEstimate !== undefined && earnings.epsEstimate !== 0) {
      epsSurprisePct = ((earnings.epsActual - earnings.epsEstimate) / Math.abs(earnings.epsEstimate)) * 100;
    }

    // Calculate holdings per share growth from holdings history
    let holdingsPerShareGrowth: number | undefined;
    const history = HOLDINGS_HISTORY[earnings.ticker];
    if (history) {
      const growth = calculateHoldingsGrowth(history.history);
      if (growth) {
        // Use annualized growth for comparable metric
        holdingsPerShareGrowth = growth.annualizedGrowth;
      }
    }

    entries.push({
      ticker: earnings.ticker,
      companyName: company.name,
      asset: company.asset,
      earningsDate: earnings.earningsDate,
      earningsTime: earnings.earningsTime,
      status: earnings.status,
      daysUntil,
      epsSurprisePct,
      holdingsPerShareGrowth,
    });
  }

  // Sort by date (upcoming: soonest first, past: most recent first)
  entries.sort((a, b) => {
    if (upcoming) {
      return a.daysUntil - b.daysUntil;
    }
    return b.daysUntil - a.daysUntil;
  });

  return entries;
}

// Period configuration: target days and max data age for inclusion
const PERIOD_CONFIG = {
  "1W": { targetDays: 7, maxDataAge: 14 },    // Weekly: need data from last 2 weeks
  "1M": { targetDays: 30, maxDataAge: 45 },   // Monthly: need data from last 45 days
  "3M": { targetDays: 90, maxDataAge: 240 },  // Quarterly: need data from last 8 months (captures H1 reporters)
  "1Y": { targetDays: 365, maxDataAge: 400 }, // Yearly: need data from last ~13 months
};

// Get treasury yield leaderboard
export function getTreasuryYieldLeaderboard(options?: {
  period?: "1W" | "1M" | "3M" | "1Y";
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { period = "1Y", asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];
  const config = PERIOD_CONFIG[period];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    // Find company
    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    // Filter by asset
    if (asset && company.asset !== asset) continue;

    const history = data.history;
    const latest = history[history.length - 1];
    const latestDate = new Date(latest.date);

    // Check if latest data is fresh enough for this period
    const daysSinceLatest = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLatest > config.maxDataAge) continue;

    // Find the best starting snapshot for this period
    const targetStartDate = new Date(latestDate);
    targetStartDate.setDate(targetStartDate.getDate() - config.targetDays);

    // Find snapshot closest to (but not after) the target start date
    let startSnapshot = null;
    for (let i = history.length - 2; i >= 0; i--) {
      const snapshotDate = new Date(history[i].date);
      if (snapshotDate <= targetStartDate) {
        startSnapshot = history[i];
        break;
      }
    }

    // If no snapshot before target, use the oldest available
    if (!startSnapshot) {
      startSnapshot = history[0];
    }

    // Skip if start and end are the same snapshot
    if (startSnapshot.date === latest.date) continue;
    if (startSnapshot.holdingsPerShare <= 0) continue;

    const startDate = new Date(startSnapshot.date);
    const endDate = new Date(latest.date);
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // For shorter periods, require appropriate data span (not too short, not too long)
    if (period === "1W") {
      if (daysCovered < 3 || daysCovered > 14) continue;  // 3-14 days for weekly
    }
    if (period === "1M") {
      if (daysCovered < 14 || daysCovered > 45) continue; // 14-45 days for monthly
    }
    if (period === "3M") {
      if (daysCovered < 45 || daysCovered > 200) continue; // 45-200 days for quarterly (includes semi-annual reporters)
    }

    const growthPct = ((latest.holdingsPerShare / startSnapshot.holdingsPerShare) - 1) * 100;

    // Calculate annualized
    const yearsFraction = daysCovered / 365.25;
    const annualizedGrowthPct = yearsFraction > 0
      ? (Math.pow(latest.holdingsPerShare / startSnapshot.holdingsPerShare, 1 / yearsFraction) - 1) * 100
      : 0;

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period,
      holdingsPerShareStart: startSnapshot.holdingsPerShare,
      holdingsPerShareEnd: latest.holdingsPerShare,
      growthPct,
      annualizedGrowthPct,
      startDate: startSnapshot.date,
      endDate: latest.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Helper: Get quarter date boundaries
function getQuarterBounds(quarter: CalendarQuarter): { start: Date; end: Date } {
  const match = quarter.match(/Q([1-4])-(\d{4})/);
  if (!match) throw new Error(`Invalid quarter format: ${quarter}`);

  const q = parseInt(match[1]);
  const year = parseInt(match[2]);

  // Quarter start/end dates
  const quarters: Record<number, { startMonth: number; endMonth: number }> = {
    1: { startMonth: 0, endMonth: 2 },   // Jan-Mar
    2: { startMonth: 3, endMonth: 5 },   // Apr-Jun
    3: { startMonth: 6, endMonth: 8 },   // Jul-Sep
    4: { startMonth: 9, endMonth: 11 },  // Oct-Dec
  };

  const { startMonth, endMonth } = quarters[q];
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0); // Last day of end month

  return { start, end };
}

// Get available quarters based on holdings data
export function getAvailableQuarters(): CalendarQuarter[] {
  const quarters = new Set<CalendarQuarter>();
  const today = new Date();

  // Go back 2 years
  for (let year = today.getFullYear(); year >= today.getFullYear() - 2; year--) {
    for (let q = 4; q >= 1; q--) {
      const quarter = `Q${q}-${year}` as CalendarQuarter;
      const { end } = getQuarterBounds(quarter);

      // Only include quarters that have ended
      if (end <= today) {
        quarters.add(quarter);
      }
    }
  }

  // Sort by most recent first
  return Array.from(quarters).sort((a, b) => {
    const [qA, yA] = a.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    const [qB, yB] = b.split('-').map((x, i) => i === 0 ? parseInt(x.slice(1)) : parseInt(x));
    if (yA !== yB) return yB - yA;
    return qB - qA;
  });
}

// Get treasury yield for a specific calendar quarter
export function getQuarterlyYieldLeaderboard(options?: {
  quarter?: CalendarQuarter;
  asset?: Asset;
}): TreasuryYieldMetrics[] {
  const { quarter = getAvailableQuarters()[0], asset } = options || {};
  const metrics: TreasuryYieldMetrics[] = [];

  const { start: quarterStart, end: quarterEnd } = getQuarterBounds(quarter);

  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    if (data.history.length < 2) continue;

    // Find company
    const company = allCompanies.find((c) => c.ticker === ticker);
    if (!company) continue;

    // Filter by asset
    if (asset && company.asset !== asset) continue;

    const history = data.history;

    // Find best snapshot at or before quarter start (within 45 days tolerance)
    let startSnapshot = null;
    const startTolerance = 45 * 24 * 60 * 60 * 1000; // 45 days in ms

    for (let i = history.length - 1; i >= 0; i--) {
      const snapshotDate = new Date(history[i].date);
      if (snapshotDate <= quarterStart) {
        // Check if within tolerance
        if (quarterStart.getTime() - snapshotDate.getTime() <= startTolerance) {
          startSnapshot = history[i];
        }
        break;
      }
    }

    // If no snapshot before quarter start, check if there's one early in the quarter
    if (!startSnapshot) {
      for (const snapshot of history) {
        const snapshotDate = new Date(snapshot.date);
        // Accept snapshot within first 30 days of quarter
        const thirtyDaysIn = new Date(quarterStart);
        thirtyDaysIn.setDate(thirtyDaysIn.getDate() + 30);
        if (snapshotDate >= quarterStart && snapshotDate <= thirtyDaysIn) {
          startSnapshot = snapshot;
          break;
        }
      }
    }

    if (!startSnapshot) continue;

    // Find best snapshot at or after quarter end (within 30 days tolerance)
    let endSnapshot = null;
    const endTolerance = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    for (let i = 0; i < history.length; i++) {
      const snapshotDate = new Date(history[i].date);
      if (snapshotDate >= quarterEnd) {
        // Check if within tolerance
        if (snapshotDate.getTime() - quarterEnd.getTime() <= endTolerance) {
          endSnapshot = history[i];
        }
        break;
      }
    }

    // If no snapshot after quarter end, check if there's one late in the quarter
    if (!endSnapshot) {
      for (let i = history.length - 1; i >= 0; i--) {
        const snapshotDate = new Date(history[i].date);
        // Accept snapshot within last 30 days of quarter
        const thirtyDaysBefore = new Date(quarterEnd);
        thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);
        if (snapshotDate <= quarterEnd && snapshotDate >= thirtyDaysBefore) {
          endSnapshot = history[i];
          break;
        }
      }
    }

    if (!endSnapshot) continue;

    // Skip if same snapshot or invalid data
    if (startSnapshot.date === endSnapshot.date) continue;
    if (startSnapshot.holdingsPerShare <= 0) continue;

    // Ensure end is after start
    if (new Date(endSnapshot.date) <= new Date(startSnapshot.date)) continue;

    const startDate = new Date(startSnapshot.date);
    const endDate = new Date(endSnapshot.date);
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Require at least 30 days of coverage
    if (daysCovered < 30) continue;

    const growthPct = ((endSnapshot.holdingsPerShare / startSnapshot.holdingsPerShare) - 1) * 100;

    // Calculate annualized
    const yearsFraction = daysCovered / 365.25;
    const annualizedGrowthPct = yearsFraction > 0
      ? (Math.pow(endSnapshot.holdingsPerShare / startSnapshot.holdingsPerShare, 1 / yearsFraction) - 1) * 100
      : 0;

    metrics.push({
      ticker,
      companyName: company.name,
      asset: company.asset,
      period: quarter,
      holdingsPerShareStart: startSnapshot.holdingsPerShare,
      holdingsPerShareEnd: endSnapshot.holdingsPerShare,
      growthPct,
      annualizedGrowthPct,
      startDate: startSnapshot.date,
      endDate: endSnapshot.date,
      daysCovered,
    });
  }

  // Sort by growth (descending) and add rank
  metrics.sort((a, b) => b.growthPct - a.growthPct);
  metrics.forEach((m, i) => {
    m.rank = i + 1;
  });

  return metrics;
}

// Get earnings for a specific company
export function getCompanyEarnings(ticker: string): EarningsRecord[] {
  return EARNINGS_DATA
    .filter((e) => e.ticker === ticker)
    .sort((a, b) => {
      // Sort by date descending (most recent first)
      return new Date(b.earningsDate).getTime() - new Date(a.earningsDate).getTime();
    });
}

// Get next upcoming earnings for a company
export function getNextEarnings(ticker: string): EarningsRecord | null {
  const upcoming = EARNINGS_DATA
    .filter((e) => e.ticker === ticker && e.status !== "reported")
    .sort((a, b) => new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime());

  return upcoming[0] || null;
}
