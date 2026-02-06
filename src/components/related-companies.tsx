"use client";

import Link from "next/link";
import { Company } from "@/lib/types";
import { allCompanies } from "@/lib/data/companies";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface RelatedCompaniesProps {
  company: Company;
  maxItems?: number;
  className?: string;
}

/**
 * Related Companies Component
 * 
 * Shows links to related companies for internal linking (SEO) and user discovery.
 * Relationships are based on:
 * - Same asset type (BTC, ETH, etc.)
 * - Similar tier
 * - Similar market cap range
 */
export function RelatedCompanies({
  company,
  maxItems = 5,
  className,
}: RelatedCompaniesProps) {
  // Find related companies by asset
  const sameAsset = allCompanies
    .filter(
      (c) =>
        c.asset === company.asset &&
        c.ticker !== company.ticker
    )
    .slice(0, maxItems);

  // Find companies with different assets for diversification
  const otherAssets = allCompanies
    .filter(
      (c) =>
        c.asset !== company.asset &&
        c.tier <= 2 // Only show high-quality companies
    )
    .slice(0, 3);

  if (sameAsset.length === 0 && otherAssets.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Same asset companies */}
      {sameAsset.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Other {company.asset} Treasury Companies
          </h3>
          <div className="flex flex-wrap gap-2">
            {sameAsset.map((c) => (
              <Link
                key={c.ticker}
                href={`/company/${c.ticker}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <span className="font-medium">{c.ticker}</span>
                <span className="text-gray-500 dark:text-gray-400 text-xs hidden sm:inline">
                  {c.name.split(" ").slice(0, 2).join(" ")}
                </span>
              </Link>
            ))}
            {allCompanies.filter((c) => c.asset === company.asset).length >
              maxItems && (
              <Link
                href={`/?asset=${company.asset}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Other asset companies */}
      {otherAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Companies Holding Other Assets
          </h3>
          <div className="flex flex-wrap gap-2">
            {otherAssets.map((c) => (
              <Link
                key={c.ticker}
                href={`/company/${c.ticker}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <Badge
                  variant="outline"
                  className="text-[10px] px-1 py-0"
                >
                  {c.asset}
                </Badge>
                <span className="font-medium">{c.ticker}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SEO text - hidden visually but readable by search engines */}
      <p className="sr-only">
        {company.name} is one of {allCompanies.filter((c) => c.asset === company.asset).length}{" "}
        companies holding {company.asset} as a treasury asset tracked by DAT Tracker.
        Compare with other {company.asset} treasury companies like{" "}
        {sameAsset.slice(0, 3).map((c) => c.name).join(", ")}.
      </p>
    </div>
  );
}

/**
 * Asset Category Links
 * 
 * Links to browse companies by asset type
 */
export function AssetCategoryLinks({ className }: { className?: string }) {
  const assetCounts = allCompanies.reduce((acc, c) => {
    acc[c.asset] = (acc[c.asset] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedAssets = Object.entries(assetCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Browse by Asset
      </h3>
      <div className="flex flex-wrap gap-2">
        {sortedAssets.map(([asset, count]) => (
          <Link
            key={asset}
            href={`/?asset=${asset}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            <span className="font-medium">{asset}</span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              ({count})
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Tier Links
 * 
 * Links to filter by data quality tier
 */
export function TierLinks({ className }: { className?: string }) {
  const tierLabels: Record<number, string> = {
    1: "SEC Verified",
    2: "Verified",
    3: "Basic",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Browse by Data Quality
      </h3>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((tier) => {
          const count = allCompanies.filter((c) => c.tier === tier).length;
          return (
            <Link
              key={tier}
              href={`/?tier=${tier}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              <span className="font-medium">Tier {tier}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {tierLabels[tier]} ({count})
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
