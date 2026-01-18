"use client";

import { useState, Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { EarningsCalendar } from "@/components/earnings/earnings-calendar";
import { TreasuryYieldLeaderboard } from "@/components/earnings/treasury-yield-leaderboard";
import { Button } from "@/components/ui/button";
import { Asset, YieldPeriod, CalendarQuarter } from "@/lib/types";

// Asset filter options
const ASSET_OPTIONS: Asset[] = ["BTC", "ETH", "SOL", "HYPE", "TAO", "DOGE", "XRP"];

export default function EarningsPage() {
  const [selectedAsset, setSelectedAsset] = useState<Asset | undefined>(undefined);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod | undefined>("1Y");
  const [selectedQuarter, setSelectedQuarter] = useState<CalendarQuarter | undefined>(undefined);

  const handlePeriodChange = (period: YieldPeriod) => {
    setYieldPeriod(period);
    setSelectedQuarter(undefined);
  };

  const handleQuarterChange = (quarter: CalendarQuarter) => {
    setSelectedQuarter(quarter);
    // Only reset period when actually selecting a quarter
    if (quarter) {
      setYieldPeriod(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <MobileHeader title="Earnings" />

      {/* Left Sidebar - Navigation (Desktop only) */}
      <Suspense fallback={<div className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-gray-50 dark:bg-gray-900" />}>
        <AppSidebar className="hidden lg:block fixed left-0 top-0 h-full overflow-y-auto" />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="px-3 py-4 lg:px-6 lg:py-6 max-w-5xl mx-auto">
          {/* Header - Desktop only */}
          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Treasury Yield Leaderboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Which companies are growing holdings per share the fastest?
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {/* Asset filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedAsset === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAsset(undefined)}
              >
                All
              </Button>
              {ASSET_OPTIONS.map((asset) => (
                <Button
                  key={asset}
                  variant={selectedAsset === asset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset}
                </Button>
              ))}
            </div>
          </div>

          {/* Primary: Treasury Yield Leaderboard */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 lg:p-6">
            <TreasuryYieldLeaderboard
              key={`${yieldPeriod || 'none'}-${selectedQuarter || 'none'}-${selectedAsset || 'all'}`}
              period={yieldPeriod}
              quarter={selectedQuarter}
              asset={selectedAsset}
              onPeriodChange={handlePeriodChange}
              onQuarterChange={handleQuarterChange}
            />
          </div>

          {/* Explanation Section */}
          <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 lg:p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              What is Treasury Yield?
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>
                <strong>Holdings per Share Growth</strong> measures how much crypto each share represents over time.
                A company that grows holdings faster than it dilutes shares will show positive yield.
              </p>
              <p>
                <strong>Example:</strong> If a company held 0.001 BTC/share last quarter and now holds 0.0012 BTC/share,
                that&apos;s a +20% yield - shareholders effectively own 20% more BTC exposure per share.
              </p>
            </div>
          </div>

          {/* Secondary: Earnings Calendar */}
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {showUpcoming ? "Upcoming Earnings" : "Recent Results"}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant={showUpcoming ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUpcoming(true)}
                >
                  Upcoming
                </Button>
                <Button
                  variant={!showUpcoming ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUpcoming(false)}
                >
                  Recent
                </Button>
              </div>
            </div>
            <EarningsCalendar
              days={90}
              asset={selectedAsset}
              upcoming={showUpcoming}
              limit={8}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
