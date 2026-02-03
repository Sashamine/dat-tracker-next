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
  lastTrade?: string;
}

export interface PricesData {
  crypto: Record<string, CryptoPrice>;
  stocks: Record<string, StockPrice>;
  forex?: Record<string, number>;  // Live forex rates (e.g., JPY: 156)
  timestamp: string;
  marketOpen?: boolean;
  extendedHours?: boolean;
}

// Message types from the server
interface FullUpdateMessage {
  crypto: Record<string, CryptoPrice>;
  stocks: Record<string, StockPrice>;
  forex?: Record<string, number>;  // Live forex rates (e.g., JPY: 156)
  timestamp: string;
  marketOpen?: boolean;
  extendedHours?: boolean;
  fullRefresh?: boolean;
  partialUpdate?: boolean;
}

interface TradeMessage {
  type: "trade";
  symbol: string;
  price: number;
  change24h?: number;
  timestamp: string;
  assetType: "stock" | "crypto";
}

interface ErrorMessage {
  error: string;
}

type StreamMessage = FullUpdateMessage | TradeMessage | ErrorMessage;

interface UsePricesStreamResult {
  data: PricesData | null;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
  lastTradeTime: string | null;
}

export function usePricesStream(): UsePricesStreamResult {
  const [data, setData] = useState<PricesData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastTradeTime, setLastTradeTime] = useState<string | null>(null);
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

          // Handle error messages
          if ("error" in message) {
            console.error("Stream error:", message.error);
            return;
          }

          // Handle real-time trade updates
          if ("type" in message && message.type === "trade") {
            const trade = message as TradeMessage;
            // Debug DCC.AX trades (shouldn't happen - it's Yahoo stock)
            if (trade.symbol === "DCC.AX") {
              console.log("[Stream] UNEXPECTED DCC.AX trade event:", trade);
            }
            setLastTradeTime(trade.timestamp);

            setData((prevData) => {
              if (!prevData) return prevData;

              if (trade.assetType === "stock") {
                return {
                  ...prevData,
                  stocks: {
                    ...prevData.stocks,
                    [trade.symbol]: {
                      ...prevData.stocks[trade.symbol],
                      price: trade.price,
                      change24h: trade.change24h ?? prevData.stocks[trade.symbol]?.change24h ?? 0,
                      lastTrade: trade.timestamp,
                    },
                  },
                  timestamp: trade.timestamp,
                };
              } else {
                return {
                  ...prevData,
                  crypto: {
                    ...prevData.crypto,
                    [trade.symbol]: {
                      ...prevData.crypto[trade.symbol],
                      price: trade.price,
                    },
                  },
                  timestamp: trade.timestamp,
                };
              }
            });
            return;
          }

          // Handle full updates (initial or refresh)
          const fullUpdate = message as FullUpdateMessage;
          
          // Debug DCC.AX in full updates - DETAILED
          if (fullUpdate.stocks?.["DCC.AX"]) {
            const dccData = fullUpdate.stocks["DCC.AX"];
            console.log("[Stream] DCC.AX RECEIVED FROM SERVER:", {
              price: dccData.price,
              priceIsAUD: dccData.price > 0.03 && dccData.price < 0.05,
              priceIsUSD: dccData.price > 0.02 && dccData.price < 0.03,
              marketCap: dccData.marketCap,
              fullData: dccData,
              partialUpdate: fullUpdate.partialUpdate,
            });
          }

          if (fullUpdate.partialUpdate) {
            // Crypto-only partial update (legacy support)
            setData((prevData) => {
              if (!prevData) return prevData;
              return {
                ...prevData,
                crypto: fullUpdate.crypto || prevData.crypto,
                timestamp: fullUpdate.timestamp,
              };
            });
          } else {
            // Full update - replace everything
            setData({
              crypto: fullUpdate.crypto || {},
              stocks: fullUpdate.stocks || {},
              forex: fullUpdate.forex,  // Include forex rates for non-USD conversions
              timestamp: fullUpdate.timestamp,
              marketOpen: fullUpdate.marketOpen,
              extendedHours: fullUpdate.extendedHours,
            });
          }
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

  return { data, isConnected, error, reconnect, lastTradeTime };
}
