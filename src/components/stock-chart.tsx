"use client";

import { useEffect, useRef, useMemo } from "react";
import { createChart, ColorType, IChartApi, CandlestickSeries, CandlestickData, Time } from "lightweight-charts";
import { HistoricalPrice } from "@/lib/hooks/use-stock-history";

interface StockChartProps {
  data: HistoricalPrice[];
}

/**
 * Remove time gaps (weekends, holidays, overnight) from intraday data
 * by mapping to evenly-spaced timestamps. Keeps a lookup for real time labels.
 */
function removeTimeGaps(data: HistoricalPrice[]): {
  chartData: CandlestickData<Time>[];
  timeMap: Map<number, number>; // fake timestamp → real timestamp
  isIntraday: boolean;
} {
  const timeMap = new Map<number, number>();
  
  // Check if data is intraday (unix timestamps) or daily (YYYY-MM-DD)
  const isIntraday = data.length > 0 && /^\d+$/.test(data[0].time);
  
  if (!isIntraday) {
    // Daily data - YYYY-MM-DD already handles gaps naturally in lightweight-charts
    const chartData: CandlestickData<Time>[] = data.map((d) => ({
      time: d.time as unknown as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    return { chartData, timeMap, isIntraday };
  }
  
  // Intraday: detect interval from data and create evenly-spaced timestamps
  const realTimestamps = data.map(d => parseInt(d.time, 10));
  
  // Find the most common interval between consecutive candles (ignoring gaps)
  const diffs: number[] = [];
  for (let i = 1; i < realTimestamps.length; i++) {
    const diff = realTimestamps[i] - realTimestamps[i - 1];
    // Only consider diffs under 2 hours (skip overnight/weekend gaps)
    if (diff < 7200) {
      diffs.push(diff);
    }
  }
  const interval = diffs.length > 0 
    ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)] // median
    : 3600; // default 1h
  
  // Create evenly-spaced fake timestamps starting from the first real one
  const baseTime = realTimestamps[0];
  const chartData: CandlestickData<Time>[] = data.map((d, i) => {
    const fakeTimestamp = baseTime + i * interval;
    const realTimestamp = parseInt(d.time, 10);
    timeMap.set(fakeTimestamp, realTimestamp);
    return {
      time: fakeTimestamp as unknown as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    };
  });
  
  return { chartData, timeMap, isIntraday };
}

export function StockChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Pre-process data to remove gaps
  const { chartData, timeMap, isIntraday } = useMemo(() => removeTimeGaps(data), [data]);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return;

    // Responsive height: smaller on mobile
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 280 : 400;

    // Create chart with custom time formatter for gap-free intraday data
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      rightPriceScale: {
        borderColor: "#374151",
      },
      timeScale: {
        borderColor: "#374151",
        timeVisible: isIntraday,
        // For gap-free intraday, use custom tick formatter to show real times
        ...(isIntraday && timeMap.size > 0 ? {
          tickMarkFormatter: (time: number) => {
            const realTime = timeMap.get(time) || time;
            const date = new Date(realTime * 1000);
            const hours = date.getHours();
            const minutes = date.getMinutes();
            // Show date at market open, time otherwise
            if (hours === 9 && minutes <= 30 || hours === 14 && minutes >= 30) {
              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }
            return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
          },
        } : {}),
      },
      crosshair: {
        mode: 1,
      },
      // Custom time formatter for crosshair tooltip
      localization: isIntraday && timeMap.size > 0 ? {
        timeFormatter: (time: number) => {
          const realTime = timeMap.get(time) || time;
          const date = new Date(realTime * 1000);
          return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
        },
      } : undefined,
    });

    chartRef.current = chart;

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    candlestickSeries.setData(chartData);

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        const isMobile = window.innerWidth < 768;
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobile ? 280 : 400,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [chartData, timeMap, isIntraday]);

  return <div ref={chartContainerRef} className="w-full" />;
}
