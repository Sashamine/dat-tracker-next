"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, CandlestickSeries, CandlestickData, Time } from "lightweight-charts";
import { HistoricalPrice } from "@/lib/hooks/use-stock-history";

interface StockChartProps {
  data: HistoricalPrice[];
}

export function StockChart({ data }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Responsive height: smaller on mobile
    const isMobile = window.innerWidth < 768;
    const chartHeight = isMobile ? 280 : 400;

    // Create chart
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
        timeVisible: true,
      },
      crosshair: {
        mode: 1,
      },
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

    // Format data for lightweight-charts
    // time can be YYYY-MM-DD (daily) or Unix timestamp string (intraday)
    const chartData: CandlestickData<Time>[] = data.map((d) => {
      // If time is all digits, it's a Unix timestamp - convert to number
      const isUnixTimestamp = /^\d+$/.test(d.time);
      return {
        time: (isUnixTimestamp ? parseInt(d.time, 10) : d.time) as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      };
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
  }, [data]);

  return <div ref={chartContainerRef} className="w-full" />;
}
