/**
 * Auto-generated narrative text for SEO
 * 
 * Generates human-readable summaries from structured data.
 * These help search engines understand the content while
 * also being useful for screen readers and text-based browsers.
 */

import { Company } from "@/lib/types";
import { HoldingsSnapshot } from "@/lib/data/holdings-history";

// Format large numbers for readability
function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Format percentage
function formatPercent(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// Format currency
function formatUSD(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

/**
 * Generate company overview narrative
 */
export function generateCompanyOverview(
  company: Company,
  latestHoldings?: HoldingsSnapshot,
  cryptoPrice?: number
): string {
  const parts: string[] = [];

  // Basic intro
  parts.push(
    `${company.name} (${company.ticker}) is a publicly traded company that holds ${company.asset} as a treasury asset.`
  );

  // Holdings info
  if (latestHoldings) {
    const holdingsValue = cryptoPrice
      ? formatUSD(latestHoldings.holdings * cryptoPrice)
      : null;

    parts.push(
      `As of ${latestHoldings.date}, the company holds ${formatNumber(
        latestHoldings.holdings
      )} ${company.asset}${holdingsValue ? ` valued at approximately ${holdingsValue}` : ""}.`
    );

    // Holdings per share
    if (latestHoldings.holdingsPerShare) {
      parts.push(
        `This represents ${latestHoldings.holdingsPerShare.toFixed(6)} ${
          company.asset
        } per share.`
      );
    }
  }

  // Tier info
  const tierDescriptions: Record<number, string> = {
    1: "highest data quality tier with SEC-verified filings",
    2: "verified data tier with reliable company disclosures",
    3: "basic data tier based on public announcements",
  };
  if (company.tier && tierDescriptions[company.tier]) {
    parts.push(`${company.name} is classified in our ${tierDescriptions[company.tier]}.`);
  }

  return parts.join(" ");
}

/**
 * Generate treasury holdings narrative
 */
export function generateTreasuryNarrative(
  company: Company,
  history: HoldingsSnapshot[],
  cryptoPrice?: number
): string {
  if (history.length === 0) return "";

  const latest = history[history.length - 1];
  const oldest = history[0];
  const parts: string[] = [];

  // Current state
  const currentValue = cryptoPrice
    ? formatUSD(latest.holdings * cryptoPrice)
    : null;
  parts.push(
    `${company.name}'s treasury currently holds ${formatNumber(latest.holdings)} ${
      company.asset
    }${currentValue ? ` worth ${currentValue}` : ""}.`
  );

  // Growth if we have history
  if (history.length >= 2) {
    const holdingsGrowth =
      ((latest.holdings - oldest.holdings) / oldest.holdings) * 100;
    const timespan = Math.round(
      (new Date(latest.date).getTime() - new Date(oldest.date).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    );

    if (timespan > 0) {
      parts.push(
        `Over the past ${timespan} year${timespan > 1 ? "s" : ""}, holdings have ${
          holdingsGrowth >= 0 ? "grown" : "decreased"
        } by ${formatPercent(holdingsGrowth)}.`
      );
    }
  }

  return parts.join(" ");
}

/**
 * Generate mNAV narrative
 */
export function generateMNAVNarrative(
  company: Company,
  mnav: number | null,
  marketCap?: number,
  nav?: number
): string {
  if (mnav === null) return "";

  const parts: string[] = [];

  // Current mNAV
  const premiumDiscount = mnav > 1 ? "premium" : "discount";
  const percentage = Math.abs((mnav - 1) * 100);

  parts.push(
    `${company.ticker} currently trades at an mNAV of ${mnav.toFixed(
      2
    )}x, representing a ${percentage.toFixed(0)}% ${premiumDiscount} to its crypto net asset value.`
  );

  // Interpretation
  if (mnav > 2) {
    parts.push(
      `This high premium suggests investors value the company's operational capabilities, growth potential, or strategic positioning beyond just its ${company.asset} holdings.`
    );
  } else if (mnav > 1.2) {
    parts.push(
      `This moderate premium reflects confidence in management's ability to grow the treasury efficiently.`
    );
  } else if (mnav >= 0.8) {
    parts.push(
      `Trading near NAV suggests the market values the company roughly at its underlying crypto holdings.`
    );
  } else {
    parts.push(
      `This discount may indicate market concerns about operational costs, dilution, or other factors offsetting the treasury value.`
    );
  }

  // Add context if we have values
  if (marketCap && nav) {
    parts.push(
      `The company's market cap of ${formatUSD(marketCap)} compares to a crypto NAV of ${formatUSD(
        nav
      )}.`
    );
  }

  return parts.join(" ");
}

/**
 * Generate dilution narrative
 */
export function generateDilutionNarrative(
  company: Company,
  history: HoldingsSnapshot[]
): string {
  if (history.length < 2) return "";

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const shareGrowth =
    ((latest.sharesOutstanding - previous.sharesOutstanding) /
      previous.sharesOutstanding) *
    100;

  const holdingsGrowth =
    ((latest.holdings - previous.holdings) / previous.holdings) * 100;

  const hpsChange =
    ((latest.holdingsPerShare - previous.holdingsPerShare) /
      previous.holdingsPerShare) *
    100;

  const parts: string[] = [];

  // Share count change
  if (Math.abs(shareGrowth) > 0.1) {
    parts.push(
      `Between ${previous.date} and ${latest.date}, ${
        company.ticker
      }'s diluted share count ${
        shareGrowth > 0 ? "increased" : "decreased"
      } by ${formatPercent(shareGrowth)}.`
    );
  }

  // Holdings per share impact
  if (Math.abs(hpsChange) > 0.1) {
    const impact = hpsChange > 0 ? "accretive" : "dilutive";
    parts.push(
      `This was ${impact} to shareholders, with holdings per share ${
        hpsChange > 0 ? "increasing" : "decreasing"
      } by ${formatPercent(hpsChange)}.`
    );
  }

  // Net assessment
  if (holdingsGrowth > shareGrowth && shareGrowth > 0) {
    parts.push(
      `Despite share issuance, treasury growth outpaced dilution, resulting in net accretion.`
    );
  } else if (shareGrowth > holdingsGrowth && shareGrowth > 5) {
    parts.push(
      `Share issuance outpaced treasury growth, resulting in dilution of per-share holdings.`
    );
  }

  return parts.join(" ");
}

/**
 * Generate holdings history narrative for a time series
 */
export function generateHistoryNarrative(
  company: Company,
  history: HoldingsSnapshot[]
): string {
  if (history.length === 0) return "";

  const parts: string[] = [];

  parts.push(
    `${company.name} has ${history.length} recorded treasury snapshots in our database.`
  );

  if (history.length >= 2) {
    const first = history[0];
    const last = history[history.length - 1];

    parts.push(
      `The earliest record is from ${first.date} with ${formatNumber(
        first.holdings
      )} ${company.asset}, and the most recent is from ${last.date} with ${formatNumber(
        last.holdings
      )} ${company.asset}.`
    );

    // Calculate compound growth
    const years =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (1000 * 60 * 60 * 24 * 365);
    if (years >= 1) {
      const totalGrowth = (last.holdings - first.holdings) / first.holdings;
      const cagr = (Math.pow(1 + totalGrowth, 1 / years) - 1) * 100;
      parts.push(
        `This represents a compound annual growth rate (CAGR) of ${cagr.toFixed(1)}% in holdings.`
      );
    }
  }

  return parts.join(" ");
}
