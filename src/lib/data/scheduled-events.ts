/**
 * Scheduled Events - Extract future/pending events from capital events data
 * =========================================================================
 *
 * This module extracts contractually-determined events that haven't been
 * filed with the SEC yet, such as:
 * - Upcoming debt maturities
 * - Expected conversions (when stock price > conversion price)
 * - Pending verifications (events that occurred but await SEC filing)
 */

import {
  MSTR_CAPITAL_EVENTS,
  type CapitalEvent,
} from "./mstr-capital-events";

export type ScheduledEventType = "maturity" | "conversion" | "pending";
export type ScheduledEventStatus =
  | "upcoming"
  | "due-soon"
  | "due"
  | "overdue"
  | "pending-verification";

export interface ScheduledEvent {
  date: string; // When event is due (YYYY-MM-DD)
  type: ScheduledEventType;
  status: ScheduledEventStatus;
  description: string;
  amount?: number; // Principal or value in USD
  coupon?: number; // Interest rate for debt
  conversionPrice?: number; // For convertibles
  conversionLikely?: boolean; // True if stock price > conversion price
  sourceEvent?: CapitalEvent; // Original issuance event for reference
  ticker?: string; // e.g., "MSTR"
  notes?: string;
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get event status based on date
 */
function getEventStatus(
  eventDate: string,
  today: string = new Date().toISOString().split("T")[0]
): ScheduledEventStatus {
  const daysUntil = daysBetween(today, eventDate);
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "due";
  if (daysUntil <= 90) return "due-soon";
  return "upcoming";
}

/**
 * Format days until event for display
 */
export function formatDaysUntil(eventDate: string): string {
  const today = new Date().toISOString().split("T")[0];
  const days = daysBetween(today, eventDate);

  if (days < 0) {
    const absDays = Math.abs(days);
    if (absDays === 1) return "1 day ago";
    if (absDays < 30) return `${absDays} days ago`;
    const months = Math.floor(absDays / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  return `${years}y ${remainingMonths}mo`;
}

/**
 * Format currency amount for display
 */
export function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(0)}M`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Get upcoming debt maturities for a ticker
 */
export function getUpcomingMaturities(
  ticker: string,
  stockPrice?: number
): ScheduledEvent[] {
  if (ticker !== "MSTR") return []; // Only MSTR has capital events data for now

  const today = new Date().toISOString().split("T")[0];

  return MSTR_CAPITAL_EVENTS.filter(
    (event) =>
      event.type === "DEBT" &&
      event.debtType === "convertible" &&
      event.debtMaturity &&
      event.debtMaturity > today // Future maturities only
  ).map((event) => {
    const conversionLikely =
      stockPrice && event.conversionPrice
        ? stockPrice > event.conversionPrice
        : undefined;

    return {
      date: event.debtMaturity!,
      type: "maturity" as ScheduledEventType,
      status: getEventStatus(event.debtMaturity!),
      description: event.description,
      amount: event.debtPrincipal,
      coupon: event.debtCoupon,
      conversionPrice: event.conversionPrice,
      conversionLikely,
      sourceEvent: event,
      ticker,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get pending verifications - events that occurred but await SEC filing
 * These are manually defined based on known events awaiting confirmation
 */
export function getPendingVerifications(ticker: string): ScheduledEvent[] {
  if (ticker !== "MSTR") return [];

  const pendingEvents: ScheduledEvent[] = [];

  // Dec 2025 Notes matured - awaiting Q4 2025 10-Q for conversion confirmation
  const dec2025NotesMaturity = "2025-12-15";
  const today = new Date().toISOString().split("T")[0];

  if (today >= dec2025NotesMaturity) {
    // Find the original issuance event
    const originalEvent = MSTR_CAPITAL_EVENTS.find(
      (e) =>
        e.type === "DEBT" &&
        e.debtMaturity === dec2025NotesMaturity &&
        e.debtPrincipal === 650_000_000
    );

    pendingEvents.push({
      date: dec2025NotesMaturity,
      type: "pending",
      status: "pending-verification",
      description: "Dec 2025 Notes Matured - $650M converted to equity",
      amount: 650_000_000,
      conversionPrice: 39.8,
      conversionLikely: true, // MSTR was >$300 at maturity
      sourceEvent: originalEvent,
      ticker,
      notes:
        "Awaiting Q4 2025 10-Q (~Feb 2026) for conversion details. Expected ~16.3M shares at ~$39.80/share.",
    });
  }

  return pendingEvents;
}

/**
 * Get all scheduled events for a ticker
 */
export function getScheduledEvents(
  ticker: string,
  stockPrice?: number
): ScheduledEvent[] {
  const pending = getPendingVerifications(ticker);
  const maturities = getUpcomingMaturities(ticker, stockPrice);

  return [...pending, ...maturities];
}

/**
 * Check if a company has scheduled events data
 */
export function hasScheduledEvents(ticker: string): boolean {
  return ticker === "MSTR"; // Expand as more companies get capital events data
}

/**
 * Get summary stats for scheduled events
 */
export function getScheduledEventsSummary(
  ticker: string,
  stockPrice?: number
): {
  totalPending: number;
  totalUpcoming: number;
  totalDebtMaturing: number;
  nearTermMaturities: number; // Within 2 years
} {
  const events = getScheduledEvents(ticker, stockPrice);

  const pending = events.filter((e) => e.status === "pending-verification");
  const upcoming = events.filter(
    (e) => e.status === "upcoming" || e.status === "due-soon"
  );

  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
  const twoYearsStr = twoYearsFromNow.toISOString().split("T")[0];

  const nearTerm = events.filter(
    (e) => e.type === "maturity" && e.date <= twoYearsStr
  );

  const totalDebt = events
    .filter((e) => e.type === "maturity")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    totalPending: pending.length,
    totalUpcoming: upcoming.length,
    totalDebtMaturing: totalDebt,
    nearTermMaturities: nearTerm.length,
  };
}
