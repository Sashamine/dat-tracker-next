"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PriceCellProps {
  price: number | undefined;
  previousPrice?: number;
  format?: "currency" | "number" | "percent";
  decimals?: number;
  className?: string;
  showChange?: boolean;
}

export function PriceCell({
  price,
  previousPrice,
  format = "currency",
  decimals = 2,
  className,
  showChange = false,
}: PriceCellProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | undefined>(previousPrice);

  useEffect(() => {
    if (price === undefined || prevPriceRef.current === undefined) {
      prevPriceRef.current = price;
      return;
    }

    if (price > prevPriceRef.current) {
      setFlash("up");
    } else if (price < prevPriceRef.current) {
      setFlash("down");
    }

    prevPriceRef.current = price;

    // Clear flash after animation
    const timeout = setTimeout(() => setFlash(null), 1000);
    return () => clearTimeout(timeout);
  }, [price]);

  if (price === undefined || price === null) {
    return <span className={className}>—</span>;
  }

  const formatValue = () => {
    switch (format) {
      case "currency":
        return `$${price.toFixed(decimals)}`;
      case "percent":
        return `${price >= 0 ? "+" : ""}${price.toFixed(decimals)}%`;
      case "number":
      default:
        return price.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
    }
  };

  return (
    <span
      className={cn(
        "transition-colors duration-300 font-mono",
        flash === "up" && "bg-green-500/30 text-green-600",
        flash === "down" && "bg-red-500/30 text-red-600",
        className
      )}
    >
      {formatValue()}
    </span>
  );
}

// Specialized component for stock price with 24h change
interface StockPriceCellProps {
  price: number | undefined;
  change24h?: number;
  className?: string;
}

export function StockPriceCell({ price, change24h, className }: StockPriceCellProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | undefined>(price);

  useEffect(() => {
    if (price === undefined || prevPriceRef.current === undefined) {
      prevPriceRef.current = price;
      return;
    }

    if (price > prevPriceRef.current) {
      setFlash("up");
    } else if (price < prevPriceRef.current) {
      setFlash("down");
    }

    prevPriceRef.current = price;

    const timeout = setTimeout(() => setFlash(null), 1000);
    return () => clearTimeout(timeout);
  }, [price]);

  if (!price) {
    return <span className={className}>—</span>;
  }

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <span
        className={cn(
          "font-mono font-medium transition-all duration-300 px-1 rounded",
          flash === "up" && "bg-green-500/20 text-green-600",
          flash === "down" && "bg-red-500/20 text-red-600"
        )}
      >
        ${price.toFixed(2)}
      </span>
      {change24h !== undefined && (
        <span
          className={cn(
            "text-xs font-mono",
            change24h >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {change24h >= 0 ? "+" : ""}
          {change24h.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// Crypto price with larger display for headers
interface CryptoPriceCellProps {
  symbol: string;
  price: number | undefined;
  change24h?: number;
  size?: "sm" | "md" | "lg";
}

export function CryptoPriceCell({
  symbol,
  price,
  change24h,
  size = "md",
}: CryptoPriceCellProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number | undefined>(price);

  useEffect(() => {
    if (price === undefined || prevPriceRef.current === undefined) {
      prevPriceRef.current = price;
      return;
    }

    if (price > prevPriceRef.current) {
      setFlash("up");
    } else if (price < prevPriceRef.current) {
      setFlash("down");
    }

    prevPriceRef.current = price;

    const timeout = setTimeout(() => setFlash(null), 1000);
    return () => clearTimeout(timeout);
  }, [price]);

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  if (!price) {
    return <span className="text-gray-400">Loading...</span>;
  }

  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "font-bold font-mono transition-all duration-300 px-2 rounded",
          sizeClasses[size],
          flash === "up" && "bg-green-500/20 text-green-600",
          flash === "down" && "bg-red-500/20 text-red-600",
          !flash && "text-gray-900 dark:text-gray-100"
        )}
      >
        ${price.toLocaleString()}
      </span>
      {change24h !== undefined && (
        <span
          className={cn(
            "text-sm font-medium",
            change24h >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {change24h >= 0 ? "+" : ""}
          {change24h.toFixed(2)}% 24h
        </span>
      )}
    </div>
  );
}
