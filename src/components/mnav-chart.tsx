"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi, Time, LineSeries } from "lightweight-charts";
import { cn } from "@/lib/utils";

interface MNAVSnapshot {
  timestamp: string;
  date: string;
  median: number;
  average: number;
  min: number;
  max: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
}

interface MNAVHistoryResponse {
  current: MNAVSnapshot | null;
  history: MNAVSnapshot[];
  historyCount: number;
  timestamp: string;
}

async function fetchMNAVHistory(): Promise<MNAVHistoryResponse> {
  const response = await fetch("/api/mnav-history");
  if (!response.ok) throw new Error("Failed to fetch mNAV history");
  return response.json();
}

interface MNAVChartProps {
  className?: string;
}

export function MNAVChart({ className }: MNAVChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const medianSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const averageSeriesRef = useRef<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["mnav-history"],
    queryFn: fetchMNAVHistory,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
        timeVisible: true,
      },
      crosshair: {
        horzLine: {
          visible: true,
          labelVisible: true,
        },
        vertLine: {
          visible: true,
          labelVisible: true,
        },
      },
    });

    // Median line (primary)
    const medianSeries = chart.addSeries(LineSeries, {
      color: "#6366f1", // Indigo
      lineWidth: 2,
      title: "Median",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });

    // Average line (secondary)
    const averageSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b", // Amber
      lineWidth: 2,
      lineStyle: 2, // Dashed
      title: "Average",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => price.toFixed(2) + "x",
      },
    });

    chartRef.current = chart;
    medianSeriesRef.current = medianSeries;
    averageSeriesRef.current = averageSeries;

    // Handle resize
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
  }, []);

  // Update chart data
  useEffect(() => {
    if (!data?.history || !medianSeriesRef.current || !averageSeriesRef.current) return;

    const medianData = data.history.map((snapshot) => ({
      time: Math.floor(new Date(snapshot.timestamp).getTime() / 1000) as Time,
      value: snapshot.median,
    }));

    const averageData = data.history.map((snapshot) => ({
      time: Math.floor(new Date(snapshot.timestamp).getTime() / 1000) as Time,
      value: snapshot.average,
    }));

    medianSeriesRef.current.setData(medianData);
    averageSeriesRef.current.setData(averageData);

    // Fit content
    chartRef.current?.timeScale().fitContent();
  }, [data?.history]);

  if (isLoading) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Loading mNAV history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <div className="h-[300px] flex items-center justify-center text-red-500">
          Error loading mNAV data
        </div>
      </div>
    );
  }

  const hasHistory = data?.history && data.history.length > 1;

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Market mNAV Over Time
          </h2>
          <p className="text-sm text-gray-500">
            Median and average mNAV across all tracked companies
          </p>
        </div>
        {data?.current && (
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Median</p>
              <p className="text-xl font-bold text-indigo-600">
                {data.current.median.toFixed(2)}x
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Average</p>
              <p className="text-xl font-bold text-amber-600">
                {data.current.average.toFixed(2)}x
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Range</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {data.current.min.toFixed(2)}x - {data.current.max.toFixed(2)}x
              </p>
            </div>
          </div>
        )}
      </div>

      {hasHistory ? (
        <>
          <div ref={chartContainerRef} className="w-full" />
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-indigo-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Median mNAV</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-amber-500" style={{ borderTop: "2px dashed #f59e0b" }}></div>
              <span className="text-gray-600 dark:text-gray-400">Average mNAV</span>
            </div>
          </div>
        </>
      ) : (
        <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg font-medium">Collecting mNAV History</p>
          <p className="text-sm mt-2">
            Historical data will appear here as snapshots are collected over time.
          </p>
          <p className="text-xs mt-1 text-gray-400">
            {data?.historyCount || 0} snapshots collected so far
          </p>
        </div>
      )}
    </div>
  );
}

// Current mNAV stats display (without chart)
export function MNAVStats({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["mnav-history"],
    queryFn: fetchMNAVHistory,
    refetchInterval: 60 * 1000, // Every minute
  });

  if (!data?.current) return null;

  return (
    <div className={cn("flex gap-4", className)}>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
        <p className="text-xs text-gray-500">Median mNAV</p>
        <p className="text-lg font-bold text-indigo-600">
          {data.current.median.toFixed(2)}x
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
        <p className="text-xs text-gray-500">Average mNAV</p>
        <p className="text-lg font-bold text-amber-600">
          {data.current.average.toFixed(2)}x
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
        <p className="text-xs text-gray-500">Companies</p>
        <p className="text-lg font-bold text-gray-700 dark:text-gray-300">
          {data.current.count}
        </p>
      </div>
    </div>
  );
}
