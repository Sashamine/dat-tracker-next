import FilingViewerClient from "./FilingViewerClient";

interface PageProps {
  params: Promise<{
    ticker: string;
    accession: string;
  }>;
  searchParams: Promise<{
    q?: string;
    anchor?: string;
    type?: string;
  }>;
}

/**
 * Detect if the "accession" is actually a date-based format like "10-Q-2022-11-01"
 * vs a real accession number like "0001193125-22-123456"
 */
function isDateBasedFormat(accession: string): boolean {
  // Real accession numbers are like: 0001193125-22-123456 (starts with digits)
  // Date-based are like: 10-Q-2022-11-01 or 8-K-2026-01-15 (starts with form type)
  return /^(10-[QK]|8-K|S-|424)/i.test(accession);
}

/**
 * Parse date-based format: "10-Q-2022-11-01" -> { type: "10-Q", date: "2022-11-01" }
 */
function parseDateFormat(accession: string): { type: string; date: string } | null {
  // Match patterns like: 10-Q-2022-11-01, 8-K-2026-01-15, 10-K-2023-02-28
  const match = accession.match(/^(10-[QK]|8-K|S-\d+|424[A-Z]\d*)-(\d{4}-\d{2}-\d{2})$/i);
  if (match) {
    return { type: match[1], date: match[2] };
  }
  return null;
}

export default async function FilingViewerPage({ params, searchParams }: PageProps) {
  const { ticker, accession: rawAccession } = await params;
  const { q: searchQuery, anchor, type } = await searchParams;
  
  let accession = rawAccession;
  let resolvedAnchor = anchor;
  
  // Check if accession contains an anchor (from hash in URL)
  // Note: Next.js doesn't pass hash to server, so anchor comes via searchParam
  
  // Handle date-based format by looking up the real accession number
  if (isDateBasedFormat(rawAccession)) {
    const parsed = parseDateFormat(rawAccession);
    if (parsed) {
      try {
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        
        const lookupUrl = `${baseUrl}/api/filings/lookup?ticker=${ticker}&type=${parsed.type}&date=${parsed.date}`;
        const response = await fetch(lookupUrl, { cache: "force-cache" });
        
        if (response.ok) {
          const data = await response.json();
          if (data.accession) {
            accession = data.accession;
          }
        }
      } catch (e) {
        console.error("Failed to lookup filing:", e);
        // Keep the original accession, let the viewer handle the error
      }
    }
  }
  
  return (
    <FilingViewerClient 
      ticker={ticker.toUpperCase()}
      accession={accession}
      searchQuery={searchQuery}
      anchor={resolvedAnchor}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker, accession } = await params;
  return {
    title: `${ticker.toUpperCase()} Filing ${accession} | DAT Tracker`,
    description: `SEC filing ${accession} for ${ticker.toUpperCase()}`,
  };
}
