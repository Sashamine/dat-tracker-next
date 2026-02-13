"use client";

/**
 * Shows a warning when balance sheet data is stale (>60 days old).
 * Pass any available "as of" dates — it picks the most recent one.
 */
export function StalenessNote({
  dates,
  secCik,
  threshold = 60,
}: {
  dates: (string | undefined | null)[];
  secCik?: string;
  threshold?: number;
}) {
  const validDates = dates.filter(Boolean).map(d => new Date(d!));
  if (validDates.length === 0) return null;

  const mostRecent = new Date(Math.max(...validDates.map(d => d.getTime())));
  const daysSince = Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= threshold) return null;

  const dateStr = mostRecent.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3 text-xs text-amber-700 dark:text-amber-400">
      ⚠️ Balance sheet data is <strong>{daysSince} days old</strong> (as of {dateStr}).
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
