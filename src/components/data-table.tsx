"use client";

import { useState } from "react";
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

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number }>;
}

interface DataTableProps {
  companies: Company[];
  prices?: PriceData;
}

// Format large numbers (e.g., 1,234,567 -> 1.23M)
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Format currency
function formatCurrency(num: number | undefined): string {
  if (num === undefined || num === null) return "—";
  return `$${formatNumber(num)}`;
}

// Format percentage
function formatPercent(num: number | undefined, includeSign = false): string {
  if (num === undefined || num === null) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${num.toFixed(1)}%`;
}

// Asset colors (CMC-style)
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  HYPE: "bg-green-500/10 text-green-600 border-green-500/20",
  BNB: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

// Tier badges
const tierColors: Record<number, string> = {
  1: "bg-green-500/10 text-green-600 border-green-500/20",
  2: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  3: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function DataTable({ companies, prices }: DataTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<string>("holdingsValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Calculate holdings value for each company
  const companiesWithValue = companies.map((company) => {
    const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
    const holdingsValue = company.holdings * cryptoPrice;
    const stockPrice = prices?.stocks[company.ticker]?.price;
    const stockChange = prices?.stocks[company.ticker]?.change24h;
    return { ...company, holdingsValue, stockPrice, stockChange };
  });

  const sortedCompanies = [...companiesWithValue].sort((a, b) => {
    let aVal: number, bVal: number;

    if (sortField === "holdingsValue") {
      aVal = a.holdingsValue || 0;
      bVal = b.holdingsValue || 0;
    } else if (sortField === "stockPrice") {
      aVal = a.stockPrice || 0;
      bVal = b.stockPrice || 0;
    } else if (sortField === "holdings") {
      aVal = a.holdings || 0;
      bVal = b.holdings || 0;
    } else {
      aVal = (a as any)[sortField] ?? 0;
      bVal = (b as any)[sortField] ?? 0;
    }

    return sortDirection === "desc" ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 dark:bg-gray-900/50">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Company</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort("stockPrice")}
            >
              Price {sortField === "stockPrice" && (sortDirection === "desc" ? "↓" : "↑")}
            </TableHead>
            <TableHead className="text-right">24h</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort("holdings")}
            >
              Holdings {sortField === "holdings" && (sortDirection === "desc" ? "↓" : "↑")}
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:text-gray-900 dark:hover:text-gray-100"
              onClick={() => handleSort("holdingsValue")}
            >
              Value {sortField === "holdingsValue" && (sortDirection === "desc" ? "↓" : "↑")}
            </TableHead>
            <TableHead>Tier</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCompanies.map((company, index) => (
            <TableRow
              key={company.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
              onClick={() => router.push(`/company/${company.ticker}`)}
            >
              <TableCell className="text-gray-500 font-medium">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {company.ticker}
                  </span>
                  <span className="text-sm text-gray-500 truncate max-w-[200px]">
                    {company.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-medium">
                {company.stockPrice ? `$${company.stockPrice.toFixed(2)}` : "—"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {company.stockChange !== undefined ? (
                  <span className={cn(
                    company.stockChange >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatPercent(company.stockChange, true)}
                  </span>
                ) : "—"}
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
                {formatNumber(company.holdings)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(company.holdingsValue)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn("font-medium", tierColors[company.tier])}
                >
                  T{company.tier}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
