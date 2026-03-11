/**
 * ASX (Australian Securities Exchange) Fetcher
 *
 * Fetches announcements from the ASX MarkIT Digital API and extracts
 * BTC holdings from "Treasury Information" PDF filings.
 *
 * API: https://asx.api.markitdigital.com/asx-research/1.0/companies/{code}/announcements
 * PDFs: https://asx.api.markitdigital.com/asx-research/1.0/file/{documentKey}?type=pdf
 *
 * Currently supports: DigitalX (DCC.AX)
 *
 * DigitalX publishes monthly "Treasury Information" PDFs containing:
 * - Direct BTC holdings count
 * - BTXX ETF-equivalent BTC
 * - Total BTC exposure
 * - Sats per share
 */

/** ASX announcement from the MarkIT Digital API */
export interface AsxAnnouncement {
  headline: string;
  date: string;           // ISO datetime from API
  documentKey: string;    // e.g., "2924-03058468-6A1312801"
  announcementType: string;
  isPriceSensitive: boolean;
  fileSize: string;
}

/** Known ASX company codes */
const ASX_COMPANIES: Record<string, { code: string; name: string }> = {
  'DCC.AX': { code: 'DCC', name: 'DigitalX' },
};

const ASX_API_BASE = 'https://asx.api.markitdigital.com/asx-research/1.0';

/**
 * Fetch recent announcements from ASX for a company.
 */
export async function getAsxAnnouncements(
  ticker: string,
  count = 50,
): Promise<AsxAnnouncement[]> {
  const company = ASX_COMPANIES[ticker];
  if (!company) throw new Error(`Unknown ASX ticker: ${ticker}`);

  const url = `${ASX_API_BASE}/companies/${company.code}/announcements?count=${count}&market_sensitive=false`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
    },
  });

  if (!res.ok) throw new Error(`ASX API failed: ${res.status}`);
  const json = await res.json() as {
    data: {
      items: Array<{
        headline: string;
        date: string;
        documentKey: string;
        announcementType: string;
        isPriceSensitive: boolean;
        fileSize: string;
      }>;
    };
  };

  return json.data.items.map(item => ({
    headline: item.headline,
    date: item.date,
    documentKey: item.documentKey,
    announcementType: item.announcementType,
    isPriceSensitive: item.isPriceSensitive,
    fileSize: item.fileSize,
  }));
}

/**
 * Get the PDF download URL for an ASX announcement.
 */
export function getAsxPdfUrl(documentKey: string): string {
  return `${ASX_API_BASE}/file/${documentKey}?type=pdf`;
}

/**
 * Filter announcements to "Treasury Information" filings.
 */
export function filterTreasuryAnnouncements(announcements: AsxAnnouncement[]): AsxAnnouncement[] {
  return announcements.filter(a =>
    a.headline.toLowerCase().includes('treasury information')
  );
}

/**
 * Parse BTC holdings from DigitalX Treasury Information PDF text.
 *
 * The PDF contains a table with:
 * - "Spot Bitcoin" row with quantity
 * - A note: "DigitalX Bitcoin ETF Units are equivalent to X BTC"
 * - "total Bitcoin exposure to X BTC"
 *
 * Example:
 *   "Spot Bitcoin 309 $34,729,550 50.9%"
 *   "total Bitcoin exposure to 503.7 BTC"
 */
export function parseBtcFromAsxTreasuryPdf(text: string): {
  directBtc: number | null;
  etfBtc: number | null;
  totalBtc: number | null;
  satsPerShare: number | null;
  periodEnd: string | null;
} {
  const result = {
    directBtc: null as number | null,
    etfBtc: null as number | null,
    totalBtc: null as number | null,
    satsPerShare: null as number | null,
    periodEnd: null as string | null,
  };

  // Pattern 1: "total Bitcoin exposure to X BTC" or "total Bitcoin exposure of X BTC"
  const totalMatch = text.match(/total\s+Bitcoin\s+exposure\s+(?:to|of)\s+([\d,]+(?:\.\d+)?)\s*BTC/i);
  if (totalMatch) {
    result.totalBtc = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Pattern 2: "Spot Bitcoin" row — "Spot Bitcoin\n?\s*1?\s*\n?\s*(\d+)"
  // The table renders as: "Spot Bitcoin 1 309 $34,729,550 50.9%"
  // (the "1" is a footnote reference)
  const spotMatch = text.match(/Spot\s+Bitcoin\s*\n?\s*(?:1\s*\n?\s*)?([\d,]+(?:\.\d+)?)\s/i);
  if (spotMatch) {
    result.directBtc = parseFloat(spotMatch[1].replace(/,/g, ''));
  }

  // Pattern 3: "equivalent to X BTC" (ETF units)
  const etfMatch = text.match(/equivalent\s+to\s+([\d,]+(?:\.\d+)?)\s*BTC/i);
  if (etfMatch) {
    result.etfBtc = parseFloat(etfMatch[1].replace(/,/g, ''));
  }

  // Pattern 4: "Sats per share" metric — "Satoshis (Sats) per share metric remained stable at 33.84"
  // PDF text may have font-encoding artifacts (U+E081 etc.) between words
  const cleanText = text.replace(/[\uE000-\uF8FF]/g, '');
  const satsMatch = cleanText.match(/[Ss]ats?\s+per\s+share\s+(?:metric\s+)?(?:remained?\s+(?:stable\s+)?at\s+|(?:was|is|increased?\s+to|decreased?\s+to)\s+)([\d.]+)/i);
  if (satsMatch) {
    result.satsPerShare = parseFloat(satsMatch[1]);
  }

  // Pattern 5: Period end date — "as at 31 January 2026"
  const periodMatch = text.match(/as\s+at\s+(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (periodMatch) {
    const day = periodMatch[1].padStart(2, '0');
    const monthName = periodMatch[2];
    const year = periodMatch[3];
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const month = months[monthName.toLowerCase()];
    if (month) {
      result.periodEnd = `${year}-${month}-${day}`;
    }
  }

  return result;
}
