"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePrices } from "@/lib/hooks/use-prices";
import { useFilters } from "@/lib/hooks/use-filters";

// Asset categorization - same as Streamlit
const YIELDING_ASSETS = ["ETH", "SOL", "BNB", "TAO", "LINK", "TRX", "SUI", "AVAX", "ADA", "HBAR"];
const NON_YIELDING_ASSETS = ["BTC", "HYPE", "XRP", "ZEC", "LTC", "DOGE"];

// Crypto icon URLs from CoinGecko
const CRYPTO_ICONS: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  SUI: "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg",
  HBAR: "https://assets.coingecko.com/coins/images/3688/small/hbar.png",
  TAO: "https://assets.coingecko.com/coins/images/28452/small/ARUsPeNQ_400x400.jpeg",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
  TRX: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  ZEC: "https://assets.coingecko.com/coins/images/486/small/circle-zcash-color.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  HYPE: "https://coin-images.coingecko.com/coins/images/50882/small/hyperliquid.jpg",
};

// Network staking APYs for display
const STAKING_APYS: Record<string, number> = {
  ETH: 0.03,
  SOL: 0.07,
  BNB: 0.02,
  TAO: 0.10,
  LINK: 0.05,
  TRX: 0.045,
  SUI: 0.022,
  AVAX: 0.08,
  ADA: 0.045,
  HBAR: 0.065,
};

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: prices } = usePrices();
  const { assets: filteredAssets } = useFilters();

  // Determine current asset from path
  const currentAsset = pathname.startsWith("/asset/")
    ? pathname.split("/")[2]?.toUpperCase()
    : null;

  const isOverview = pathname === "/";

  // Get price data for display
  const getAssetPrice = (asset: string) => prices?.crypto[asset]?.price || 0;
  const getAssetChange = (asset: string) => prices?.crypto[asset]?.change24h;

  // Determine which assets to show in market data
  // Priority: 1) Current asset page, 2) Filtered assets, 3) Default ETH/BTC
  const marketDataAssets = currentAsset
    ? [currentAsset.toUpperCase()]
    : filteredAssets.length > 0
    ? filteredAssets.slice(0, 4) // Max 4 assets
    : ["ETH", "BTC"];

  return (
    <aside className={cn("w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen", className)}>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <Link href="/" className="block">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">DAT Tracker</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Digital Asset Treasury Dashboard</p>
          </Link>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Overview Button */}
        <Link
          href="/"
          className={cn(
            "block w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isOverview
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          Overview
        </Link>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Yielding Assets */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Yielding Assets
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Native staking yield benchmark
          </p>
          <div className="space-y-1">
            {YIELDING_ASSETS.map((asset) => {
              const isActive = currentAsset === asset.toLowerCase() || currentAsset === asset;
              return (
                <Link
                  key={asset}
                  href={`/asset/${asset.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {CRYPTO_ICONS[asset] && (
                    <img src={CRYPTO_ICONS[asset]} alt={asset} className="w-5 h-5 rounded-full" />
                  )}
                  <span>{asset}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Non-Yielding Assets */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Non-Yielding Assets
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Vol harvesting + speculation
          </p>
          <div className="space-y-1">
            {NON_YIELDING_ASSETS.map((asset) => {
              const isActive = currentAsset === asset.toLowerCase() || currentAsset === asset;
              return (
                <Link
                  key={asset}
                  href={`/asset/${asset.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  {CRYPTO_ICONS[asset] && (
                    <img src={CRYPTO_ICONS[asset]} alt={asset} className="w-5 h-5 rounded-full" />
                  )}
                  <span>{asset}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Market Data Section - Contextual based on filters */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {filteredAssets.length > 0 ? "Filtered Assets" : "Market Data"}
          </h3>
          {filteredAssets.length > 0 && (
            <p className="text-[10px] text-gray-400 mb-2">
              Showing prices for your filter selection
            </p>
          )}

          <div className="space-y-1.5">
            {marketDataAssets.map((asset) => (
              <div key={asset} className="bg-white dark:bg-gray-800 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {CRYPTO_ICONS[asset] && (
                      <img src={CRYPTO_ICONS[asset]} alt={asset} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {asset}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      ${getAssetPrice(asset).toLocaleString(undefined, {
                        maximumFractionDigits: getAssetPrice(asset) > 100 ? 0 : 2
                      })}
                    </p>
                    {getAssetChange(asset) !== undefined && (
                      <p className={cn(
                        "text-[10px] font-medium",
                        (getAssetChange(asset) || 0) >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {(getAssetChange(asset) || 0) >= 0 ? "+" : ""}
                        {getAssetChange(asset)?.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
                {STAKING_APYS[asset] && marketDataAssets.length === 1 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Staking: {(STAKING_APYS[asset] * 100).toFixed(1)}% APY
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        {/* Data Sources */}
        <div className="text-xs text-gray-400 dark:text-gray-500">
          <p>Data: CoinGecko, FMP, Yahoo</p>
        </div>
      </div>
    </aside>
  );
}

export { CRYPTO_ICONS, YIELDING_ASSETS, NON_YIELDING_ASSETS, STAKING_APYS };
