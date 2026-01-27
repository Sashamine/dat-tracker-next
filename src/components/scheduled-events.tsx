"use client";

import { cn } from "@/lib/utils";
import {
  getScheduledEvents,
  hasScheduledEvents,
  formatDaysUntil,
  formatAmount,
  type ScheduledEvent,
  type ScheduledEventStatus,
} from "@/lib/data/scheduled-events";

interface ScheduledEventsProps {
  ticker: string;
  stockPrice?: number;
  className?: string;
}

function getStatusBadge(status: ScheduledEventStatus): {
  text: string;
  color: string;
} {
  switch (status) {
    case "pending-verification":
      return {
        text: "Pending",
        color:
          "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      };
    case "overdue":
      return {
        text: "Overdue",
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      };
    case "due":
      return {
        text: "Due Today",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      };
    case "due-soon":
      return {
        text: "Due Soon",
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      };
    case "upcoming":
    default:
      return {
        text: "Upcoming",
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      };
  }
}

function EventCard({ event, stockPrice }: { event: ScheduledEvent; stockPrice?: number }) {
  const badge = getStatusBadge(event.status);
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const isPendingVerification = event.status === "pending-verification";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-colors",
        isPendingVerification
          ? "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
          : "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded",
                badge.color
              )}
            >
              {badge.text}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate}
            </span>
          </div>

          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {event.description}
          </p>

          {event.amount && (
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              {formatAmount(event.amount)}
              {event.coupon !== undefined && event.coupon > 0 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  @ {event.coupon}%
                </span>
              )}
            </p>
          )}

          {event.conversionPrice && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Conversion: ${event.conversionPrice.toFixed(2)}/share
              </span>
              {event.conversionLikely !== undefined && (
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    event.conversionLikely
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  )}
                >
                  {event.conversionLikely
                    ? `Likely (MSTR $${stockPrice?.toFixed(0) || "?"} > $${event.conversionPrice.toFixed(0)})`
                    : "Unlikely"}
                </span>
              )}
            </div>
          )}

          {event.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
              {event.notes}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {formatDaysUntil(event.date)}
          </span>
        </div>
      </div>

      {event.sourceEvent?.secUrl && (
        <a
          href={event.sourceEvent.secUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View Original Indenture
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      )}
    </div>
  );
}

export function ScheduledEvents({
  ticker,
  stockPrice,
  className,
}: ScheduledEventsProps) {
  // Don't render if company doesn't have scheduled events data
  if (!hasScheduledEvents(ticker)) {
    return null;
  }

  const events = getScheduledEvents(ticker, stockPrice);

  if (events.length === 0) {
    return null;
  }

  // Separate pending verifications from upcoming maturities
  const pendingEvents = events.filter(
    (e) => e.status === "pending-verification"
  );
  const upcomingEvents = events.filter(
    (e) => e.status !== "pending-verification"
  );

  // Calculate total debt maturing
  const totalDebt = upcomingEvents
    .filter((e) => e.type === "maturity")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scheduled Events
          </h2>
          <p className="text-sm text-gray-500">
            Contractual obligations from SEC filings
          </p>
        </div>
        {totalDebt > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Maturing</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatAmount(totalDebt)}
            </p>
          </div>
        )}
      </div>

      {pendingEvents.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Pending Verification
            </span>
            <span className="text-xs text-gray-500">
              Awaiting SEC filing confirmation
            </span>
          </div>
          <div className="space-y-3">
            {pendingEvents.map((event, idx) => (
              <EventCard
                key={`pending-${event.date}-${idx}`}
                event={event}
                stockPrice={stockPrice}
              />
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Upcoming Maturities
            </span>
            <span className="text-xs text-gray-500">
              {upcomingEvents.length} convertible note
              {upcomingEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {upcomingEvents.map((event, idx) => (
              <EventCard
                key={`upcoming-${event.date}-${idx}`}
                event={event}
                stockPrice={stockPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
