"use client";

import Link from "next/link";
import { useCompanies } from "@/lib/hooks/use-companies";
import { enrichAllCompanies } from "@/lib/hooks/use-company-data";
import { COMPANY_SOURCES, CompanyDataSources } from "@/lib/data/company-sources";
import { MobileHeader } from "@/components/mobile-header";
import { ExternalLink } from "lucide-react";

// Source type labels and colors
const SOURCE_TYPE_INFO: Record<string, { label: string; color: string }> = {
  "on-chain": { label: "On-chain", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  "sec-filing": { label: "SEC Filing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  "regulatory-filing": { label: "Regulatory", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  "press-release": { label: "Press Release", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  "company-website": { label: "Company Website", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  "aggregator": { label: "Aggregator", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  "manual": { label: "Manual", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300" },
};

function SourceLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      {label}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function CompanySourceCard({ ticker, sources }: { ticker: string; sources: CompanyDataSources }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <Link
          href={`/company/${ticker}`}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {sources.name}
        </Link>
        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{ticker}</span>
      </div>

      <div className="space-y-3">
        {/* Official Sources */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Official Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {sources.officialDashboard && (
              <SourceLink url={sources.officialDashboard} label="Dashboard" />
            )}
            {sources.investorRelations && (
              <SourceLink url={sources.investorRelations} label="Investor Relations" />
            )}
            {sources.secFilingsUrl && (
              <SourceLink url={sources.secFilingsUrl} label="SEC Filings" />
            )}
            {!sources.officialDashboard && !sources.investorRelations && !sources.secFilingsUrl && (
              <span className="text-sm text-gray-400">None documented</span>
            )}
          </div>
        </div>

        {/* Third-party Trackers */}
        {(sources.trackers?.length || sources.blockworksUrl) && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Third-party Trackers
            </h4>
            <div className="flex flex-wrap gap-2">
              {sources.blockworksUrl && (
                <SourceLink url={sources.blockworksUrl} label="Blockworks" />
              )}
              {sources.trackers?.map((tracker) => (
                <SourceLink
                  key={tracker}
                  url={`https://${tracker}`}
                  label={tracker}
                />
              ))}
            </div>
          </div>
        )}

        {/* Methodology */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Data Methodology
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <p>
              <span className="text-gray-500">Shares:</span>{" "}
              <span className="font-medium capitalize">{sources.sharesSource.replace("_", " ")}</span>
            </p>
            {sources.sharesNotes && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{sources.sharesNotes}</p>
            )}
            {sources.reportsHoldingsFrequency && (
              <p>
                <span className="text-gray-500">Updates:</span>{" "}
                <span className="capitalize">{sources.reportsHoldingsFrequency.replace("_", " ")}</span>
              </p>
            )}
            {sources.reportsMnavDaily && (
              <p className="text-green-600 dark:text-green-400 text-xs">Reports mNAV daily</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {sources.notes && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Notes
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{sources.notes}</p>
          </div>
        )}

        {/* Last Verified */}
        {sources.lastVerified && (
          <p className="text-xs text-gray-400">
            Last verified: {new Date(sources.lastVerified).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const { data: companiesData } = useCompanies();
  const allCompanies = enrichAllCompanies(companiesData?.companies || []);

  // Get companies that have source documentation
  const companiesWithSources = allCompanies.filter(
    (company) => COMPANY_SOURCES[company.ticker]
  );

  // Group by asset
  const byAsset = companiesWithSources.reduce((acc, company) => {
    if (!acc[company.asset]) acc[company.asset] = [];
    acc[company.asset].push(company);
    return acc;
  }, {} as Record<string, typeof companiesWithSources>);

  // Count companies without source documentation
  const companiesWithoutSources = allCompanies.filter(
    (company) => !COMPANY_SOURCES[company.ticker]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MobileHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              Home
            </Link>
            <span>/</span>
            <span>Data Sources</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Data Sources & Methodology
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            This page documents where our data comes from and how it's calculated.
            We prioritize official sources (SEC filings, company websites) over aggregators.
          </p>
        </div>

        {/* Source Priority */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Source Priority (Highest to Lowest)
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
              <span
                key={key}
                className={`px-3 py-1 rounded-full text-sm font-medium ${info.color}`}
              >
                {info.label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Aggregators (BitcoinTreasuries.net, Bitbo) are for verification only, not primary data sources.
          </p>
        </div>

        {/* Companies by Asset */}
        {Object.entries(byAsset).map(([asset, companies]) => (
          <div key={asset} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {asset} Companies ({companies.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {companies.map((company) => (
                <CompanySourceCard
                  key={company.ticker}
                  ticker={company.ticker}
                  sources={COMPANY_SOURCES[company.ticker]}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Companies Without Documentation */}
        {companiesWithoutSources.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Companies Without Source Documentation ({companiesWithoutSources.length})
            </h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                These companies use holdings data but don't have detailed source documentation yet:
              </p>
              <div className="flex flex-wrap gap-2">
                {companiesWithoutSources.map((company) => (
                  <Link
                    key={company.ticker}
                    href={`/company/${company.ticker}`}
                    className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    {company.ticker}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Data is updated as companies report. Holdings are typically updated within 24 hours of SEC filings
            or company announcements. Market data is real-time during market hours.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            <strong>Questions?</strong> Each company page shows specific source links and last update dates
            for their holdings data.
          </p>
        </div>
      </main>
    </div>
  );
}
