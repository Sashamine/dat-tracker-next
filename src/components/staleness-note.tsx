"use client";

/**
 * Shows warnings when balance sheet data is stale.
 * 
 * Two modes:
 * 1. Simple: pass dates[] — warns if ALL data is stale (legacy behavior)
 * 2. Labeled: pass labeledDates[] — warns about INDIVIDUAL stale metrics
 *    (e.g., "Cash is 137 days old" even if holdings are fresh)
 */

interface LabeledDate {
  label: string;
  date: string | undefined | null;
}

export function StalenessNote({
  dates,
  labeledDates,
  secCik,
  threshold = 60,
}: {
  dates?: (string | undefined | null)[];
  labeledDates?: LabeledDate[];
  secCik?: string;
  threshold?: number;
}) {
  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const daysSinceDate = (d: Date) => Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));

  // Mode 2: Per-metric staleness (preferred)
  if (labeledDates && labeledDates.length > 0) {
    const staleItems = labeledDates
      .filter(item => item.date)
      .map(item => ({ label: item.label, date: new Date(item.date!), days: daysSinceDate(new Date(item.date!)) }))
      .filter(item => item.days > threshold)
      .sort((a, b) => b.days - a.days); // most stale first

    if (staleItems.length === 0) return null;

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3 text-xs text-amber-700 dark:text-amber-400">
        ⚠️ Some data is stale:
        <ul className="mt-1 ml-4 list-disc">
          {staleItems.map(item => (
            <li key={item.label}>
              <strong>{item.label}</strong> — {item.days} days old (as of {formatDate(item.date)})
            </li>
          ))}
        </ul>
        {secCik && (
          <span className="mt-1 block">
            Check{" "}
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${secCik}&type=&dateb=&owner=include&count=10`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-amber-600"
            >
              SEC EDGAR
            </a>{" "}
            for newer filings.
          </span>
        )}
      </div>
    );
  }

  // Mode 1: Legacy — picks most recent date, warns if ALL stale
  const validDates = (dates || []).filter(Boolean).map(d => new Date(d!));
  if (validDates.length === 0) return null;

  const mostRecent = new Date(Math.max(...validDates.map(d => d.getTime())));
  const daysSince = daysSinceDate(mostRecent);

  if (daysSince <= threshold) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3 text-xs text-amber-700 dark:text-amber-400">
      ⚠️ Balance sheet data is <strong>{daysSince} days old</strong> (as of {formatDate(mostRecent)}).
      {secCik && (
        <>
          {" "}Check{" "}
          <a
            href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${secCik}&type=&dateb=&owner=include&count=10`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-600"
          >
            SEC EDGAR
          </a>{" "}
          for newer filings.
        </>
      )}
    </div>
  );
}
