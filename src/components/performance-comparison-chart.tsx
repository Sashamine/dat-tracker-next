"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, IChartApi, LineSeries, Time } from "lightweight-charts";
import { cn } from "@/lib/utils";

interface PerformanceComparisonChartProps {
  ticker: string;
  asset: string;
  className?: string;
}

interface StockHistoryPoint {
  time: string;
  close: number;
}

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

async function fetchStockHistory(ticker: string): Promise<StockHistoryPoint[]> {
  const response = await fetch(`/api/stocks/${ticker}/history?range=1y&interval=1d`);
  if (!response.ok) return [];
  return response.json();
}

async function fetchCryptoHistory(symbol: string): Promise<CryptoHistoryPoint[]> {
  const response = await fetch(`/api/crypto/${symbol}/history?range=1y`);
  if (!response.ok) return [];
  return response.json();
}

export function PerformanceComparisonChart({ ticker, asset, className }: PerformanceComparisonChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stockSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cryptoSeriesRef = useRef<any>(null);

  const { data: stockHistory, isLoading: stockLoading } = useQuery({
    queryKey: ["stock-history-perf", ticker],
    queryFn: () => fetchStockHistory(ticker),
  });

  const { data: cryptoHistory, isLoading: cryptoLoading } = useQuery({
    queryKey: ["crypto-history-perf", asset],
    queryFn: () => fetchCryptoHistory(asset),
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(156, 163, 175, 0.1)" },
        horzLines: { color: "rgba(156, 163, 175, 0.1)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: false,
      },
      crosshair: {
        horzLine: { visible: true, labelVisible: true },
        vertLine: { visible: true, labelVisible: true },
      },
    });

    // Stock performance line
    const stockSeries = chart.addSeries(LineSeries, {
      color: "#6366f1", // Indigo for stock
      lineWidth: 2,
      title: ticker,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(1),
      },
    });

    // Crypto performance line
    const cryptoSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b", // Amber for crypto
      lineWidth: 2,
      title: asset,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(1),
      },
    });

    chartRef.current = chart;
    stockSeriesRef.current = stockSeries;
    cryptoSeriesRef.current = cryptoSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [ticker, asset]);

  // Update chart data when both datasets are available
  useEffect(() => {
    if (!stockHistory || !cryptoHistory || !stockSeriesRef.current || !cryptoSeriesRef.current) return;
    if (stockHistory.length === 0 || cryptoHistory.length === 0) return;

    // Create a map of crypto prices by date
    const cryptoByDate = new Map<string, number>();
    for (const point of cryptoHistory) {
      cryptoByDate.set(point.time, point.price);
    }

    // Find overlapping dates and normalize to index 100
    const stockStart = stockHistory[0]?.close;
    if (!stockStart) return;

    // Find first crypto price that matches a stock date
    let cryptoStart: number | null = null;
    for (const point of stockHistory) {
      const cryptoPrice = cryptoByDate.get(point.time);
      if (cryptoPrice) {
        cryptoStart = cryptoPrice;
        break;
      }
    }
    if (!cryptoStart) return;

    // Build indexed data series
    const stockData: { time: Time; value: number }[] = [];
    const cryptoData: { time: Time; value: number }[] = [];

    for (const point of stockHistory) {
      const time = point.time as Time;
      const stockIndexed = (point.close / stockStart) * 100;
      stockData.push({ time, value: stockIndexed });

      const cryptoPrice = cryptoByDate.get(point.time);
      if (cryptoPrice) {
        const cryptoIndexed = (cryptoPrice / cryptoStart) * 100;
        cryptoData.push({ time, value: cryptoIndexed });
      }
    }

    stockSeriesRef.current.setData(stockData);
    cryptoSeriesRef.current.setData(cryptoData);
    chartRef.current?.timeScale().fitContent();
  }, [stockHistory, cryptoHistory]);

  const isLoading = stockLoading || cryptoLoading;

  if (isLoading) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Loading performance data...
        </div>
      </div>
    );
  }

  // Calculate current performance
  const stockPerf = stockHistory && stockHistory.length > 1
    ? ((stockHistory[stockHistory.length - 1].close / stockHistory[0].close) - 1) * 100
    : null;

  const cryptoByDate = new Map<string, number>();
  if (cryptoHistory) {
    for (const point of cryptoHistory) {
      cryptoByDate.set(point.time, point.price);
    }
  }

  let cryptoPerf: number | null = null;
  if (stockHistory && cryptoHistory && stockHistory.length > 0) {
    const firstDate = stockHistory[0].time;
    const lastDate = stockHistory[stockHistory.length - 1].time;
    const firstCrypto = cryptoByDate.get(firstDate);
    const lastCrypto = cryptoByDate.get(lastDate);
    if (firstCrypto && lastCrypto) {
      cryptoPerf = ((lastCrypto / firstCrypto) - 1) * 100;
    }
  }

  const outperformance = stockPerf !== null && cryptoPerf !== null ? stockPerf - cryptoPerf : null;

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Stock vs {asset} Performance (1Y)
          </h3>
          <p className="text-sm text-gray-500">
            Indexed to 100 at start
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{ticker}</p>
            <p className={cn("text-lg font-bold", stockPerf !== null && stockPerf >= 0 ? "text-green-600" : "text-red-600")}>
              {stockPerf !== null ? `${stockPerf >= 0 ? "+" : ""}${stockPerf.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{asset}</p>
            <p className={cn("text-lg font-bold", cryptoPerf !== null && cryptoPerf >= 0 ? "text-green-600" : "text-red-600")}>
              {cryptoPerf !== null ? `${cryptoPerf >= 0 ? "+" : ""}${cryptoPerf.toFixed(1)}%` : "—"}
            </p>
          </div>
          {outperformance !== null && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Alpha</p>
              <p className={cn("text-lg font-bold", outperformance >= 0 ? "text-indigo-600" : "text-red-600")}>
                {outperformance >= 0 ? "+" : ""}{outperformance.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />

      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-indigo-500"></div>
          <span className="text-gray-600 dark:text-gray-400">{ticker} Stock</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-amber-500"></div>
          <span className="text-gray-600 dark:text-gray-400">{asset} Price</span>
        </div>
      </div>
    </div>
  );
}
