/**
 * MSTR Dynamic Developments
 * =========================
 *
 * Generates "Recent Developments" by combining:
 * 1. Computed metrics from capital events (auto-fresh)
 * 2. Manual milestone events with dates (auto-expire after 6 months)
 *
 * This ensures quantitative data stays current while qualitative
 * milestones naturally age out.
 */

import {
  MSTR_CAPITAL_EVENTS,
  getEventsByType,
} from "./mstr-capital-events";

// =============================================================================
// MILESTONE EVENTS (manual curation - auto-expire after 6 months)
// =============================================================================

export interface MilestoneEvent {
  date: string; // YYYY-MM-DD
  description: string;
  category: "index" | "regulatory" | "product" | "financing" | "corporate";
  permanent?: boolean; // If true, never expires (for truly historic events)
}

/**
 * Manually curated milestone events.
 * Add new events here with dates - they'll auto-expire after 6 months.
 * Mark as permanent: true for events that should always show.
 */
const MILESTONE_EVENTS: MilestoneEvent[] = [
  {
    date: "2024-12-23",
    description: "Nasdaq-100 inclusion - first pure-play Bitcoin company in index",
    category: "index",
    permanent: true, // Historic milestone
  },
  {
    date: "2025-02-01",
    description: "Rebranded from MicroStrategy to Strategy",
    category: "corporate",
    permanent: true,
  },
  {
    date: "2025-11-12",
    description: "$46B omnibus ATM program announced (2B Class A shares + preferred)",
    category: "financing",
  },
  {
    date: "2025-12-15",
    description: "$650M Dec 2025 convertible notes matured - converted to ~16.3M shares",
    category: "financing",
  },
  // Add new milestones here as they occur
];

// =============================================================================
// COMPUTED METRICS (derived from capital events - always fresh)
// =============================================================================

/**
 * Get current BTC holdings from latest capital event
 */
function getCurrentBtcHoldings(): { count: number; date: string } | null {
  const btcEvents = getEventsByType("BTC");
  if (btcEvents.length === 0) return null;

  // Find the most recent event with btcCumulative
  for (let i = btcEvents.length - 1; i >= 0; i--) {
    if (btcEvents[i].btcCumulative) {
      return {
        count: btcEvents[i].btcCumulative!,
        date: btcEvents[i].date,
      };
    }
  }
  return null;
}

/**
 * Calculate total convertible debt outstanding
 */
function getConvertibleDebtOutstanding(): {
  total: number;
  tranches: number;
  nextMaturity: { date: string; amount: number } | null;
} {
  const debtEvents = getEventsByType("DEBT");
  const today = new Date().toISOString().split("T")[0];

  let total = 0;
  let tranches = 0;
  let nextMaturity: { date: string; amount: number } | null = null;

  for (const event of debtEvents) {
    if (event.debtType === "convertible" && event.debtPrincipal && event.debtMaturity) {
      // Only count if not yet matured
      if (event.debtMaturity > today) {
        total += event.debtPrincipal;
        tranches++;

        // Track earliest upcoming maturity
        if (!nextMaturity || event.debtMaturity < nextMaturity.date) {
          nextMaturity = {
            date: event.debtMaturity,
            amount: event.debtPrincipal,
          };
        }
      }
    }
  }

  return { total, tranches, nextMaturity };
}

/**
 * Get preferred stock classes issued
 */
function getPreferredClasses(): string[] {
  const prefEvents = getEventsByType("PREF");
  const classes = new Set<string>();

  for (const event of prefEvents) {
    if (event.prefTicker) {
      classes.add(event.prefTicker);
    }
  }

  return Array.from(classes).sort();
}

/**
 * Get latest ATM capacity
 */
function getAtmCapacity(): { capacity: number; date: string } | null {
  const atmEvents = MSTR_CAPITAL_EVENTS.filter(
    (e) => e.type === "ATM" && e.atmCapacity
  );

  if (atmEvents.length === 0) return null;

  const latest = atmEvents[atmEvents.length - 1];
  return {
    capacity: latest.atmCapacity!,
    date: latest.date,
  };
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

export interface DevelopmentItem {
  text: string;
  category: "metric" | "milestone";
  date?: string;
}

/**
 * Get dynamic recent developments for MSTR
 *
 * @param maxAgeMonths - How many months back to include milestones (default: 6)
 * @returns Array of development strings for display
 */
export function getMstrDevelopments(maxAgeMonths: number = 6): string[] {
  const developments: DevelopmentItem[] = [];
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  // 1. Current BTC holdings (always first - most important metric)
  const btc = getCurrentBtcHoldings();
  if (btc) {
    const btcValueB = (btc.count * 100000) / 1e9; // Rough estimate at $100K
    developments.push({
      text: `${btc.count.toLocaleString()} BTC (~$${btcValueB.toFixed(0)}B at $100K) - world's largest corporate Bitcoin treasury`,
      category: "metric",
      date: btc.date,
    });
  }

  // 2. Convertible debt outstanding
  const debt = getConvertibleDebtOutstanding();
  if (debt.total > 0) {
    const debtB = debt.total / 1e9;
    let debtText = `$${debtB.toFixed(1)}B convertible debt outstanding across ${debt.tranches} tranches`;
    if (debt.nextMaturity) {
      const maturityDate = new Date(debt.nextMaturity.date);
      const monthYear = maturityDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      debtText += ` (next: ${monthYear})`;
    }
    developments.push({
      text: debtText,
      category: "metric",
    });
  }

  // 3. Preferred stock classes
  const prefClasses = getPreferredClasses();
  if (prefClasses.length > 0) {
    developments.push({
      text: `${prefClasses.length} preferred stock classes: ${prefClasses.join(", ")} (8-10% dividends)`,
      category: "metric",
    });
  }

  // 4. ATM capacity
  const atm = getAtmCapacity();
  if (atm) {
    const atmB = atm.capacity / 1e9;
    developments.push({
      text: `$${atmB.toFixed(0)}B ATM capacity for continued accumulation`,
      category: "metric",
    });
  }

  // 5. Recent milestones (filtered by date)
  const recentMilestones = MILESTONE_EVENTS.filter((m) => {
    if (m.permanent) return true;
    return m.date >= cutoffStr;
  }).sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

  for (const milestone of recentMilestones) {
    developments.push({
      text: milestone.description,
      category: "milestone",
      date: milestone.date,
    });
  }

  // Return just the text strings (to match existing interface)
  return developments.map((d) => d.text);
}

/**
 * Get structured developments with metadata (for advanced UI)
 */
export function getMstrDevelopmentsStructured(
  maxAgeMonths: number = 6
): DevelopmentItem[] {
  // Same logic as above but returns full objects
  const developments: DevelopmentItem[] = [];
  const today = new Date();
  const cutoffDate = new Date(today);
  cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const btc = getCurrentBtcHoldings();
  if (btc) {
    const btcValueB = (btc.count * 100000) / 1e9;
    developments.push({
      text: `${btc.count.toLocaleString()} BTC (~$${btcValueB.toFixed(0)}B at $100K) - world's largest corporate Bitcoin treasury`,
      category: "metric",
      date: btc.date,
    });
  }

  const debt = getConvertibleDebtOutstanding();
  if (debt.total > 0) {
    const debtB = debt.total / 1e9;
    let debtText = `$${debtB.toFixed(1)}B convertible debt outstanding across ${debt.tranches} tranches`;
    if (debt.nextMaturity) {
      const maturityDate = new Date(debt.nextMaturity.date);
      const monthYear = maturityDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      debtText += ` (next: ${monthYear})`;
    }
    developments.push({
      text: debtText,
      category: "metric",
    });
  }

  const prefClasses = getPreferredClasses();
  if (prefClasses.length > 0) {
    developments.push({
      text: `${prefClasses.length} preferred stock classes: ${prefClasses.join(", ")} (8-10% dividends)`,
      category: "metric",
    });
  }

  const atm = getAtmCapacity();
  if (atm) {
    const atmB = atm.capacity / 1e9;
    developments.push({
      text: `$${atmB.toFixed(0)}B ATM capacity for continued accumulation`,
      category: "metric",
    });
  }

  const recentMilestones = MILESTONE_EVENTS.filter((m) => {
    if (m.permanent) return true;
    return m.date >= cutoffStr;
  }).sort((a, b) => b.date.localeCompare(a.date));

  for (const milestone of recentMilestones) {
    developments.push({
      text: milestone.description,
      category: "milestone",
      date: milestone.date,
    });
  }

  return developments;
}
