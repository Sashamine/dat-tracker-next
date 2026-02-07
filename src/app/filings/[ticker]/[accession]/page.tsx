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
 * or just a date like "2022-11-01" (with type in query param)
 * vs a real accession number like "0001193125-22-123456"
 */
function isDateBasedFormat(accession: string): boolean {
  // Real accession numbers are like: 0001193125-22-123456 (starts with digits, has specific format)
  // Date-based are like: 10-Q-2022-11-01 or 8-K-2026-01-15 (starts with form type)
  // Date-only are like: 2022-11-01 (just a date, type comes from query param)
  if (/^\d{10}-\d{2}-\d{6}$/.test(accession)) return false; // Real accession number
  return /^(10-[QK]|8-K|S-|424)/i.test(accession) || /^\d{4}-\d{2}-\d{2}$/.test(accession);
}

/**
 * Parse date-based format: "10-Q-2022-11-01" -> { type: "10-Q", date: "2022-11-01" }
 * Or just date: "2022-11-01" with typeParam -> { type: typeParam, date: "2022-11-01" }
 */
function parseDateFormat(accession: string, typeParam?: string): { type: string; date: string } | null {
  // Match patterns like: 10-Q-2022-11-01, 8-K-2026-01-15, 10-K-2023-02-28
  const match = accession.match(/^(10-[QK]|8-K|S-\d+|424[A-Z]\d*)-(\d{4}-\d{2}-\d{2})$/i);
  if (match) {
    return { type: match[1], date: match[2] };
  }
  
  // Match just a date: 2022-11-01 (type must come from typeParam)
  const dateMatch = accession.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch && typeParam) {
    return { type: typeParam.toUpperCase(), date: dateMatch[1] };
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
    const parsed = parseDateFormat(rawAccession, type);
    if (parsed) {
      try {
        // Fetch directly from SEC EDGAR API instead of our own API (avoids self-fetch issues)
        const ciks: Record<string, string> = {
          mstr: "1050446", mara: "1507605", riot: "1167419", clsk: "1515671",
          btbt: "1799290", kulr: "1662684", bmnr: "1829311", corz: "1878848",
          abtc: "2068580", btcs: "1510079", game: "1825079", fgnx: "1437925",
          dfdv: "1652044", upxi: "1777319", hsdt: "1580063", tron: "1956744",
          cwd: "1627282", stke: "1846839", djt: "1849635", fld: "1899287",
          naka: "1977303", tbh: "1903595", fwdi: "1879932",
        };
        const cik = ciks[ticker.toLowerCase()];
        
        if (cik) {
          const edgarUrl = `https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`;
          const response = await fetch(edgarUrl, {
            headers: { "User-Agent": "DAT-Tracker research@dat-tracker.com" },
            next: { revalidate: 3600 }, // Cache for 1 hour
          });
          
          if (response.ok) {
            const data = await response.json();
            const filings = data.filings?.recent;
            
            if (filings) {
              // Find matching filing by type and date
              for (let i = 0; i < filings.accessionNumber.length; i++) {
                if (filings.form[i].toUpperCase() === parsed.type.toUpperCase() &&
                    filings.filingDate[i] === parsed.date) {
                  accession = filings.accessionNumber[i];
                  break;
                }
              }
              
              // If no exact match, find closest within 7 days
              if (accession === rawAccession) {
                const targetDate = new Date(parsed.date);
                let closestDiff = Infinity;
                
                for (let i = 0; i < filings.accessionNumber.length; i++) {
                  if (filings.form[i].toUpperCase() === parsed.type.toUpperCase()) {
                    const diff = Math.abs(new Date(filings.filingDate[i]).getTime() - targetDate.getTime());
                    const daysDiff = diff / (1000 * 60 * 60 * 24);
                    if (daysDiff < closestDiff && daysDiff <= 7) {
                      closestDiff = daysDiff;
                      accession = filings.accessionNumber[i];
                    }
                  }
                }
              }
            }
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
