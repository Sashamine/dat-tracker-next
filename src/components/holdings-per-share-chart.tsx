"use client";

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { createChart, ColorType, IChartApi, LineSeries, Time, ISeriesApi, SeriesMarker, createSeriesMarkers, ISeriesMarkersPluginApi } from "lightweight-charts";
import { cn } from "@/lib/utils";
import { getHoldingsHistory, calculateHoldingsGrowth, getAcquisitionEvents } from "@/lib/data/holdings-history";
import { MSTR_BTC_TIMELINE } from "@/lib/data/mstr-btc-timeline";

type TimeRange = "3mo" | "6mo" | "1y" | "all";

interface AcquisitionInfo {
  date: string;
  total: number;
  sourceUrl?: string;
  source?: string;
}

interface HoldingsPerShareChartProps {
  ticker: string;
  asset: string;
  currentHoldingsPerShare: number | null;
  className?: string;
}

export function HoldingsPerShareChart({
  ticker,
  asset,
  currentHoldingsPerShare,
  className,
}: HoldingsPerShareChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [showAcquisitions, setShowAcquisitions] = useState(false);
  const [hoveredAcquisition, setHoveredAcquisition] = useState<AcquisitionInfo | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  const historyData = useMemo(() => getHoldingsHistory(ticker), [ticker]);
  const isMstr = ticker.toUpperCase() === "MSTR";
  
  // Filter history based on time range, extending if insufficient data
  const { filteredHistory, rangeExtended } = useMemo(() => {
    if (!historyData) return { filteredHistory: null, rangeExtended: false, actualStartDate: null };
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case "3mo":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6mo":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        return { filteredHistory: historyData.history, rangeExtended: false, actualStartDate: null };
    }
    
    const filtered = historyData.history.filter(snapshot => new Date(snapshot.date) >= startDate);
    
    // If less than 2 data points in range, extend to include most recent available data
    if (filtered.length < 2 && historyData.history.length >= 2) {
      const minPoints = Math.min(historyData.history.length, Math.max(2, filtered.length + 2));
      const extended = historyData.history.slice(-minPoints);
      const extendedStartDate = new Date(extended[0].date);
      return { 
        filteredHistory: extended, 
        rangeExtended: true, 
        actualStartDate: extendedStartDate 
      };
    }
    
    return { filteredHistory: filtered, rangeExtended: false, actualStartDate: null };
  }, [historyData, timeRange]);

  const growthMetrics = useMemo(
    () => (filteredHistory && filteredHistory.length >= 2 ? calculateHoldingsGrowth(filteredHistory) : null),
    [filteredHistory]
  );

  // Get acquisition events for this company
  const companyAcquisitions = useMemo(() => {
    if (isMstr) return [];
    return getAcquisitionEvents(ticker);
  }, [ticker, isMstr]);

  // Filter and aggregate acquisition events for the current time range
  const { acquisitionMarkers, acquisitionData } = useMemo(() => {
    if (!showAcquisitions) return { acquisitionMarkers: [], acquisitionData: new Map<string, AcquisitionInfo>() };
    
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case "3mo":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6mo":
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
      default:
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    // Aggregate purchases within 7 days to reduce marker overlap
    const AGGREGATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
    const aggregatedEvents: AcquisitionInfo[] = [];
    
    const rawEvents: { date: string; amount: number; sourceUrl?: string; source?: string }[] = [];
    
    if (isMstr) {
      // MSTR uses dedicated timeline - construct SEC URL from filing accession
      for (const event of MSTR_BTC_TIMELINE) {
        const eventDate = new Date(event.date);
        if (eventDate >= startDate && event.btcAcquired >= 1000) {
          // Construct SEC EDGAR URL from accession number
          const sourceUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=&owner=include&count=40`;
          rawEvents.push({ 
            date: event.date, 
            amount: event.btcAcquired,
            sourceUrl,
            source: `8-K Filing (${event.filingAccession})`,
          });
        }
      }
    } else {
      // Other companies use derived acquisition events
      for (const event of companyAcquisitions) {
        const eventDate = new Date(event.date);
        if (eventDate >= startDate) {
          rawEvents.push({ 
            date: event.date, 
            amount: event.acquired,
            sourceUrl: event.sourceUrl,
            source: event.source,
          });
        }
      }
    }
    
    // Sort by date and aggregate nearby events
    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const event of rawEvents) {
      const eventTime = new Date(event.date).getTime();
      const lastAggregated = aggregatedEvents[aggregatedEvents.length - 1];
      
      if (lastAggregated && eventTime - new Date(lastAggregated.date).getTime() < AGGREGATION_WINDOW_MS) {
        // Aggregate with previous event (keep first sourceUrl)
        lastAggregated.total += event.amount;
      } else {
        // Start new aggregation window
        aggregatedEvents.push({ 
          date: event.date, 
          total: event.amount,
          sourceUrl: event.sourceUrl,
          source: event.source,
        });
      }
    }
    
    // Create map for quick lookup by date
    const dataMap = new Map<string, AcquisitionInfo>();
    for (const event of aggregatedEvents) {
      dataMap.set(event.date, event);
    }
    
    // Create subtle dot markers
    const markers: SeriesMarker<Time>[] = [];
    for (const event of aggregatedEvents) {
      markers.push({
        time: event.date as Time,
        position: "belowBar",
        color: "#f59e0b",
        shape: "circle",
        size: 0.5,
      });
    }
    
    return { acquisitionMarkers: markers, acquisitionData: dataMap };
  }, [isMstr, showAcquisitions, timeRange, companyAcquisitions]);

  // Check if company has acquisition data
  const hasAcquisitionData = isMstr || companyAcquisitions.length > 0;

  // Handle crosshair move for acquisition tooltips
  const handleCrosshairMove = useCallback((param: { time?: Time; point?: { x: number; y: number } }) => {
    if (!showAcquisitions || !param.time || !param.point || acquisitionData.size === 0) {
      setHoveredAcquisition(null);
      setTooltipPosition(null);
      return;
    }
    
    // Parse crosshair time - could be string (YYYY-MM-DD) or number (unix timestamp)
    let crosshairTime: number;
    if (typeof param.time === 'string') {
      crosshairTime = new Date(param.time).getTime();
    } else if (typeof param.time === 'number') {
      // Unix timestamp in seconds
      crosshairTime = param.time * 1000;
    } else {
      setHoveredAcquisition(null);
      setTooltipPosition(null);
      return;
    }
    
    // Check if we're near an acquisition date (within 5 days for better hit detection)
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    
    let nearestAcquisition: AcquisitionInfo | null = null;
    let minDistance = Infinity;
    
    for (const [dateStr, info] of acquisitionData) {
      const acquisitionTime = new Date(dateStr).getTime();
      const distance = Math.abs(crosshairTime - acquisitionTime);
      if (distance < FIVE_DAYS_MS && distance < minDistance) {
        minDistance = distance;
        nearestAcquisition = info;
      }
    }
    
    if (nearestAcquisition) {
      setHoveredAcquisition(nearestAcquisition);
      setTooltipPosition({ x: param.point.x, y: param.point.y });
    } else {
      setHoveredAcquisition(null);
      setTooltipPosition(null);
    }
  }, [showAcquisitions, acquisitionData]);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current || !filteredHistory || filteredHistory.length < 2) return;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isMobile = window.innerWidth < 768;
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
      height: isMobile ? 200 : 250,
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

    chartRef.current = chart;

    // Holdings per share line
    const series = chart.addSeries(LineSeries, {
      color: "#22c55e",
      lineWidth: 2,
      title: `${asset}/Share`,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price >= 0.01) return price.toFixed(4);
          if (price >= 0.0001) return price.toFixed(6);
          return price.toFixed(8);
        },
      },
    });

    seriesRef.current = series;

    // Format data for chart
    const chartData = filteredHistory.map((snapshot) => ({
      time: snapshot.date as Time,
      value: snapshot.holdingsPerShare,
    }));

    series.setData(chartData);

    // Add acquisition markers
    if (acquisitionMarkers.length > 0) {
      const markers = createSeriesMarkers(series, acquisitionMarkers);
      markersRef.current = markers;
    }

    // Subscribe to crosshair move for tooltips
    chart.subscribeCrosshairMove(handleCrosshairMove);

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const isMobileNow = window.innerWidth < 768;
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: isMobileNow ? 200 : 250,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [filteredHistory, asset, acquisitionMarkers, handleCrosshairMove]);

  // If no historical data, show current value only
  if (!historyData || historyData.history.length < 2) {
    return (
      <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {asset} Per Share
            </h3>
            <p className="text-sm text-gray-500">
              Historical data not yet available for {ticker}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">
              {currentHoldingsPerShare
                ? currentHoldingsPerShare >= 0.01
                  ? currentHoldingsPerShare.toFixed(4)
                  : currentHoldingsPerShare >= 0.0001
                  ? currentHoldingsPerShare.toFixed(6)
                  : currentHoldingsPerShare.toFixed(8)
                : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          We&apos;re collecting {asset}/share data over time. Check back later for growth trends.
        </p>
      </div>
    );
  }

  const firstSnapshot = filteredHistory && filteredHistory.length > 0 ? filteredHistory[0] : historyData.history[0];
  const lastSnapshot = filteredHistory && filteredHistory.length > 0 ? filteredHistory[filteredHistory.length - 1] : historyData.history[historyData.history.length - 1];

  // Format acquisition amount for tooltip
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `+${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `+${(amount / 1000).toFixed(0)}K`;
    return `+${amount.toFixed(0)}`;
  };

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {asset} Per Share Growth
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(firstSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {" → "}
            {new Date(lastSnapshot.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {rangeExtended && (
              <span className="ml-2 text-amber-600 dark:text-amber-400" title="Range extended to show available data">
                (extended - latest data from {new Date(lastSnapshot.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Acquisitions Toggle */}
          {hasAcquisitionData && (
            <button
              onClick={() => setShowAcquisitions(!showAcquisitions)}
              className={cn(
                "text-xs px-2 py-1 rounded border transition-colors",
                showAcquisitions
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500"
              )}
            >
              {showAcquisitions ? "● Acquisitions ON" : "○ Acquisitions OFF"}
            </button>
          )}
          {/* Time Range Buttons */}
          <div className="flex gap-1">
            {([
              { value: "3mo", label: "3M" },
              { value: "6mo", label: "6M" },
              { value: "1y", label: "1Y" },
              { value: "all", label: "ALL" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  timeRange === value
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 sm:gap-6 mb-4">
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total {asset}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {lastSnapshot.holdings >= 1000 
              ? lastSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : lastSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400">
            from {firstSnapshot.holdings >= 1000 
              ? firstSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : firstSnapshot.holdings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{asset}/Share</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {lastSnapshot.holdingsPerShare >= 0.01
              ? lastSnapshot.holdingsPerShare.toFixed(4)
              : lastSnapshot.holdingsPerShare >= 0.0001
              ? lastSnapshot.holdingsPerShare.toFixed(6)
              : lastSnapshot.holdingsPerShare.toFixed(8)}
          </p>
          <p className="text-xs text-gray-400">
            from {firstSnapshot.holdingsPerShare >= 0.01
              ? firstSnapshot.holdingsPerShare.toFixed(4)
              : firstSnapshot.holdingsPerShare >= 0.0001
              ? firstSnapshot.holdingsPerShare.toFixed(6)
              : firstSnapshot.holdingsPerShare.toFixed(8)}
          </p>
        </div>
        {growthMetrics && (
          <>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Period Growth</p>
              <p className={cn(
                "text-xl font-bold",
                growthMetrics.totalGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {growthMetrics.totalGrowth >= 0 ? "+" : ""}{growthMetrics.totalGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">
                {filteredHistory ? filteredHistory.length : 0} data points
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">CAGR</p>
              <p className={cn(
                "text-xl font-bold",
                growthMetrics.annualizedGrowth >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {growthMetrics.annualizedGrowth >= 0 ? "+" : ""}{growthMetrics.annualizedGrowth.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">annualized</p>
            </div>
          </>
        )}
      </div>

      {filteredHistory && filteredHistory.length >= 2 ? (
        <div className="relative">
          <div ref={chartContainerRef} className="w-full" />
          
          {/* Acquisition Tooltip */}
          {hoveredAcquisition && tooltipPosition && (
            <div
              className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 text-xs pointer-events-auto"
              style={{
                left: Math.min(tooltipPosition.x, (chartContainerRef.current?.clientWidth || 300) - 150),
                top: Math.max(tooltipPosition.y - 60, 0),
              }}
            >
              <div className="font-semibold text-amber-600 dark:text-amber-400">
                {formatAmount(hoveredAcquisition.total)} {asset}
              </div>
              <div className="text-gray-500">
                {new Date(hoveredAcquisition.date).toLocaleDateString("en-US", { 
                  month: "short", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </div>
              {hoveredAcquisition.sourceUrl && (
                <a
                  href={hoveredAcquisition.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline block mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  View source →
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-gray-500">
          Not enough data points for selected time range
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        {ticker === "3350.T" ? (
          <p className="text-amber-600 dark:text-amber-400">
            ⚠️ Source: Company disclosures (metaplanet.jp) — not regulatory-verified. All data split-adjusted.
          </p>
        ) : ticker.includes(".") ? (
          <p>
            Source: Company disclosures and local exchange filings.
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        ) : (
          <p>
            Source: SEC 10-Q/10-K filings and 8-K announcements.
            {" "}{asset}/share = Total {asset} Holdings ÷ Diluted Shares Outstanding
          </p>
        )}
      </div>
    </div>
  );
}
