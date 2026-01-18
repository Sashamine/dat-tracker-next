"use client";

import { formatHoldingsSource } from "@/lib/holdings-verification";
import { ExternalLink } from "lucide-react";

interface LastUpdatedProps {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  showSource?: boolean;
}

/**
 * Shows when holdings data was last updated with a link to the source
 */
export function LastUpdated({
  lastUpdated,
  source,
  sourceUrl,
  showSource = false
}: LastUpdatedProps) {
  if (!lastUpdated) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
  });

  const content = (
    <>
      {formatted}
      {showSource && source && (
        <span className="ml-1 text-muted-foreground">
          ({formatHoldingsSource(source)})
        </span>
      )}
    </>
  );

  // If we have a source URL, make it a link
  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
      >
        {content}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return <span className="text-xs text-muted-foreground">{content}</span>;
}

// Legacy exports for backwards compatibility
export function StalenessIndicator({
  lastUpdated,
  source,
  sourceUrl,
}: {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  return <LastUpdated lastUpdated={lastUpdated} source={source} sourceUrl={sourceUrl} />;
}

export function StalenessBadge({
  lastUpdated,
  source,
  sourceUrl,
}: {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
}) {
  return <LastUpdated lastUpdated={lastUpdated} source={source} sourceUrl={sourceUrl} showSource />;
}

export function StalenessCompact({
  lastUpdated,
  sourceUrl,
}: {
  lastUpdated?: string;
  sourceUrl?: string;
}) {
  return <LastUpdated lastUpdated={lastUpdated} sourceUrl={sourceUrl} />;
}
