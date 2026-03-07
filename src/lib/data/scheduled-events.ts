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

import { MSTR_CAPITAL_EVENTS } from "./mstr-capital-events";
import { MSTR_DEBT_ISSUANCES } from "./mstr-debt-issuances";
import { dilutiveInstruments } from "./dilutive-instruments";
import { debtInstruments } from "./debt-instruments";

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
  ticker?: string; // e.g., "MSTR"
  notes?: string;
  settlementType: "cash" | "shares" | "mixed";
  sourceUrl?: string; // Link to primary source
}

function resolveDebtInstrumentSourceUrl(
  ticker: string,
  maturityDate: string,
  couponRate: number,
  sourceUrl: string
): string {
  if (
    ticker !== "MSTR" ||
    sourceUrl !== "/filings/mstr/0001193125-25-262568"
  ) {
    return sourceUrl;
  }

  const matchedIssuance = MSTR_DEBT_ISSUANCES.find((issuance) => {
    const issuanceCoupon = issuance.interestRate ?? 0;
    return (
      issuance.maturityDate === maturityDate ||
      issuance.maturityDate === new Date(maturityDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    ) && Math.abs(issuanceCoupon - couponRate * 100) < 0.0001;
  });

  return matchedIssuance?.secUrl || sourceUrl;
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
 * Get upcoming debt maturities for a ticker.
 * Unifies data from capital-events, dilutive-instruments, and debt-instruments.
 */
export function getUpcomingMaturities(
  ticker: string,
  stockPrice?: number
): ScheduledEvent[] {
  const today = new Date().toISOString().split("T")[0];
  const events: ScheduledEvent[] = [];

  // 1. Ingest from centralized debt-instruments.ts
  const modeledDebt = debtInstruments[ticker] || [];
  for (const inst of modeledDebt) {
    if (inst.maturityDate > today) {
      const isConvertible = inst.type === "convertible";
      const conversionLikely = isConvertible && stockPrice && (inst as any).conversionPrice
        ? stockPrice > (inst as any).conversionPrice
        : undefined;

      events.push({
        date: inst.maturityDate,
        type: "maturity",
        status: getEventStatus(inst.maturityDate),
        description: `${inst.type.charAt(0).toUpperCase() + inst.type.slice(1)} Maturity`,
        amount: inst.faceValue,
        coupon: inst.couponRate * 100,
        conversionPrice: (inst as any).conversionPrice,
        conversionLikely,
        ticker,
        settlementType: isConvertible ? (conversionLikely ? "shares" : "cash") : "cash",
        sourceUrl: resolveDebtInstrumentSourceUrl(
          ticker,
          inst.maturityDate,
          inst.couponRate,
          inst.sourceUrl
        ),
        notes: inst.notes
      });
    }
  }

  // 2. Ingest from dilutive-instruments.ts (fallback for convertibles not yet in debt-instruments)
  const dilutives = dilutiveInstruments[ticker] || [];
  for (const inst of dilutives) {
    if (inst.type === "convertible" && inst.expiration && inst.expiration > today) {
      // Check if we already have this maturity from the debt-instruments layer
      const exists = events.some(e => e.date === inst.expiration && e.amount === inst.faceValue);
      if (exists) continue;

      const conversionLikely = stockPrice ? stockPrice > inst.strikePrice : undefined;

      events.push({
        date: inst.expiration,
        type: "maturity",
        status: getEventStatus(inst.expiration),
        description: `Convertible Note Maturity`,
        amount: inst.faceValue,
        conversionPrice: inst.strikePrice,
        conversionLikely,
        ticker,
        settlementType: conversionLikely ? "shares" : "cash",
        sourceUrl: inst.sourceUrl,
        notes: inst.notes
      });
    }
  }

  // 3. Special handling for MSTR legacy capital events (to preserve detail)
  if (ticker === "MSTR") {
    const mstrSecuredNotesMaturity = "2028-06-15";
    if (mstrSecuredNotesMaturity > today) {
       const exists = events.some(e => e.date === mstrSecuredNotesMaturity);
       if (!exists) {
         events.push({
           date: mstrSecuredNotesMaturity,
           type: "maturity",
           status: getEventStatus(mstrSecuredNotesMaturity),
           description: "Senior Secured Notes Maturity",
           amount: 400_000_000,
           coupon: 0, // Zero coupon secured
           ticker,
           settlementType: "cash",
           sourceUrl: "/filings/mstr/0001193125-21-191160",
           notes: "Must be repaid in cash (not a convertible)"
         });
       }
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get pending verifications - events that occurred but await SEC filing
 */
export function getPendingVerifications(ticker: string): ScheduledEvent[] {
  if (ticker !== "MSTR") return [];

  const pendingEvents: ScheduledEvent[] = [];
  const dec2025NotesMaturity = "2025-12-15";
  const today = new Date().toISOString().split("T")[0];

  if (today >= dec2025NotesMaturity) {
    pendingEvents.push({
      date: dec2025NotesMaturity,
      type: "pending",
      status: "pending-verification",
      description: "Dec 2025 Notes Matured - $650M converted to equity",
      amount: 650_000_000,
      conversionPrice: 39.8,
      conversionLikely: true,
      ticker,
      settlementType: "shares",
      notes: "Awaiting Q4 2025 10-Q (~Feb 2026) for conversion details. Expected ~16.3M shares at ~$39.80/share.",
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
  // If either debt-instruments or dilutive-instruments have entries, we have data.
  return !!(debtInstruments[ticker] || (dilutiveInstruments[ticker] && dilutiveInstruments[ticker].some(i => i.type === 'convertible')));
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
  nearTermMaturities: number; 
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
