"use client";

import { useRouter } from "next/navigation";
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
import {
  calculateMNAV,
  calculateFairValue,
  formatLargeNumber,
  formatMNAV,
  formatPercent as formatPct,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { useFilters } from "@/lib/hooks/use-filters";
import { StockPriceCell } from "@/components/price-cell";

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number }>;
}

interface DataTableProps {
  companies: Company[];
  prices?: PriceData;
  showFilters?: boolean;
}

// Format large numbers (e.g., 1,234,567 -> 1.23M)
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Format percentage
function formatPercent(num: number | undefined, includeSign = false): string {
  if (num === undefined || num === null) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}

// Company logo URLs (Clearbit + manual overrides)
const COMPANY_LOGOS: Record<string, string> = {
  // BTC companies
  MSTR: "https://logo.clearbit.com/strategy.com",
  MARA: "https://logo.clearbit.com/mara.com",
  RIOT: "https://logo.clearbit.com/riotplatforms.com",
  CLSK: "https://logo.clearbit.com/cleanspark.com",
  HUT: "https://logo.clearbit.com/hut8.com",
  BITF: "https://logo.clearbit.com/bitfarms.com",
  WULF: "https://logo.clearbit.com/terawulf.com",
  CIFR: "https://logo.clearbit.com/ciphermining.com",
  KULR: "https://logo.clearbit.com/kulrtechnology.com",
  SMLR: "https://logo.clearbit.com/semlerscientific.com",
  // ETH companies
  BTBT: "https://logo.clearbit.com/bit-digital.com",
  BTCS: "https://logo.clearbit.com/btcs.com",
  SBET: "https://logo.clearbit.com/sharplink.com",
  EXOD: "https://logo.clearbit.com/exodus.com",
  // SOL companies
  // General fallback
};

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
  LTC: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  SUI: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  DOGE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  AVAX: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  ADA: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  HBAR: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

// Verdict colors
const verdictColors: Record<string, string> = {
  Cheap: "text-green-600",
  Fair: "text-blue-600",
  Expensive: "text-red-600",
  "N/A": "text-gray-600",
};

export function DataTable({ companies, prices, showFilters = true }: DataTableProps) {
  const router = useRouter();
  const {
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    minUpside,
    maxUpside,
    verdicts,
    assets,
    companyTypes,
    search,
    sortField,
    sortDir,
    setSortField,
    setSortDir,
  } = useFilters();

  // Calculate metrics for each company
  const companiesWithMetrics = companies.map((company) => {
    const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
    const stockData = prices?.stocks[company.ticker];
    const marketCap = stockData?.marketCap || company.marketCap || 0;
    const stockPrice = stockData?.price;
    const stockChange = stockData?.change24h;
    const stockVolume = stockData?.volume || company.avgDailyVolume || 0;
    const holdingsValue = company.holdings * cryptoPrice;

    const mNAV = calculateMNAV(marketCap, company.holdings, cryptoPrice);
    const networkStakingApy = NETWORK_STAKING_APY[company.asset] || 0;

    const fairValue = calculateFairValue(
      company.holdings,
      cryptoPrice,
      marketCap,
      company.stakingPct || 0,
      company.stakingApy || networkStakingApy,
      company.quarterlyBurnUsd || 0,
      networkStakingApy
    );

    // Determine company type
    const companyType = company.isMiner ? "Miner" : "Treasury";

    return {
      ...company,
      holdingsValue,
      marketCap,
      stockPrice,
      stockChange,
      stockVolume,
      mNAV: mNAV || 0,
      upside: fairValue.upside,
      verdict: fairValue.verdict,
      fairPremium: fairValue.fairPremium,
      companyType,
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

  // Upside filter (stored as percentage in URL, but calculated as decimal)
  if (minUpside > -100 || maxUpside < 1000) {
    filteredCompanies = filteredCompanies.filter((c) => {
      const upsidePct = (c.upside || 0) * 100;
      return upsidePct >= minUpside && upsidePct <= maxUpside;
    });
  }

  // Verdict filter
  if (verdicts.length > 0) {
    filteredCompanies = filteredCompanies.filter((c) =>
      verdicts.includes(c.verdict)
    );
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

  // Sort companies
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortField) {
      case "holdingsValue":
        aVal = a.holdingsValue || 0;
        bVal = b.holdingsValue || 0;
        break;
      case "stockPrice":
        aVal = a.stockPrice || 0;
        bVal = b.stockPrice || 0;
        break;
      case "holdings":
        aVal = a.holdings || 0;
        bVal = b.holdings || 0;
        break;
      case "mNAV":
        aVal = a.mNAV || 0;
        bVal = b.mNAV || 0;
        break;
      case "upside":
        aVal = a.upside || 0;
        bVal = b.upside || 0;
        break;
      case "marketCap":
        aVal = a.marketCap || 0;
        bVal = b.marketCap || 0;
        break;
      case "stockVolume":
        aVal = a.stockVolume || 0;
        bVal = b.stockVolume || 0;
        break;
      case "ticker":
        return sortDir === "desc"
          ? b.ticker.localeCompare(a.ticker)
          : a.ticker.localeCompare(b.ticker);
      default:
        aVal = (a as any)[sortField] ?? 0;
        bVal = (b as any)[sortField] ?? 0;
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

  // Logo component with fallback
  const CompanyLogo = ({ ticker }: { ticker: string }) => {
    const logoUrl = COMPANY_LOGOS[ticker];
    if (!logoUrl) return <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700" />;

    return (
      <img
        src={logoUrl}
        alt={ticker}
        className="w-7 h-7 rounded-full object-cover"
        onError={(e) => {
          // Hide image on error
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {filteredCompanies.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No companies match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("stockPrice")}
                >
                  Price {sortField === "stockPrice" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("stockVolume")}
                >
                  Volume {sortField === "stockVolume" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("holdingsValue")}
                >
                  Value {sortField === "holdingsValue" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("mNAV")}
                >
                  mNAV {sortField === "mNAV" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead
                  className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
                  onClick={() => handleSort("upside")}
                >
                  Upside {sortField === "upside" && (sortDir === "desc" ? "↓" : "↑")}
                </TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompanies.map((company, index) => (
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
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {company.ticker}
                      </span>
                      <span className="text-sm text-gray-500 truncate max-w-[180px]">
                        {company.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <StockPriceCell
                      price={company.stockPrice}
                      change24h={company.stockChange}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("font-medium", assetColors[company.asset] || assetColors.ETH)}
                    >
                      {company.asset}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      company.companyType === "Miner"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    )}>
                      {company.companyType}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                    {company.stockVolume > 0 ? formatNumber(company.stockVolume) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                    {formatLargeNumber(company.holdingsValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatMNAV(company.mNAV)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <span className={cn(company.upside > 0 ? "text-green-600" : "text-red-600")}>
                      {formatPct(company.upside, true)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-medium", verdictColors[company.verdict])}>
                      {company.verdict}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {filteredCompanies.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
          Showing {sortedCompanies.length} of {companies.length} companies
        </div>
      )}
    </div>
  );
}
