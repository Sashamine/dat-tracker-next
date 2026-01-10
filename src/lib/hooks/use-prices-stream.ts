"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface CryptoPrice {
  price: number;
  change24h: number;
}

interface StockPrice {
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  isAfterHours?: boolean;
  regularPrice?: number;
}

export interface PricesData {
  crypto: Record<string, CryptoPrice>;
  stocks: Record<string, StockPrice>;
  timestamp: string;
  marketOpen?: boolean;
  extendedHours?: boolean;
}

interface StreamMessage {
  crypto?: Record<string, CryptoPrice>;
  stocks?: Record<string, StockPrice>;
  timestamp: string;
  marketOpen?: boolean;
  extendedHours?: boolean;
  partialUpdate?: boolean;
  error?: string;
}

interface UsePricesStreamResult {
  data: PricesData | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export function usePricesStream(): UsePricesStreamResult {
  const [data, setData] = useState<PricesData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    try {
      const eventSource = new EventSource("/api/prices/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: StreamMessage = JSON.parse(event.data);

          if (message.error) {
            console.error("Stream error:", message.error);
            return;
          }

          setData((prevData) => {
            // If it's a partial update (crypto only), merge with existing stock data
            if (message.partialUpdate && prevData) {
              return {
                ...prevData,
                crypto: message.crypto || prevData.crypto,
                timestamp: message.timestamp,
              };
            }

            // Full update - replace everything
            return {
              crypto: message.crypto || {},
              stocks: message.stocks || {},
              timestamp: message.timestamp,
              marketOpen: message.marketOpen,
              extendedHours: message.extendedHours,
            };
          });
        } catch (e) {
          console.error("Failed to parse price data:", e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();

        // Exponential backoff for reconnection
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };
    } catch (e) {
      setError(e as Error);
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // Handle visibility change - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isConnected) {
        reconnect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, reconnect]);

  return { data, isConnected, error, reconnect };
}
