"use client";

import { useRouter } from "next/navigation";
import { EarningsCard } from "./earnings-card";
import { useEarningsCalendar } from "@/lib/hooks/use-earnings";
import { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EarningsCalendarProps {
  days?: number;
  asset?: Asset;
  upcoming?: boolean;
  limit?: number;
  compact?: boolean;
  className?: string;
}

export function EarningsCalendar({
  days = 90,
  asset,
  upcoming = true,
  limit,
  compact = false,
  className,
}: EarningsCalendarProps) {
  const router = useRouter();
  const { data, isLoading, error } = useEarningsCalendar({ days, asset, upcoming });

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(compact ? 3 : 5)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        Failed to load earnings calendar
      </div>
    );
  }

  const entries = limit ? data?.entries.slice(0, limit) : data?.entries;

  if (!entries || entries.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        {upcoming ? "No upcoming earnings" : "No recent earnings"}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {entries.map((entry) => (
        <EarningsCard
          key={`${entry.ticker}-${entry.earningsDate}`}
          entry={entry}
          onClick={() => router.push(`/company/${entry.ticker}/earnings`)}
        />
      ))}
    </div>
  );
}
