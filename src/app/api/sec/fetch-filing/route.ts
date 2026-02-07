import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Map tickers to CIKs
const TICKER_CIKS: Record<string, string> = {
  mstr: "1050446",
  mara: "1507605",
  riot: "1167419",
  clsk: "1771485",
  btbt: "1710350",
  kulr: "1662684",
  fufu: "1921158",
  naka: "1946573",
  abtc: "1755953",
  btcs: "827876",
  bmnr: "1946573",
  game: "1714562",
  fgnx: "1591890",
  lits: "1262104",
  dfdv: "1805526",
  upxi: "1903596",
  hsdt: "1959534",
  tron: "1956744",
  cwd: "1627282",
  stke: "1846839",
  sqns: "1383395",
  twav: "746210",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toLowerCase();
  const accession = searchParams.get("accession");

  if (!ticker || !accession) {
    return NextResponse.json({ error: "Missing ticker or accession" }, { status: 400 });
  }

  const cik = TICKER_CIKS[ticker];
  if (!cik) {
    return NextResponse.json({ error: "Unknown ticker" }, { status: 404 });
  }

  // Clean accession number
  const accessionClean = accession.replace(/-/g, "").split("#")[0];
  
  try {
    // First, get the filing index to find the primary document
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
    const indexRes = await fetch(indexUrl, {
      headers: { "User-Agent": "DAT-Tracker research@example.com" },
    });

    if (!indexRes.ok) {
      // Try direct URL construction
      const directUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
      return NextResponse.redirect(directUrl);
    }

    const index = await indexRes.json();
    const items = index.directory?.item || [];

    // Find the primary document (usually the largest .htm file that's not an exhibit)
    const primaryDoc = items.find(
      (item: { name: string; size: string }) =>
        item.name.endsWith(".htm") &&
        !item.name.toLowerCase().includes("ex") &&
        !item.name.includes("_")
    ) || items.find(
      (item: { name: string }) => item.name.endsWith(".htm")
    );

    if (!primaryDoc) {
      const directUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
      return NextResponse.redirect(directUrl);
    }

    // Fetch the document
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
    const docRes = await fetch(docUrl, {
      headers: { "User-Agent": "DAT-Tracker research@example.com" },
    });

    if (!docRes.ok) {
      return NextResponse.redirect(docUrl);
    }

    let html = await docRes.text();

    // Inject base tag so relative links work
    const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
    html = html.replace(
      /<head>/i,
      `<head><base href="${baseUrl}">`
    );

    // Add some CSS to make it more readable
    html = html.replace(
      "</head>",
      `<style>
        body { 
          font-family: system-ui, -apple-system, sans-serif !important;
          max-width: 1000px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
        }
        table { border-collapse: collapse; }
        td, th { padding: 4px 8px; }
      </style></head>`
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching SEC filing:", error);
    return NextResponse.json({ error: "Failed to fetch filing" }, { status: 500 });
  }
}
