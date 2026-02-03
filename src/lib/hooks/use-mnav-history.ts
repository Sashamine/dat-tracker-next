"use client";

import { useQuery } from "@tanstack/react-query";
import { TimeRange, ChartInterval, DEFAULT_INTERVAL } from "./use-stock-history";
import { MSTR_DAILY_MNAV, type DailyMnavSnapshot } from "@/lib/data/mstr-daily-mnav";
import { getEffectiveSharesAt } from "@/lib/data/dilutive-instruments";
import { getHistoricalHoldings } from "@/lib/data/company-holdings-history";
import { getHoldingsHistory, getHoldingsAtDate } from "@/lib/data/holdings-history";

interface MnavDataPoint {
  time: string; // Unix timestamp (seconds) for intraday, YYYY-MM-DD for daily
  mnav: number;
  btcPrice: number;
  stockPrice: number;
  // Optional detailed data (only for daily pre-calculated)
  btcHoldings?: number;
  dilutedShares?: number;
  totalDebt?: number;
  btcPerShare?: number;
}

// Company data needed for mNAV calculation (from companies.ts / merged data)
export interface MnavCompanyData {
  holdings: number;           // Crypto holdings
  sharesForMnav: number;      // Basic shares outstanding
  totalDebt: number;          // Total debt in USD
  preferredEquity: number;    // Preferred equity in USD
  cashReserves: number;       // Cash in USD
  restrictedCash: number;     // Restricted cash in USD
  asset?: string;             // Asset type (BTC, ETH, SOL, etc.) - defaults to BTC
}

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

interface StockHistoryPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Align intraday timestamps to nearest interval
function alignTimestamps(
  btcData: CryptoHistoryPoint[],
  stockData: StockHistoryPoint[],
  intervalMs: number
): { time: string; btcPrice: number; stockPrice: number }[] {
  const result: { time: string; btcPrice: number; stockPrice: number }[] = [];

  // Create a map of stock prices by aligned timestamp
  const stockByTime = new Map<number, number>();
  for (const point of stockData) {
    const ts = parseInt(point.time) * 1000;
    const aligned = Math.floor(ts / intervalMs) * intervalMs;
    stockByTime.set(aligned, point.close);
  }

  // For each BTC price point, find matching stock price
  for (const btc of btcData) {
    const ts = parseInt(btc.time) * 1000;
    const aligned = Math.floor(ts / intervalMs) * intervalMs;

    // Find closest stock price (within interval)
    let stockPrice = stockByTime.get(aligned);
    if (!stockPrice) {
      // Try adjacent intervals
      stockPrice = stockByTime.get(aligned - intervalMs) || stockByTime.get(aligned + intervalMs);
    }

    if (stockPrice) {
      result.push({
        time: btc.time,
        btcPrice: btc.price,
        stockPrice,
      });
    }
  }

  return result;
}

// Calculate mNAV from prices using company data (same source as website)
function calculateIntradayMnav(
  btcPrice: number,
  stockPrice: number,
  company: MnavCompanyData,
  date: string
): number {
  // Get diluted shares based on current stock price
  // This includes ITM convertibles/warrants and returns adjustment values
  const effectiveShares = getEffectiveSharesAt(
    "MSTR",
    company.sharesForMnav,
    stockPrice,
    date
  );

  // Subtract ITM convertible face values from debt to avoid double-counting
  // ITM converts are counted as equity (in diluted shares), so remove from debt
  const adjustedDebt = Math.max(0, company.totalDebt - effectiveShares.inTheMoneyDebtValue);

  // Add ITM warrant exercise proceeds to both cash and restricted cash (symmetric treatment)
  // If we count warrant dilution, we should also count the incoming cash
  // Adding to both keeps freeCash unchanged while adding proceeds to NAV
  const adjustedCashReserves = company.cashReserves + effectiveShares.inTheMoneyWarrantProceeds;
  const adjustedRestrictedCash = company.restrictedCash + effectiveShares.inTheMoneyWarrantProceeds;

  // Free cash = cash - restricted cash (unchanged by warrant proceeds)
  const freeCash = adjustedCashReserves - adjustedRestrictedCash;

  const marketCap = effectiveShares.diluted * stockPrice;
  const enterpriseValue =
    marketCap + adjustedDebt + company.preferredEquity - freeCash;
  // CryptoNav includes restricted cash (which now includes warrant proceeds)
  const cryptoNav = company.holdings * btcPrice + adjustedRestrictedCash;

  return cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;
}

// Optimal intervals for each time range to maximize granularity
// These match what CoinGecko and Yahoo Finance provide
const OPTIMAL_INTERVALS: Record<TimeRange, ChartInterval> = {
  "1d": "5m",   // 5-minute data for both
  "7d": "1h",   // Hourly data for both
  "1mo": "1h",  // Hourly data for both (Yahoo supports 1h for 1mo)
  "1y": "1d",   // Daily data
  "all": "1d",  // Daily data
};

// Fetch intraday mNAV data
async function fetchIntradayMnav(
  range: TimeRange,
  interval: ChartInterval,
  company: MnavCompanyData
): Promise<MnavDataPoint[]> {
  // Use optimal interval for maximum granularity matching
  const optimalInterval = OPTIMAL_INTERVALS[range] || interval;

  // Fetch BTC and MSTR prices in parallel
  const [btcRes, stockRes] = await Promise.all([
    fetch(`/api/crypto/BTC/history?range=${range}`),
    fetch(`/api/stocks/MSTR/history?range=${range}&interval=${optimalInterval}`),
  ]);

  if (!btcRes.ok || !stockRes.ok) {
    throw new Error("Failed to fetch price data");
  }

  const btcData: CryptoHistoryPoint[] = await btcRes.json();
  const stockData: StockHistoryPoint[] = await stockRes.json();

  if (btcData.length === 0 || stockData.length === 0) {
    return [];
  }

  // Interval in milliseconds for alignment (use optimal interval)
  const intervalMs =
    optimalInterval === "5m" ? 5 * 60 * 1000 :
    optimalInterval === "15m" ? 15 * 60 * 1000 :
    optimalInterval === "1h" ? 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;

  // Align timestamps and pair prices
  const aligned = alignTimestamps(btcData, stockData, intervalMs);

  // Calculate mNAV for each point using company data (same as website)
  const today = new Date().toISOString().split("T")[0];
  return aligned.map(({ time, btcPrice, stockPrice }) => ({
    time,
    btcPrice,
    stockPrice,
    mnav: calculateIntradayMnav(btcPrice, stockPrice, company, today),
  }));
}

// Fetch intraday mNAV for non-MSTR companies (simpler calculation)
async function fetchCompanyIntradayMnav(
  ticker: string,
  range: TimeRange,
  company: MnavCompanyData
): Promise<MnavDataPoint[]> {
  const asset = company.asset || "BTC";
  const optimalInterval = OPTIMAL_INTERVALS[range] || "1h";

  // Fetch crypto and stock prices in parallel
  const [cryptoRes, stockRes] = await Promise.all([
    fetch(`/api/crypto/${asset}/history?range=${range}`),
    fetch(`/api/stocks/${ticker}/history?range=${range}&interval=${optimalInterval}`),
  ]);

  if (!cryptoRes.ok || !stockRes.ok) {
    console.warn(`[mnavHistory] Failed to fetch intraday data for ${ticker}`);
    return [];
  }

  const cryptoData: CryptoHistoryPoint[] = await cryptoRes.json();
  const stockData: StockHistoryPoint[] = await stockRes.json();

  if (cryptoData.length === 0 || stockData.length === 0) {
    return [];
  }

  // Interval in milliseconds for alignment
  const intervalMs =
    optimalInterval === "5m" ? 5 * 60 * 1000 :
    optimalInterval === "15m" ? 15 * 60 * 1000 :
    optimalInterval === "1h" ? 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;

  // Align timestamps and pair prices
  const aligned = alignTimestamps(cryptoData, stockData, intervalMs);

  // Calculate mNAV using simple formula (no dilution adjustments)
  return aligned.map(({ time, btcPrice: cryptoPrice, stockPrice }) => {
    const marketCap = stockPrice * company.sharesForMnav;
    const enterpriseValue = marketCap + (company.totalDebt || 0) - (company.cashReserves || 0);
    const cryptoNav = company.holdings * cryptoPrice;
    const mnav = cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;

    return {
      time,
      btcPrice: cryptoPrice,
      stockPrice,
      mnav,
    };
  });
}

// Get daily mNAV from pre-calculated data
function getDailyMnav(range: TimeRange): MnavDataPoint[] {
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = new Date("2020-01-01");
      break;
    default:
      startDate = new Date("2020-01-01");
  }

  return MSTR_DAILY_MNAV
    .filter((s) => new Date(s.date) >= startDate)
    .map((s) => ({
      time: s.date,
      mnav: s.mnav,
      btcPrice: s.btcPrice,
      stockPrice: s.stockPrice,
      btcHoldings: s.btcHoldings,
      dilutedShares: s.dilutedShares,
      totalDebt: s.totalDebt,
      btcPerShare: s.btcPerShare,
    }));
}

// Calculate daily mNAV for companies with holdings history
async function getCompanyDailyMnav(
  ticker: string,
  range: TimeRange,
  companyData: MnavCompanyData
): Promise<MnavDataPoint[]> {
  // Determine date range for filtering
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "1d":
      startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "1mo":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = new Date("2020-01-01"); // Show full history for all companies
      break;
    default:
      startDate = new Date("2020-01-01");
  }

  // Always fetch 1y data to ensure we get YYYY-MM-DD format (not timestamps)
  // Then filter to requested range
  const asset = companyData.asset || "BTC";
  // Use max available data for "all" range, otherwise 1y
  const fetchRange = range === "all" ? "5y" : "1y";
  const [cryptoRes, stockRes] = await Promise.all([
    fetch(`/api/crypto/${asset}/history?range=${fetchRange}&interval=1d`),
    fetch(`/api/stocks/${ticker}/history?range=${fetchRange}&interval=1d`),
  ]);

  if (!cryptoRes.ok || !stockRes.ok) {
    console.warn(`[mnavHistory] Failed to fetch history for ${ticker} (asset: ${asset})`);
    return [];
  }

  const cryptoData: CryptoHistoryPoint[] = await cryptoRes.json();
  const stockData: StockHistoryPoint[] = await stockRes.json();

  if (!cryptoData.length || !stockData.length) {
    return [];
  }

  // Build a map of stock prices by date
  const stockPriceMap = new Map<string, number>();
  for (const point of stockData) {
    stockPriceMap.set(point.time, point.close);
  }

  // Calculate mNAV for each crypto data point
  const result: MnavDataPoint[] = [];
  const startDateStr = startDate.toISOString().split("T")[0];
  
  for (const cryptoPoint of cryptoData) {
    const date = cryptoPoint.time;
    
    // Filter to requested date range
    if (date < startDateStr) continue;
    
    const cryptoPrice = cryptoPoint.price;
    const stockPrice = stockPriceMap.get(date);
    
    if (!stockPrice) continue;
    
    // Get historical holdings for this date
    // Try dedicated lookup function first, then general holdings history, then fall back to current
    const holdings = getHistoricalHoldings(ticker, date) 
      ?? getHoldingsAtDate(ticker, date) 
      ?? companyData.holdings;
    
    // Calculate market cap and mNAV
    const marketCap = stockPrice * companyData.sharesForMnav;
    const cryptoNav = holdings * cryptoPrice;
    const enterpriseValue = marketCap + (companyData.totalDebt || 0) - (companyData.cashReserves || 0);
    const mnav = cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;
    
    result.push({
      time: date,
      mnav,
      btcPrice: cryptoPrice, // Keep field name for compatibility but it's actually crypto price
      stockPrice,
      btcHoldings: holdings, // Keep field name for compatibility
    });
  }

  return result;
}

export function useMnavHistory(
  ticker: string,
  range: TimeRange,
  interval?: ChartInterval,
  companyData?: MnavCompanyData
) {
  const isMstr = ticker.toUpperCase() === "MSTR";
  const hasHistory = !!getHoldingsHistory(ticker);
  const effectiveInterval = interval || DEFAULT_INTERVAL[range];

  // Use intraday calculation for short ranges
  const isShortRange = range === "1d" || range === "7d" || range === "1mo";

  // For intraday, we need company data to calculate mNAV
  const hasCompanyData = !!companyData;

  return useQuery({
    queryKey: ["mnavHistory", ticker, range, effectiveInterval, isShortRange, companyData?.holdings, hasHistory],
    queryFn: async (): Promise<MnavDataPoint[]> => {
      // MSTR has its own optimized path
      if (isMstr) {
        if (isShortRange) {
          if (!companyData) {
            console.warn("useMnavHistory: companyData required for intraday mNAV");
            return [];
          }
          return fetchIntradayMnav(range, effectiveInterval, companyData);
        } else {
          return getDailyMnav(range);
        }
      }

      // For other companies with holdings history
      if (hasHistory && companyData) {
        // Use intraday for short ranges, daily for longer ranges
        if (isShortRange) {
          return fetchCompanyIntradayMnav(ticker, range, companyData);
        } else {
          return getCompanyDailyMnav(ticker, range, companyData);
        }
      }
      
      // No data available
      return [];
    },
    staleTime: isShortRange ? 60 * 1000 : 5 * 60 * 1000, // 1 min for intraday, 5 min for daily
    enabled: (isMstr || (hasHistory && hasCompanyData)),
  });
}

export type { MnavDataPoint };
