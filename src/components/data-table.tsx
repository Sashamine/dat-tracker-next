"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Company } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { getCompanyMNAV, getCompanyMNAVDetailed, calculateTotalCryptoNAV } from "@/lib/math/mnav-engine";
import { dilutiveInstruments, getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { useFilters } from "@/lib/hooks/use-filters";
import { StalenessCompact } from "@/components/staleness-indicator";
import { FlashingPrice, FlashingLargeNumber, FlashingPercent } from "@/components/flashing-price";
import { MNAVTooltip } from "@/components/mnav-tooltip";
import { COMPANY_SOURCES } from "@/lib/data/company-sources";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoldingsBasisBadge } from "@/components/holdings-basis-badge";
import { VerificationBadge, getVerificationStatus } from "@/components/verification-badge";
import { CitationPopover } from "@/components/ui/citation-popover";
import { trackCitationSourceClick } from "@/lib/client-events";
import { getCompanyAhpsMetrics, type AhpsHistoryEntry } from "@/lib/utils/ahps";

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number; isAfterHours?: boolean }>;
  forex?: Record<string, number>;  // Live forex rates (e.g., JPY: 156)
  marketOpen?: boolean;
}

interface YesterdayMnavData {
  [ticker: string]: {
    mnav: number | null;
    stockPrice: number;
    cryptoPrice: number;
    date: string;
  };
}

interface DataTableProps {
  companies: Company[];
  prices?: PriceData;
  yesterdayMnav?: YesterdayMnavData;
}

interface HpsGrowthApiSnapshot {
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
}

interface HpsGrowthApiRow {
  ticker: string;
  currentSnapshot: HpsGrowthApiSnapshot;
  snapshot30d: HpsGrowthApiSnapshot | null;
  snapshot90d: HpsGrowthApiSnapshot | null;
  snapshot1y: HpsGrowthApiSnapshot | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Format large numbers (e.g., 1,234,567 -> 1.23M)
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatGrowthPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getGrowthColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "text-gray-400";
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "text-gray-500";
}




// All logos are stored locally in /public/logos/TICKER.png
// No need for a mapping - just construct the path from ticker

// Asset colors (CMC-style)
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  HYPE: "bg-green-500/10 text-green-600 border-green-500/20",
  BNB: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TAO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  LINK: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  TRX: "bg-red-500/10 text-red-600 border-red-500/20",
  XRP: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  ZEC: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  MULTI: "bg-gradient-to-r from-orange-500/10 via-indigo-500/10 to-purple-500/10 text-pink-600 border-pink-500/20",
  LTC: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  SUI: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  DOGE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  AVAX: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  ADA: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  HBAR: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function DataTable({ companies, prices, yesterdayMnav }: DataTableProps) {
  const router = useRouter();
  const { data: ahpsData } = useSWR<{
    success: boolean;
    results: HpsGrowthApiRow[];
  }>("/api/d1/hps-growth", fetcher, { revalidateOnFocus: false });
  const {
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    assets,
    companyTypes,
    search,
    sortField,
    sortDir,
    setSortField,
    setSortDir,
  } = useFilters();

  const ahpsByTicker = new Map(
    (ahpsData?.results || []).map((row) => [row.ticker.toUpperCase(), row])
  );

  // Calculate metrics for each company
  const companiesWithMetrics = companies.map((company) => {
    const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
    const stockData = prices?.stocks[company.ticker];
    const stockPrice = stockData?.price;
    // Use same market cap that's used for mNAV calculation (shares × price)
    // This ensures tooltip EV matches the actual mNAV calculation
    const marketCapResult = getMarketCapForMnavSync(company, stockData, prices?.forex);
    const marketCap = marketCapResult.marketCap;
    // True 24hr change using yesterday's price (not Yahoo's "from previous close")
    const yesterdayData = yesterdayMnav?.[company.ticker];
    const stockChange = yesterdayData?.stockPrice && stockPrice && yesterdayData.stockPrice > 0
      ? ((stockPrice - yesterdayData.stockPrice) / yesterdayData.stockPrice) * 100
      : stockData?.change24h; // fallback to Yahoo if no yesterday data
    const stockVolume = stockData?.volume || company.avgDailyVolume || 0;
    
    // Calculate crypto NAV including multi-asset support from D1
    const cryptoNavResult = calculateTotalCryptoNAV(company, prices ?? null);
    const holdingsValue = company.pendingMerger ? 0 : cryptoNavResult.totalUsd;
    const cryptoNav = holdingsValue;
    
    const isAfterHours = stockData?.isAfterHours || false;

    // Other assets (cash + investments)
    const cashReserves = company.cashReserves ?? 0;
    const otherInvestments = company.otherInvestments ?? 0;
    const otherAssets = cashReserves + otherInvestments;
    const totalDebt = company.totalDebt ?? 0;
    const ahpsRow = ahpsByTicker.get(company.ticker.toUpperCase());
    const ahpsHistory: AhpsHistoryEntry[] | undefined = ahpsRow
      ? [ahpsRow.snapshot30d, ahpsRow.snapshot90d, ahpsRow.snapshot1y, ahpsRow.currentSnapshot]
          .filter((snapshot): snapshot is HpsGrowthApiSnapshot => Boolean(snapshot))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((snapshot) => ({
            date: snapshot.date,
            holdings: snapshot.holdings,
            sharesOutstanding: snapshot.sharesOutstanding,
            holdingsPerShare: snapshot.holdingsPerShare,
          }))
      : undefined;
    const ahpsCompany = ahpsRow
      ? {
          ...company,
          holdings: ahpsRow.currentSnapshot.holdings,
          sharesForMnav: ahpsRow.currentSnapshot.sharesOutstanding,
          holdingsLastUpdated: ahpsRow.currentSnapshot.date,
        }
      : company;
    const ahpsMetrics = getCompanyAhpsMetrics({
      ticker: company.ticker,
      company: ahpsCompany,
      history: ahpsHistory,
      currentStockPrice: stockPrice,
    });

    // Adjust debt for ITM convertibles (same as mNAV calculation)
    // ITM converts are counted in diluted shares, so subtract their face value from debt
    const adjustedDebt = Math.max(0, totalDebt - (marketCapResult.inTheMoneyDebtValue || 0));

    // Leverage ratio = Net Debt / Crypto NAV (using adjusted debt for consistency with company page)
    const netDebt = Math.max(0, adjustedDebt - cashReserves);
    const leverageRatio = cryptoNav > 0 ? netDebt / cryptoNav : 0;

    // mNAV uses shared calculation for consistency across all pages
    const mnavResult = getCompanyMNAVDetailed(company, prices ?? null);
    const mNAV = mnavResult.mnav;
    const mnavWarnings = mnavResult.warnings;
    
    // Calculate ACTUAL mNAV change using yesterday's measured mNAV
    // Only show when we have a real live stock price (0 = no data, not a real drop)
    let mNAVChange: number | null = null;
    const yesterday = yesterdayMnav?.[company.ticker];
    if (mNAV && stockPrice && stockPrice > 0 && yesterday?.mnav && yesterday.mnav > 0) {
      mNAVChange = ((mNAV / yesterday.mnav) - 1) * 100;
    }

    // Determine company type
    const companyType = company.isMiner ? "Miner" : "Treasury";

    return {
      ...company,
      holdingsValue,
      marketCap,
      stockPrice,
      stockChange,
      stockVolume,
      cryptoPrice,
      mNAV: mNAV || 0,
      mNAVChange,
      mnavWarnings,
      companyType,
      isAfterHours,
      otherAssets,
      leverageRatio,
      currentAhps: ahpsMetrics.currentAhps,
      ahpsGrowth90d: ahpsMetrics.ahpsGrowth90d,
      ahpsMethod: ahpsMetrics.method,
      usesAdjustedShares: ahpsMetrics.usesAdjustedShares,
    };
  });

  // Apply filters
  let filteredCompanies = companiesWithMetrics;

  // Search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filteredCompanies = filteredCompanies.filter(
      (c) =>
        c.ticker.toLowerCase().includes(searchLower) ||
        c.name.toLowerCase().includes(searchLower)
    );
  }

  // Market cap filter (convert to millions for comparison)
  if (minMarketCap > 0 || maxMarketCap < Infinity) {
    filteredCompanies = filteredCompanies.filter((c) => {
      const mcapM = (c.marketCap || 0) / 1_000_000;
      return mcapM >= minMarketCap && mcapM <= (maxMarketCap === Infinity ? Number.MAX_VALUE : maxMarketCap);
    });
  }

  // mNAV filter
  if (minMNAV > 0 || maxMNAV < Infinity) {
    filteredCompanies = filteredCompanies.filter((c) => {
      const mNav = c.mNAV || 0;
      return mNav >= minMNAV && mNav <= (maxMNAV === Infinity ? Number.MAX_VALUE : maxMNAV);
    });
  }

  // Asset filter
  if (assets.length > 0) {
    filteredCompanies = filteredCompanies.filter((c) =>
      assets.includes(c.asset)
    );
  }

  // Company type filter
  if (companyTypes.length > 0) {
    filteredCompanies = filteredCompanies.filter((c) =>
      companyTypes.includes(c.companyType)
    );
  }

  // Check if crypto prices have loaded (at least one company has non-zero holdingsValue)
  const pricesLoaded = filteredCompanies.some(c => c.holdingsValue > 0);

  // Sort companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case "hpsGrowth90d":
        aVal = a.ahpsGrowth90d ?? Number.NEGATIVE_INFINITY;
        bVal = b.ahpsGrowth90d ?? Number.NEGATIVE_INFINITY;
        break;
      case "holdingsValue":
        // When prices haven't loaded, sort by ticker alphabetically for stability
        // This prevents random reordering while waiting for price data
        if (!pricesLoaded) {
          return a.ticker.localeCompare(b.ticker);
        }
        aVal = a.holdingsValue || 0;
        bVal = b.holdingsValue || 0;
        break;
      case "stockPrice":
        aVal = a.stockPrice || 0;
        bVal = b.stockPrice || 0;
        break;
      case "holdings":
        aVal = a.holdings ?? 0;
        bVal = b.holdings ?? 0;
        break;
      case "mNAV":
        aVal = a.mNAV || 0;
        bVal = b.mNAV || 0;
        break;
      case "mNAVChange":
        aVal = a.mNAVChange || 0;
        bVal = b.mNAVChange || 0;
        break;
      case "marketCap":
        aVal = a.marketCap || 0;
        bVal = b.marketCap || 0;
        break;
      case "stockVolume":
        aVal = a.stockVolume || 0;
        bVal = b.stockVolume || 0;
        break;
      case "otherAssets":
        aVal = a.otherAssets || 0;
        bVal = b.otherAssets || 0;
        break;
      case "leverageRatio":
        aVal = a.leverageRatio || 0;
        bVal = b.leverageRatio || 0;
        break;
      case "ticker":
        return sortDir === "desc"
          ? b.ticker.localeCompare(a.ticker)
          : a.ticker.localeCompare(b.ticker);
      default:
        const aField = (a as unknown as Record<string, unknown>)[sortField];
        const bField = (b as unknown as Record<string, unknown>)[sortField];
        aVal = typeof aField === "number" ? aField : Number(aField ?? 0);
        bVal = typeof bField === "number" ? bField : Number(bField ?? 0);
    }

    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Fallback logo component - shows ticker initials
  const FallbackLogo = ({ ticker }: { ticker: string }) => (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
      <span className="text-[10px] font-bold text-white">{ticker.slice(0, 2)}</span>
    </div>
  );

  // Logo component - uses local files from /logos/TICKER.png or .svg
  const CompanyLogo = ({ ticker }: { ticker: string }) => {
    const pngPath = `/logos/${ticker}.png`;
    const svgPath = `/logos/${ticker}.svg`;

    return (
      <div className="relative w-7 h-7">
        <FallbackLogo ticker={ticker} />
        <Image
          src={pngPath}
          alt={ticker}
          width={28}
          height={28}
          className="absolute inset-0 w-7 h-7 rounded-full object-cover"
          onError={(e) => {
            // Try SVG if PNG fails
            const img = e.currentTarget as HTMLImageElement;
            if (img.src.endsWith(".png")) {
              img.src = svgPath;
            } else {
              img.style.display = "none";
            }
          }}
        />
      </div>
    );
  };

  // Mobile card component
  const MobileCard = ({ company, index }: { company: typeof sortedCompanies[0]; index: number }) => {
    // Compute dilution info for companies with convertibles/warrants
    const hasDilutiveInstruments = !!dilutiveInstruments[company.ticker];
    let dilutionInfo: { basicShares?: number; dilutedShares?: number; itmDilutionShares?: number; itmDebtAdjustment?: number } = {};
    if (hasDilutiveInstruments && company.sharesForMnav && company.stockPrice) {
      const result = getEffectiveShares(company.ticker, company.sharesForMnav, company.stockPrice);
      dilutionInfo = {
        basicShares: result.basic,
        dilutedShares: result.diluted,
        itmDilutionShares: result.diluted - result.basic,
        itmDebtAdjustment: result.inTheMoneyDebtValue,
      };
    }

    return (
    <div
      onClick={() => router.push(`/company/${company.ticker}`)}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 font-medium w-6">{index + 1}</span>
          <CompanyLogo ticker={company.ticker} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 dark:text-gray-100">{company.ticker}</span>
              {company.notes && company.notes.toLowerCase().includes("no sec") && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-amber-500 cursor-help">⚠️</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">{company.notes}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {company.filingType === "FPI" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded cursor-help">FPI</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Foreign Private Issuer - files 20-F/6-K. Less frequent XBRL updates.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {company.dataWarnings && company.dataWarnings.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-amber-500 cursor-help text-sm">📋</span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {company.dataWarnings.map((w, i) => (
                        <p key={i} className="text-sm">
                          {w.filingUrl ? (
                            <a
                              href={w.filingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                trackCitationSourceClick({ href: w.filingUrl || "", ticker: company.ticker, metric: "filings" });
                              }}
                            >
                              {w.message}
                            </a>
                          ) : w.message}
                        </p>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {company.dataWarnings?.some(w => w.type === 'stale-data') && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-help"
                      >
                        Stale
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      {company.dataWarnings
                        ?.filter(w => w.type === 'stale-data')
                        .map((w, i) => (
                          <p key={i} className="text-sm">
                            {w.filingUrl ? (
                              <a
                                href={w.filingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  trackCitationSourceClick({ href: w.filingUrl || "", ticker: company.ticker, metric: "filings" });
                                }}
                              >
                                {w.message}
                              </a>
                            ) : (
                              w.message
                            )}
                          </p>
                        ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge variant="outline" className={cn("text-xs", assetColors[company.asset] || assetColors.ETH)}>
                {company.asset}
              </Badge>
              {company.pendingMerger && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Pending
                </Badge>
              )}
              {company.lowLiquidity && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-500/10 text-gray-500 border-gray-500/30">
                  Low Liq
                </Badge>
              )}
              {/* Miner badge - shows for BTC miners with HODL strategies */}
              {company.isMiner && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 cursor-help">
                        ⛏️ Miner
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">Bitcoin miner - produces BTC through mining operations. mNAV includes value of mining capacity.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {/* SEC Referenced badge - only when explicitly flagged */}
              {company.secReferenced && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-500/10 text-blue-500 border-blue-500/30">
                  SEC Ref
                </Badge>
              )}
              {/* Shares verification badge - only when explicitly flagged */}
              {company.dataWarnings?.some(w => w.type === 'unverified-shares') && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                  Shares: Co. Reported
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate max-w-[200px]">{company.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {company.stockPrice ? `$${company.stockPrice.toFixed(2)}` : "—"}
          </div>
          <div className={cn("text-sm font-medium",
            company.stockChange && company.stockChange >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {company.stockChange !== undefined ? `${company.stockChange >= 0 ? "+" : ""}${company.stockChange.toFixed(2)}%` : "—"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-xs text-gray-500 uppercase">AHPS 90D</p>
          <div className="flex items-center gap-1">
            <p className={cn("font-semibold", getGrowthColor(company.ahpsGrowth90d))}>
              {formatGrowthPct(company.ahpsGrowth90d)}
            </p>
            {company.usesAdjustedShares && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                Adj
              </Badge>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">mNAV</p>
          <div className="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100">
            {company.pendingMerger ? "—" : (
              <>
                {company.mnavWarnings && company.mnavWarnings.length > 0 && (
                  <span className="text-amber-500 text-xs">⚠️</span>
                )}
                <MNAVTooltip
                  mNAV={company.mNAV}
                  marketCap={company.marketCap}
                  holdingsValue={company.holdingsValue}
                  totalDebt={company.totalDebt}
                  preferredEquity={company.preferredEquity}
                  cashReserves={company.cashReserves}
                  restrictedCash={company.restrictedCash}
                  otherInvestments={company.otherInvestments}
                  ticker={company.ticker}
                  asset={company.asset}
                  holdings={company.holdings}
                  sharesForMnav={company.sharesForMnav}
                  stockPrice={company.stockPrice}
                  cryptoPrice={company.cryptoPrice}
                  hasLiveData={company.hasLiveBalanceSheet}
                  hasDilutiveInstruments={hasDilutiveInstruments}
                  basicShares={dilutionInfo.basicShares}
                  dilutedShares={dilutionInfo.dilutedShares}
                  itmDilutionShares={dilutionInfo.itmDilutionShares}
                  itmDebtAdjustment={dilutionInfo.itmDebtAdjustment}
                  holdingsSourceUrl={company.holdingsSourceUrl}
                  officialDashboard={COMPANY_SOURCES[company.ticker]?.officialDashboard}
                  secFilingsUrl={COMPANY_SOURCES[company.ticker]?.secFilingsUrl}
                  officialDashboardName={COMPANY_SOURCES[company.ticker]?.officialDashboardName}
                  officialMnavNote={COMPANY_SOURCES[company.ticker]?.officialMnavNote}
                  sharesSource={company.sharesSource}
                  sharesAsOf={company.sharesAsOf}
                  sharesSourceUrl={company.sharesSourceUrl}
                  debtSource={company.debtSource}
                  debtAsOf={company.debtAsOf}
                  debtSourceUrl={company.debtSourceUrl}
                  cashSource={company.cashSource}
                  cashAsOf={company.cashAsOf}
                  cashSourceUrl={company.cashSourceUrl}
                  preferredSource={company.preferredSource}
                  preferredAsOf={company.preferredAsOf}
                  preferredSourceUrl={company.preferredSourceUrl}
                />
              </>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Treasury</p>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(company.holdingsValue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase">Leverage</p>
          <p className={cn(
            "font-semibold",
            company.leverageRatio >= 1 ? "text-amber-600" : "text-gray-900 dark:text-gray-100"
          )}>
            {company.leverageRatio > 0 ? (
              <span className="inline-flex items-center gap-1">
                {company.leverageRatio >= 1 && <span>⚠️</span>}
                {company.leverageRatio.toFixed(2)}x
              </span>
            ) : "—"}
          </p>
        </div>
      </div>
    </div>
    );
  };

  const isGrowthView = sortField === "hpsGrowth90d";
  const isSizeView = sortField === "holdingsValue" || sortField === "marketCap";

  const switchToGrowth = () => {
    setSortField("hpsGrowth90d");
    setSortDir("desc");
  };

  const switchToSize = () => {
    setSortField("holdingsValue");
    setSortDir("desc");
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden lg:border-0">
      {/* View Toggle */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={switchToGrowth}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            isGrowthView
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Performance
        </button>
        <button
          onClick={switchToSize}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            isSizeView
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Size
        </button>
        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
          {isGrowthView
            ? "90-day AHPS growth — who's accumulating fastest"
            : isSizeView
              ? "Total treasury value — largest crypto holdings"
              : `Sorted by ${sortField}`}
        </span>
      </div>
      {filteredCompanies.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-700 dark:text-gray-200 font-medium">
            No companies match the current AHPS leaderboard filters.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Clear one or more filters to repopulate the 90-day adjusted holdings-per-share rankings.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3 p-3 bg-gray-50 dark:bg-gray-950">
            {sortedCompanies.map((company, index) => (
              <MobileCard key={company.id} company={company} index={index} />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead
                  className="cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("ticker")}
                >
                  Company {sortField === "ticker" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead>Asset</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("hpsGrowth90d")}
                >
                  AHPS Growth (90D) {sortField === "hpsGrowth90d" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("mNAV")}
                >
                  mNAV {sortField === "mNAV" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("mNAVChange")}
                >
                  mNAV 24h {sortField === "mNAVChange" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("leverageRatio")}
                >
                  Leverage {sortField === "leverageRatio" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("stockPrice")}
                >
                  Price {sortField === "stockPrice" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("stockVolume")}
                >
                  Volume {sortField === "stockVolume" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("marketCap")}
                >
                  Market Cap {sortField === "marketCap" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("holdingsValue")}
                >
                  Treasury {sortField === "holdingsValue" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company, index) => {
                // Compute dilution info for companies with convertibles/warrants
                const hasDilutiveInstruments = !!dilutiveInstruments[company.ticker];
                let dilutionInfo: { basicShares?: number; dilutedShares?: number; itmDilutionShares?: number; itmDebtAdjustment?: number } = {};
                if (hasDilutiveInstruments && company.sharesForMnav && company.stockPrice) {
                  const result = getEffectiveShares(company.ticker, company.sharesForMnav, company.stockPrice);
                  dilutionInfo = {
                    basicShares: result.basic,
                    dilutedShares: result.diluted,
                    itmDilutionShares: result.diluted - result.basic,
                    itmDebtAdjustment: result.inTheMoneyDebtValue,
                  };
                }

                return (
                <TableRow
                  key={company.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/company/${company.ticker}`)}
                >
                  <TableCell className="text-gray-500 font-medium text-sm">
                    {index + 1}
                  </TableCell>
                  <TableCell className="p-2">
                    <CompanyLogo ticker={company.ticker} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {company.ticker}
                        </span>
                        <CitationPopover
                          sourceUrl={company.holdingsSourceUrl}
                          sourceLabel={company.holdingsSource}
                          ticker={company.ticker}
                          metric="holdings_native"
                          confidenceScore={company.confidenceScores?.['holdings_native']}
                          jurisdiction={company.jurisdiction}
                          legacy={company.holdingsBasis === 'static_fallback'}
                          sourceQuote={company.sourceQuote}
                        >
                          <VerificationBadge
                            status={getVerificationStatus(
                              company.holdingsSourceUrl?.includes("sec.gov") ? "sec-filing" : company.holdingsSource,
                              company.holdingsSourceUrl,
                              company.holdingsLastUpdated
                            )}
                            compact
                          />
                        </CitationPopover>
                        {company.notes && company.notes.toLowerCase().includes("no sec") && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-500 cursor-help">⚠️</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{company.notes}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {company.dataWarnings && company.dataWarnings.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-500 cursor-help text-sm">📋</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                {company.dataWarnings.map((w, i) => (
                                  <p key={i} className="text-sm">
                                    {w.filingUrl ? (
                                      <a
                                        href={w.filingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          trackCitationSourceClick({ href: w.filingUrl || "", ticker: company.ticker, metric: "filings" });
                                        }}
                                      >
                                        {w.message}
                                      </a>
                                    ) : w.message}
                                  </p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {company.pendingMerger && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Pending Merger
                          </Badge>
                        )}
                        {company.lowLiquidity && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-500/10 text-gray-500 border-gray-500/30">
                            Low Liquidity
                          </Badge>
                        )}
                        {/* SEC Referenced badge - only when explicitly flagged */}
                        {company.secReferenced && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-500 border-blue-500/30">
                            SEC Referenced
                          </Badge>
                        )}
                        {/* Shares verification badge - only when explicitly flagged */}
                        {company.dataWarnings?.some(w => w.type === 'unverified-shares') && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Shares: Company Reported
                          </Badge>
                        )}
                        {/* Miner badge */}
                        {company.isMiner && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 cursor-help">
                                  ⛏️ Miner
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">Bitcoin miner - produces BTC through mining operations. mNAV includes value of mining capacity.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 truncate max-w-[180px]">
                        {company.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("font-medium", assetColors[company.asset] || assetColors.ETH)}
                    >
                      {company.asset}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={cn("font-semibold", getGrowthColor(company.ahpsGrowth90d))}>
                      {formatGrowthPct(company.ahpsGrowth90d)}
                    </span>
                    {company.usesAdjustedShares && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-green-500/10 text-green-600 border-green-500/30">
                        Adj
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {company.pendingMerger ? (
                      <span className="text-gray-400" title="mNAV not available for pre-merger SPACs">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {company.mnavWarnings && company.mnavWarnings.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-500 cursor-help text-xs">⚠️</span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold text-amber-500">Calculation Warning</p>
                                  {company.mnavWarnings.map((w: string, i: number) => (
                                    <p key={i} className="text-[10px]">{w}</p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <MNAVTooltip
                          mNAV={company.mNAV}
                          marketCap={company.marketCap}
                          holdingsValue={company.holdingsValue}
                          totalDebt={company.totalDebt}
                          preferredEquity={company.preferredEquity}
                          cashReserves={company.cashReserves}
                          restrictedCash={company.restrictedCash}
                          otherInvestments={company.otherInvestments}
                          ticker={company.ticker}
                          asset={company.asset}
                          holdings={company.holdings}
                          sharesForMnav={company.sharesForMnav}
                          stockPrice={company.stockPrice}
                          cryptoPrice={company.cryptoPrice}
                          hasLiveData={company.hasLiveBalanceSheet}
                          hasDilutiveInstruments={hasDilutiveInstruments}
                          basicShares={dilutionInfo.basicShares}
                          dilutedShares={dilutionInfo.dilutedShares}
                          itmDilutionShares={dilutionInfo.itmDilutionShares}
                          itmDebtAdjustment={dilutionInfo.itmDebtAdjustment}
                          holdingsSourceUrl={company.holdingsSourceUrl}
                          officialDashboard={COMPANY_SOURCES[company.ticker]?.officialDashboard}
                          secFilingsUrl={COMPANY_SOURCES[company.ticker]?.secFilingsUrl}
                          officialDashboardName={COMPANY_SOURCES[company.ticker]?.officialDashboardName}
                          officialMnavNote={COMPANY_SOURCES[company.ticker]?.officialMnavNote}
                          sharesSource={company.sharesSource}
                          sharesAsOf={company.sharesAsOf}
                          sharesSourceUrl={company.sharesSourceUrl}
                          debtSource={company.debtSource}
                          debtAsOf={company.debtAsOf}
                          debtSourceUrl={company.debtSourceUrl}
                          cashSource={company.cashSource}
                          cashAsOf={company.cashAsOf}
                          cashSourceUrl={company.cashSourceUrl}
                          preferredSource={company.preferredSource}
                          preferredAsOf={company.preferredAsOf}
                          preferredSourceUrl={company.preferredSourceUrl}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {company.pendingMerger ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <FlashingPercent value={company.mNAVChange} />
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {company.leverageRatio > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={cn(
                              "inline-flex items-center gap-1",
                              company.leverageRatio >= 1 ? "text-amber-600 font-medium" : "text-gray-500"
                            )}>
                              {company.leverageRatio >= 1 && <span>⚠️</span>}
                              {company.leverageRatio.toFixed(2)}x
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Debt / Crypto NAV</p>
                            {company.leverageRatio >= 1 && (
                              <p className="text-xs text-amber-500">High leverage - mNAV elevated by debt structure</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                    <span className="inline-flex items-center gap-1">
                      <FlashingPrice
                        value={company.stockPrice}
                        format={(v) => `$${v.toFixed(2)}`}
                      />
                      {company.isAfterHours && (
                        <span className="text-[10px] px-1 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded font-medium">
                          AH
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <FlashingPercent value={company.stockChange} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                    {company.stockVolume > 0 ? formatNumber(company.stockVolume) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                    <CitationPopover
                      sourceUrl={company.sharesSourceUrl}
                      sourceLabel={company.sharesSource}
                      sourceQuote={company.sharesSourceQuote}
                      ticker={company.ticker}
                      metric="basic_shares"
                      confidenceScore={company.confidenceScores?.['basic_shares']}
                      jurisdiction={company.jurisdiction}
                      legacy={!company.sharesSourceUrl}
                    >
                      <FlashingLargeNumber value={company.marketCap} />
                    </CitationPopover>
                  </TableCell>
                  <TableCell className="text-right">
                    {company.pendingMerger ? (
                      <div className="flex flex-col items-end">
                        <span className="text-gray-400 text-sm">TBD</span>
                        <span className="text-xs text-amber-600 font-mono">
                          ~{formatNumber(company.expectedHoldings || 0)} {company.asset} expected
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          <CitationPopover
                            sourceUrl={company.holdingsSourceUrl}
                            sourceLabel={company.holdingsSource}
                            ticker={company.ticker}
                            metric="holdings_native"
                            confidenceScore={company.confidenceScores?.['holdings_native']}
                            jurisdiction={company.jurisdiction}
                            legacy={company.holdingsBasis === 'static_fallback'}
                            sourceQuote={company.sourceQuote}
                          >
                            <FlashingLargeNumber
                              value={company.holdingsValue}
                              className="font-mono font-medium text-gray-900 dark:text-gray-100"
                            />
                          </CitationPopover>
                          <StalenessCompact
                            lastUpdated={company.holdingsLastUpdated}
                            sourceUrl={company.holdingsSourceUrl}
                            ticker={company.ticker}
                            metric="holdings_native"
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-mono inline-flex items-center gap-1">
                          {formatNumber(company.holdings)} {company.asset}
                          <HoldingsBasisBadge basis={company.holdingsBasis} />
                        </span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}
      {filteredCompanies.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
          Showing {sortedCompanies.length} of {companies.length} companies
        </div>
      )}
    </div>
  );
}
