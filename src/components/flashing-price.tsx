"use client";

import { useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";

interface FlashingPriceProps {
  value: number | undefined | null;
  format?: (value: number) => string;
  className?: string;
  flashDuration?: number;
}

/**
 * A price display component that flashes green/red when the value changes.
 * Uses memo to prevent unnecessary re-renders.
 */
export const FlashingPrice = memo(function FlashingPrice({
  value,
  format = (v) => `$${v.toFixed(2)}`,
  className,
  flashDuration = 800,
}: FlashingPriceProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef<number | undefined | null>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip if no previous value or current value
    if (value === undefined || value === null) {
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current === undefined || prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }

    // Only flash if value actually changed
    if (value !== prevValueRef.current) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set flash direction
      if (value > prevValueRef.current) {
        setFlash("up");
      } else if (value < prevValueRef.current) {
        setFlash("down");
      }

      // Clear flash after duration
      timeoutRef.current = setTimeout(() => {
        setFlash(null);
      }, flashDuration);

      prevValueRef.current = value;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, flashDuration]);

  if (value === undefined || value === null) {
    return <span className={className}>—</span>;
  }

  return (
    <span
      className={cn(
        "transition-all duration-200 rounded px-0.5 -mx-0.5",
        flash === "up" && "bg-green-500/25 text-green-600 dark:text-green-400",
        flash === "down" && "bg-red-500/25 text-red-600 dark:text-red-400",
        className
      )}
    >
      {format(value)}
    </span>
  );
});

/**
 * Flashing price specifically for large numbers (market cap, holdings value)
 */
export const FlashingLargeNumber = memo(function FlashingLargeNumber({
  value,
  className,
  flashDuration = 800,
}: {
  value: number | undefined | null;
  className?: string;
  flashDuration?: number;
}) {
  const format = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <FlashingPrice
      value={value}
      format={format}
      className={className}
      flashDuration={flashDuration}
    />
  );
});

/**
 * Flashing percentage change
 */
export const FlashingPercent = memo(function FlashingPercent({
  value,
  className,
  flashDuration = 800,
}: {
  value: number | undefined | null;
  className?: string;
  flashDuration?: number;
}) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef<number | undefined | null>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value === undefined || value === null) {
      prevValueRef.current = value;
      return;
    }

    if (prevValueRef.current === undefined || prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }

    if (value !== prevValueRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (value > prevValueRef.current) {
        setFlash("up");
      } else if (value < prevValueRef.current) {
        setFlash("down");
      }

      timeoutRef.current = setTimeout(() => {
        setFlash(null);
      }, flashDuration);

      prevValueRef.current = value;
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, flashDuration]);

  if (value === undefined || value === null) {
    return <span className={className}>—</span>;
  }

  // Base color based on positive/negative
  const baseColor = value >= 0 ? "text-green-600" : "text-red-600";

  return (
    <span
      className={cn(
        "transition-all duration-200 rounded px-0.5 -mx-0.5",
        flash === "up" && "bg-green-500/25",
        flash === "down" && "bg-red-500/25",
        baseColor,
        className
      )}
    >
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
});
