import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Ticker to CIK mapping
const TICKER_CIKS: Record<string, string> = {
  mstr: "1050446",
  mara: "1507605",
  riot: "1167419",
  clsk: "1515671",
  btbt: "1799290",
  kulr: "1662684",
  bmnr: "1829311",
  hive: "1820630",
  bitf: "1725134",
  hut: "1731805",
  corz: "1878848",
  iren: "1829794",
  wulf: "1822523",
  cifr: "1819994",
  btdr: "1933567",
  smlr: "1736946",
  dghi: "1844392",
  cxdo: "1849318",
  // Add more as needed
};

interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
}

/**
 * Lookup API - converts filing type + date to accession number
 * 
 * GET /api/filings/lookup?ticker=mstr&type=10-Q&date=2022-11-01
 * Returns: { accession: "0001193125-22-123456", ... }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const filingType = searchParams.get("type"); // e.g., "10-Q", "10-K", "8-K"
  const filingDate = searchParams.get("date"); // e.g., "2022-11-01"

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  const cik = TICKER_CIKS[ticker.toLowerCase()];
  if (!cik) {
    return NextResponse.json({ error: `Unknown ticker: ${ticker}` }, { status: 404 });
  }

  try {
    // Fetch recent filings from SEC EDGAR
    const edgarUrl = `https://data.sec.gov/submissions/CIK${cik.padStart(10, "0")}.json`;
    
    const response = await fetch(edgarUrl, {
      headers: {
        "User-Agent": "DAT-Tracker research@dat-tracker.com",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `SEC API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const filings = data.filings?.recent;
    
    if (!filings) {
      return NextResponse.json({ error: "No filings found" }, { status: 404 });
    }

    // Build array of filings
    const filingsList: SECFiling[] = [];
    for (let i = 0; i < filings.accessionNumber.length; i++) {
      filingsList.push({
        accessionNumber: filings.accessionNumber[i],
        filingDate: filings.filingDate[i],
        form: filings.form[i],
        primaryDocument: filings.primaryDocument[i],
      });
    }

    // If no type/date specified, return all recent filings
    if (!filingType && !filingDate) {
      return NextResponse.json({
        ticker,
        cik,
        filings: filingsList.slice(0, 50),
      });
    }

    // Filter by type if specified
    let matches = filingsList;
    if (filingType) {
      const normalizedType = filingType.toUpperCase();
      matches = matches.filter(f => 
        f.form.toUpperCase() === normalizedType ||
        f.form.toUpperCase().startsWith(normalizedType)
      );
    }

    // Filter by date if specified
    if (filingDate) {
      // Try exact match first
      const exactMatch = matches.find(f => f.filingDate === filingDate);
      if (exactMatch) {
        return NextResponse.json({
          ticker,
          cik,
          accession: exactMatch.accessionNumber,
          filingDate: exactMatch.filingDate,
          form: exactMatch.form,
          primaryDocument: exactMatch.primaryDocument,
        });
      }

      // Try finding closest match within 7 days
      const targetDate = new Date(filingDate);
      let closestMatch: SECFiling | null = null;
      let closestDiff = Infinity;

      for (const filing of matches) {
        const diff = Math.abs(new Date(filing.filingDate).getTime() - targetDate.getTime());
        const daysDiff = diff / (1000 * 60 * 60 * 24);
        if (daysDiff < closestDiff && daysDiff <= 7) {
          closestDiff = daysDiff;
          closestMatch = filing;
        }
      }

      if (closestMatch) {
        return NextResponse.json({
          ticker,
          cik,
          accession: closestMatch.accessionNumber,
          filingDate: closestMatch.filingDate,
          form: closestMatch.form,
          primaryDocument: closestMatch.primaryDocument,
          note: closestDiff > 0 ? `Closest match (${Math.round(closestDiff)} days off)` : undefined,
        });
      }
    }

    // Return first match if only type specified
    if (matches.length > 0) {
      const match = matches[0];
      return NextResponse.json({
        ticker,
        cik,
        accession: match.accessionNumber,
        filingDate: match.filingDate,
        form: match.form,
        primaryDocument: match.primaryDocument,
      });
    }

    return NextResponse.json(
      { error: `No matching filing found for ${ticker} ${filingType || ""} ${filingDate || ""}`.trim() },
      { status: 404 }
    );

  } catch (error) {
    console.error("Filing lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup filing" },
      { status: 500 }
    );
  }
}
