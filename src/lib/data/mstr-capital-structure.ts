/**
 * MSTR Capital Structure Timeline
 * ================================
 *
 * Provides capital structure at any point in time by combining:
 * 1. XBRL quarterly snapshots (source of truth for quarter-ends)
 * 2. 8-K events for inter-quarter changes (BTC, debt, ATM)
 *
 * Data architecture:
 * - Quarter-end dates: Use XBRL data directly (verified)
 * - Inter-quarter dates: Prior quarter XBRL + cumulative 8-K events (derived)
 *
 * Components tracked:
 * - Assets: BTC holdings, cash
 * - Liabilities: Convertible debt, secured debt, total debt
 * - Equity: Preferred equity, common shares outstanding
 */

import {
  MSTR_SEC_HISTORY,
  type MSTRSecFiling,
  adjustSharesForSplit,
  getFilingByPeriod,
} from "./mstr-sec-history";

import {
  MSTR_CAPITAL_EVENTS,
  type CapitalEvent,
  getEventsInRange,
} from "./mstr-capital-events";

export interface CapitalStructureSnapshot {
  date: string; // YYYY-MM-DD
  source: "xbrl" | "derived"; // xbrl = quarter-end verified, derived = inter-quarter

  // Assets
  btcHoldings: number; // BTC count
  btcCostBasis: number; // Total cost basis in USD
  cashAndEquivalents: number; // USD

  // Liabilities
  convertibleDebt: number; // USD (book value from XBRL, or face value for derived)
  securedDebt: number; // USD
  totalDebt: number; // USD

  // Equity
  preferredEquity: number; // USD (liquidation preference)
  commonSharesOutstanding: number; // Share count (post-split adjusted)

  // Derived metrics
  totalAssets: number; // USD
  totalLiabilities: number; // USD
  bookEquity: number; // totalAssets - totalLiabilities

  // Provenance
  xbrlFiling?: MSTRSecFiling; // Source filing if XBRL
  events?: CapitalEvent[]; // Events applied if derived
  notes?: string;
}

/**
 * Get capital structure snapshot for a quarter-end date (XBRL verified)
 */
export function getQuarterEndSnapshot(periodEnd: string): CapitalStructureSnapshot | null {
  const filing = getFilingByPeriod(periodEnd);
  if (!filing) return null;

  // Extract BTC holdings count from cumulative events up to this date
  const btcEvents = MSTR_CAPITAL_EVENTS.filter(
    (e) => e.type === "BTC" && e.date <= periodEnd
  );
  const lastBtcEvent = btcEvents.length > 0
    ? btcEvents[btcEvents.length - 1]
    : null;
  const btcHoldings = lastBtcEvent?.btcCumulative || 0;

  // Calculate cost basis from all BTC purchases up to this date
  const btcCostBasis = btcEvents.reduce(
    (sum, e) => sum + (e.btcPurchasePrice || 0),
    0
  );

  // Debt breakdown
  const convertibleDebt = filing.convertibleDebt || 0;
  const totalDebt = filing.longTermDebt || convertibleDebt;
  const securedDebt = totalDebt - convertibleDebt;

  return {
    date: periodEnd,
    source: "xbrl",
    btcHoldings,
    btcCostBasis,
    cashAndEquivalents: filing.cashAndEquivalents,
    convertibleDebt,
    securedDebt,
    totalDebt,
    preferredEquity: filing.preferredEquity || 0,
    commonSharesOutstanding: adjustSharesForSplit(filing),
    totalAssets: filing.totalAssets,
    totalLiabilities: filing.totalLiabilities,
    bookEquity: filing.totalAssets - filing.totalLiabilities,
    xbrlFiling: filing,
    notes: filing.notes,
  };
}

/**
 * Find the most recent quarter-end before a given date
 */
function findPriorQuarterEnd(date: string): MSTRSecFiling | null {
  const priorFilings = MSTR_SEC_HISTORY.filter((f) => f.periodEnd < date);
  return priorFilings.length > 0 ? priorFilings[priorFilings.length - 1] : null;
}

/**
 * Find the next quarter-end after a given date (for validation)
 */
function findNextQuarterEnd(date: string): MSTRSecFiling | null {
  const nextFilings = MSTR_SEC_HISTORY.filter((f) => f.periodEnd >= date);
  return nextFilings.length > 0 ? nextFilings[0] : null;
}

/**
 * Get capital structure snapshot for any date (derived if inter-quarter)
 */
export function getCapitalStructureAt(date: string): CapitalStructureSnapshot | null {
  // Check if this is a quarter-end date
  const quarterEndSnapshot = getQuarterEndSnapshot(date);
  if (quarterEndSnapshot) {
    return quarterEndSnapshot;
  }

  // Find prior quarter-end as base
  const priorFiling = findPriorQuarterEnd(date);
  if (!priorFiling) {
    // Before first XBRL filing - can't derive
    return null;
  }

  // Get base snapshot from prior quarter
  const baseSnapshot = getQuarterEndSnapshot(priorFiling.periodEnd);
  if (!baseSnapshot) return null;

  // Get events between prior quarter-end and target date
  const startDate = addDays(priorFiling.periodEnd, 1);
  const events = getEventsInRange(startDate, date);

  // Apply events to derive current state
  let btcHoldings = baseSnapshot.btcHoldings;
  let btcCostBasis = baseSnapshot.btcCostBasis;
  let convertibleDebt = baseSnapshot.convertibleDebt;
  let securedDebt = baseSnapshot.securedDebt;
  let preferredEquity = baseSnapshot.preferredEquity;
  let commonShares = baseSnapshot.commonSharesOutstanding;
  let cash = baseSnapshot.cashAndEquivalents;

  for (const event of events) {
    switch (event.type) {
      case "BTC":
        // BTC purchase
        if (event.btcAcquired) {
          btcHoldings += event.btcAcquired;
          btcCostBasis += event.btcPurchasePrice || 0;
          // Cash decreases (unless funded by ATM/debt in same event)
          if (!event.atmTotalProceeds) {
            cash -= event.btcPurchasePrice || 0;
          }
        }
        // ATM sales increase shares and cash
        if (event.atmMstrShares) {
          commonShares += event.atmMstrShares;
          cash += event.atmMstrProceeds || 0;
        }
        // Preferred ATM increases preferred equity
        if (event.atmPrefSales) {
          for (const prefSale of event.atmPrefSales) {
            preferredEquity += prefSale.proceeds;
          }
        }
        break;

      case "DEBT":
        // New debt issuance
        if (event.debtType === "convertible") {
          convertibleDebt += event.debtPrincipal || 0;
        } else if (event.debtType === "secured") {
          securedDebt += event.debtPrincipal || 0;
        }
        cash += event.debtPrincipal || 0; // Proceeds from debt
        break;

      case "PREF":
        // Preferred stock issuance
        preferredEquity += event.prefGrossProceeds || 0;
        cash += event.prefGrossProceeds || 0;
        break;

      case "DEBT_EVENT":
        // Debt redemption, conversion, etc.
        // These reduce debt (handled case-by-case based on description)
        break;

      case "CORP":
        // Stock split - already handled by adjustSharesForSplit
        break;
    }
  }

  const totalDebt = convertibleDebt + securedDebt;

  // Estimate total assets/liabilities (rough - XBRL is more accurate)
  // For derived snapshots, we update based on known changes
  const assetChange = (btcCostBasis - baseSnapshot.btcCostBasis) + (cash - baseSnapshot.cashAndEquivalents);
  const liabilityChange = (totalDebt - baseSnapshot.totalDebt) + (preferredEquity - baseSnapshot.preferredEquity);

  return {
    date,
    source: "derived",
    btcHoldings,
    btcCostBasis,
    cashAndEquivalents: Math.max(0, cash), // Can't go negative
    convertibleDebt,
    securedDebt,
    totalDebt,
    preferredEquity,
    commonSharesOutstanding: commonShares,
    totalAssets: baseSnapshot.totalAssets + assetChange,
    totalLiabilities: baseSnapshot.totalLiabilities + liabilityChange,
    bookEquity: (baseSnapshot.totalAssets + assetChange) - (baseSnapshot.totalLiabilities + liabilityChange),
    events,
    notes: `Derived from ${priorFiling.periodEnd} XBRL + ${events.length} events`,
  };
}

/**
 * Add days to a date string
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Get capital structure timeline (all quarter-ends plus key events)
 */
export function getCapitalStructureTimeline(): CapitalStructureSnapshot[] {
  const timeline: CapitalStructureSnapshot[] = [];

  // Add all quarter-end snapshots
  for (const filing of MSTR_SEC_HISTORY) {
    const snapshot = getQuarterEndSnapshot(filing.periodEnd);
    if (snapshot) {
      timeline.push(snapshot);
    }
  }

  return timeline;
}

/**
 * Get capital structure at multiple dates (for charting)
 */
export function getCapitalStructureRange(
  startDate: string,
  endDate: string,
  interval: "daily" | "weekly" | "monthly" | "quarterly" = "quarterly"
): CapitalStructureSnapshot[] {
  const snapshots: CapitalStructureSnapshot[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    const snapshot = getCapitalStructureAt(currentDate);
    if (snapshot) {
      snapshots.push(snapshot);
    }

    // Advance to next interval
    const d = new Date(currentDate);
    switch (interval) {
      case "daily":
        d.setDate(d.getDate() + 1);
        break;
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
    }
    currentDate = d.toISOString().split("T")[0];
  }

  return snapshots;
}

/**
 * Calculate mNAV at a point in time given BTC price
 */
export function calculateMnavAt(
  date: string,
  btcPrice: number
): { mnav: number; snapshot: CapitalStructureSnapshot } | null {
  const snapshot = getCapitalStructureAt(date);
  if (!snapshot) return null;

  const btcValue = snapshot.btcHoldings * btcPrice;
  const enterpriseValue =
    (snapshot.commonSharesOutstanding * btcPrice * 0) + // Need stock price, not BTC price
    snapshot.totalDebt +
    snapshot.preferredEquity -
    snapshot.cashAndEquivalents;

  // For mNAV we need stock price, not just BTC price
  // This is a simplified version - full calculation needs market cap
  const cryptoNav = btcValue;

  // Return placeholder - full mNAV needs stock price
  return {
    mnav: enterpriseValue / cryptoNav,
    snapshot,
  };
}

/**
 * Get summary statistics for a date range
 */
export function getCapitalStructureSummary(
  startDate: string,
  endDate: string
): {
  btcAccumulated: number;
  btcSpent: number;
  debtIssued: number;
  sharesIssued: number;
  preferredIssued: number;
} {
  const events = getEventsInRange(startDate, endDate);

  const btcAccumulated = events
    .filter((e) => e.type === "BTC")
    .reduce((sum, e) => sum + (e.btcAcquired || 0), 0);

  const btcSpent = events
    .filter((e) => e.type === "BTC")
    .reduce((sum, e) => sum + (e.btcPurchasePrice || 0), 0);

  const debtIssued = events
    .filter((e) => e.type === "DEBT")
    .reduce((sum, e) => sum + (e.debtPrincipal || 0), 0);

  const sharesIssued = events.reduce(
    (sum, e) => sum + (e.atmMstrShares || 0),
    0
  );

  const preferredIssued = events
    .filter((e) => e.type === "PREF")
    .reduce((sum, e) => sum + (e.prefGrossProceeds || 0), 0);

  return {
    btcAccumulated,
    btcSpent,
    debtIssued,
    sharesIssued,
    preferredIssued,
  };
}
