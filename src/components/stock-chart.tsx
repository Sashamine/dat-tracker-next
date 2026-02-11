"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  CandlestickData,
  Time,
} from "lightweight-charts";
import { HistoricalPrice } from "@/lib/hooks/use-stock-history";

type ChartType = "area" | "candle" | "volume";

interface StockChartProps {
  data: HistoricalPrice[];
}

/**
 * Remove time gaps (weekends, holidays, overnight) from intraday data
 * by mapping to evenly-spaced timestamps. Keeps a lookup for real time labels.
 */
function processData(data: HistoricalPrice[]) {
  const timeMap = new Map<number, number>();

  // Check if data is intraday (unix timestamps) or daily (YYYY-MM-DD)
  const isIntraday = data.length > 0 && /^\d+$/.test(data[0].time);

  if (!isIntraday) {
    // Daily data - YYYY-MM-DD handles gaps naturally
    const processed = data.map((d) => ({
      time: d.time as unknown as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      value: d.close,
      volume: d.volume || 0,
    }));
    return { processed, timeMap, isIntraday };
  }

  // Intraday: detect interval and create evenly-spaced timestamps
  const realTimestamps = data.map((d) => parseInt(d.time, 10));

  // Find median interval between consecutive candles (ignoring gaps)
  const diffs: number[] = [];
  for (let i = 1; i < realTimestamps.length; i++) {
    const diff = realTimestamps[i] - realTimestamps[i - 1];
    if (diff < 7200) diffs.push(diff);
  }
  const interval =
    diffs.length > 0
      ? diffs.sort((a, b) => a - b)[Math.floor(diffs.length / 2)]
      : 3600;

  const baseTime = realTimestamps[0];
  const processed = data.map((d, i) => {
    const fakeTimestamp = baseTime + i * interval;
    const realTimestamp = parseInt(d.time, 10);
    timeMap.set(fakeTimestamp, realTimestamp);
    return {
      time: fakeTimestamp as unknown as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      value: d.close,
      volume: d.volume || 0,
    };
  });

  return { processed, timeMap, isIntraday };
}

export function StockChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartType, setChartType] = useState<ChartType>("area");

  const { processed, timeMap, isIntraday } = useMemo(
    () => processData(data),
    [data]
  );

  useEffect(() => {
    if (!chartContainerRef.current || processed.length === 0) return;

    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 280 : 400;

    // Determine if price went up or down overall
    const firstClose = processed[0].close;
    const lastClose = processed[processed.length - 1].close;
    const isPositive = lastClose >= firstClose;
    const lineColor = isPositive ? "#22c55e" : "#ef4444";

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
        ...(isIntraday && timeMap.size > 0
          ? {
              tickMarkFormatter: (time: number) => {
                const realTime = timeMap.get(time) || time;
                const date = new Date(realTime * 1000);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                if (
                  (hours === 9 && minutes <= 30) ||
                  (hours === 14 && minutes >= 30)
                ) {
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }
                return date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
              },
            }
          : {}),
      },
      crosshair: {
        mode: 1,
      },
      localization:
        isIntraday && timeMap.size > 0
          ? {
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
            }
          : undefined,
    });

    chartRef.current = chart;

    if (chartType === "volume") {
      // Full volume chart
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#3b82f6",
        priceFormat: {
          type: "volume",
          precision: 0,
        },
      });
      volumeSeries.setData(
        processed.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? "#22c55e" : "#ef4444",
        }))
      );
    } else if (chartType === "candle") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        wickUpColor: "#22c55e",
      });
      series.setData(
        processed.map((d) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        })) as CandlestickData<Time>[]
      );
    } else {
      // Area chart (line with gradient fill) - like CoinMarketCap
      const series = chart.addSeries(AreaSeries, {
        lineColor: lineColor,
        lineWidth: 2,
        topColor: isPositive
          ? "rgba(34, 197, 94, 0.3)"
          : "rgba(239, 68, 68, 0.3)",
        bottomColor: isPositive
          ? "rgba(34, 197, 94, 0.02)"
          : "rgba(239, 68, 68, 0.02)",
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: lineColor,
        crosshairMarkerBackgroundColor: "#ffffff",
      });
      series.setData(
        processed.map((d) => ({
          time: d.time,
          value: d.close,
        }))
      );
    }

    chart.timeScale().fitContent();

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
  }, [processed, timeMap, isIntraday, chartType]);

  return (
    <div className="relative">
      {/* Chart type toggle - text labels above chart */}
      <div className="flex gap-4 mb-2">
        <button
          onClick={() => setChartType("area")}
          className={`text-sm font-medium transition-colors ${
            chartType === "area" || chartType === "candle"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Price
        </button>
        <button
          onClick={() => setChartType("volume")}
          className={`text-sm font-medium transition-colors ${
            chartType === "volume"
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Volume
        </button>
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}
