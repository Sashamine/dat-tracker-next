"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface CompanyPageTabsProps {
  ticker: string;
  className?: string;
}

const tabs = [
  { key: "overview", label: "Overview", href: (ticker: string) => `/company/${ticker}` },
  { key: "earnings", label: "Earnings", href: (ticker: string) => `/company/${ticker}/earnings` },
  { key: "audit", label: "Audit", href: (ticker: string) => `/company/${ticker}/audit` },
];

export function CompanyPageTabs({ ticker, className }: CompanyPageTabsProps) {
  const pathname = usePathname();

  return (
    <div className={cn("border-b border-gray-200 dark:border-gray-800", className)}>
      <div className="flex items-center gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const href = tab.href(ticker);
          const active = pathname === href;
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                "border-b-2 px-1 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
