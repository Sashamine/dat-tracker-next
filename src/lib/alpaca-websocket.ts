// Alpaca WebSocket Client for Real-Time Stock & Crypto Data
// Docs: https://docs.alpaca.markets/docs/real-time-stock-pricing-data

import { STOCK_TICKERS, CRYPTO_SYMBOLS } from "./alpaca";

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || "";
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

// WebSocket endpoints
const STOCK_WS_URL = "wss://stream.data.alpaca.markets/v2/iex"; // Free tier (IEX)
const CRYPTO_WS_URL = "wss://stream.data.alpaca.markets/v1beta3/crypto/us";

export interface TradeUpdate {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  type: "stock" | "crypto";
}

export interface QuoteUpdate {
  symbol: string;
  askPrice: number;
  bidPrice: number;
  timestamp: string;
  type: "stock" | "crypto";
}

type MessageHandler = (data: TradeUpdate | QuoteUpdate) => void;

// Alpaca WebSocket message types
interface AlpacaAuthMessage {
  action: "auth";
  key: string;
  secret: string;
}

interface AlpacaSubscribeMessage {
  action: "subscribe";
  trades?: string[];
  quotes?: string[];
  bars?: string[];
}

interface AlpacaTradeMessage {
  T: "t"; // trade
  S: string; // symbol
  p: number; // price
  s: number; // size
  t: string; // timestamp
  c?: string[]; // conditions
}

interface AlpacaQuoteMessage {
  T: "q"; // quote
  S: string; // symbol
  ap: number; // ask price
  bp: number; // bid price
  as: number; // ask size
  bs: number; // bid size
  t: string; // timestamp
}

// Create a managed WebSocket connection
export function createAlpacaStockStream(onMessage: MessageHandler): {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
} {
  let ws: WebSocket | null = null;
  let connected = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let shouldReconnect = true;

  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
        reject(new Error("Alpaca API keys not configured"));
        return;
      }

      try {
        ws = new WebSocket(STOCK_WS_URL);

        ws.onopen = () => {
          console.log("[Alpaca WS] Stock connection opened");
          // Authenticate
          const authMsg: AlpacaAuthMessage = {
            action: "auth",
            key: ALPACA_API_KEY,
            secret: ALPACA_SECRET_KEY,
          };
          ws?.send(JSON.stringify(authMsg));
        };

        ws.onmessage = (event) => {
          try {
            const messages = JSON.parse(event.data.toString());

            for (const msg of Array.isArray(messages) ? messages : [messages]) {
              // Handle authentication success
              if (msg.T === "success" && msg.msg === "authenticated") {
                console.log("[Alpaca WS] Authenticated, subscribing to trades...");
                connected = true;

                // Subscribe to all stock trades
                const subscribeMsg: AlpacaSubscribeMessage = {
                  action: "subscribe",
                  trades: STOCK_TICKERS,
                };
                ws?.send(JSON.stringify(subscribeMsg));
                resolve();
              }

              // Handle subscription confirmation
              if (msg.T === "subscription") {
                console.log("[Alpaca WS] Subscribed to:", msg.trades?.length || 0, "stocks");
              }

              // Handle trade updates
              if (msg.T === "t") {
                const trade = msg as AlpacaTradeMessage;
                onMessage({
                  symbol: trade.S,
                  price: trade.p,
                  size: trade.s,
                  timestamp: trade.t,
                  type: "stock",
                });
              }

              // Handle quote updates
              if (msg.T === "q") {
                const quote = msg as AlpacaQuoteMessage;
                onMessage({
                  symbol: quote.S,
                  askPrice: quote.ap,
                  bidPrice: quote.bp,
                  timestamp: quote.t,
                  type: "stock",
                } as QuoteUpdate);
              }

              // Handle errors
              if (msg.T === "error") {
                console.error("[Alpaca WS] Error:", msg.msg);
                if (msg.msg === "auth failed") {
                  reject(new Error("Alpaca authentication failed"));
                }
              }
            }
          } catch (e) {
            console.error("[Alpaca WS] Parse error:", e);
          }
        };

        ws.onerror = (error) => {
          console.error("[Alpaca WS] Stock WebSocket error:", error);
          connected = false;
        };

        ws.onclose = () => {
          console.log("[Alpaca WS] Stock connection closed");
          connected = false;
          ws = null;

          // Attempt reconnection
          if (shouldReconnect) {
            reconnectTimeout = setTimeout(() => {
              console.log("[Alpaca WS] Attempting reconnection...");
              connect().catch(console.error);
            }, 5000);
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  };

  const disconnect = () => {
    shouldReconnect = false;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  };

  const isConnected = () => connected;

  return { connect, disconnect, isConnected };
}

// Create a managed WebSocket connection for crypto
export function createAlpacaCryptoStream(onMessage: MessageHandler): {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: () => boolean;
} {
  let ws: WebSocket | null = null;
  let connected = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let shouldReconnect = true;

  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
        reject(new Error("Alpaca API keys not configured"));
        return;
      }

      try {
        ws = new WebSocket(CRYPTO_WS_URL);

        ws.onopen = () => {
          console.log("[Alpaca WS] Crypto connection opened");
          // Authenticate
          const authMsg: AlpacaAuthMessage = {
            action: "auth",
            key: ALPACA_API_KEY,
            secret: ALPACA_SECRET_KEY,
          };
          ws?.send(JSON.stringify(authMsg));
        };

        ws.onmessage = (event) => {
          try {
            const messages = JSON.parse(event.data.toString());

            for (const msg of Array.isArray(messages) ? messages : [messages]) {
              // Handle authentication success
              if (msg.T === "success" && msg.msg === "authenticated") {
                console.log("[Alpaca WS] Crypto authenticated, subscribing...");
                connected = true;

                // Subscribe to crypto trades
                const cryptoSymbols = Object.values(CRYPTO_SYMBOLS);
                const subscribeMsg: AlpacaSubscribeMessage = {
                  action: "subscribe",
                  trades: cryptoSymbols,
                };
                ws?.send(JSON.stringify(subscribeMsg));
                resolve();
              }

              // Handle subscription confirmation
              if (msg.T === "subscription") {
                console.log("[Alpaca WS] Subscribed to:", msg.trades?.length || 0, "crypto pairs");
              }

              // Handle trade updates - crypto uses different symbol format
              if (msg.T === "t") {
                const trade = msg as AlpacaTradeMessage;
                // Convert "ETH/USD" to "ETH"
                const symbol = trade.S.replace("/USD", "");
                onMessage({
                  symbol,
                  price: trade.p,
                  size: trade.s,
                  timestamp: trade.t,
                  type: "crypto",
                });
              }

              // Handle errors
              if (msg.T === "error") {
                console.error("[Alpaca WS] Crypto error:", msg.msg);
              }
            }
          } catch (e) {
            console.error("[Alpaca WS] Crypto parse error:", e);
          }
        };

        ws.onerror = (error) => {
          console.error("[Alpaca WS] Crypto WebSocket error:", error);
          connected = false;
        };

        ws.onclose = () => {
          console.log("[Alpaca WS] Crypto connection closed");
          connected = false;
          ws = null;

          // Attempt reconnection
          if (shouldReconnect) {
            reconnectTimeout = setTimeout(() => {
              console.log("[Alpaca WS] Attempting crypto reconnection...");
              connect().catch(console.error);
            }, 5000);
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  };

  const disconnect = () => {
    shouldReconnect = false;
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  };

  const isConnected = () => connected;

  return { connect, disconnect, isConnected };
}
