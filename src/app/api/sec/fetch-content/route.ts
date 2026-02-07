import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Map tickers to CIKs
const TICKER_CIKS: Record<string, string> = {
  mstr: "1050446",
  mara: "1507605",
  riot: "1167419",
  clsk: "1515671",
  btbt: "1799290",
  kulr: "1662684",
  fufu: "1921158",
  naka: "1977303",
  abtc: "2068580",
  btcs: "1510079",
  bmnr: "1829311",
  game: "1825079",
  fgnx: "1437925",
  lits: "1411460",
  dfdv: "1652044",
  upxi: "1777319",
  hsdt: "1580063",
  tron: "1956744",
  cwd: "1627282",
  stke: "1846839",
  sqns: "1383395",
  twav: "746210",
  asst: "1920406",
  djt: "1849635",
  xxi: "2070457",
  fld: "1899287",
  sbet: "1869198",
  cepo: "2027708",
  avx: "1826397",
  ethm: "2028699",
  hypd: "1437107",
  purr: "2078856",
  na: "1872302",
  taox: "1539029",
  suig: "1425355",
  tbh: "1903595",
  btog: "1735556",
  zone: "1849430",
  xrpn: "1991453",
  cyph: "1509745",
  bnc: "1952979",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toLowerCase();
  const accession = searchParams.get("accession");

  if (!ticker || !accession) {
    return NextResponse.json(
      { error: "Missing ticker or accession parameter" },
      { status: 400 }
    );
  }

  const cik = TICKER_CIKS[ticker];
  if (!cik) {
    return NextResponse.json(
      { error: `Unknown ticker: ${ticker}` },
      { status: 404 }
    );
  }

  // Clean accession for SEC URL (remove dashes)
  const accessionClean = accession.replace(/-/g, "");

  try {
    // Fetch the filing index to find the primary document
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
    
    const indexRes = await fetch(indexUrl, {
      headers: { 
        "User-Agent": "DAT-Tracker research@dat-tracker.com",
        "Accept": "application/json",
      },
    });

    if (!indexRes.ok) {
      return NextResponse.json(
        { error: `SEC filing not found: ${indexRes.status}` },
        { status: 404 }
      );
    }

    const index = await indexRes.json();
    const items = index.directory?.item || [];

    // Find the primary document (prefer .htm over .txt)
    let primaryDoc = items.find(
      (item: { name: string }) =>
        item.name.endsWith(".htm") &&
        !item.name.toLowerCase().includes("ex") &&
        !item.name.startsWith("R")
    );
    
    if (!primaryDoc) {
      primaryDoc = items.find((item: { name: string }) => 
        item.name.endsWith(".htm") || item.name.endsWith(".txt")
      );
    }

    if (!primaryDoc) {
      return NextResponse.json(
        { error: "No document found in filing" },
        { status: 404 }
      );
    }

    // Fetch the actual document
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
    
    const docRes = await fetch(docUrl, {
      headers: { 
        "User-Agent": "DAT-Tracker research@dat-tracker.com",
      },
    });

    if (!docRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch document: ${docRes.status}` },
        { status: 500 }
      );
    }

    const content = await docRes.text();

    return new NextResponse(content, {
      headers: {
        "Content-Type": primaryDoc.name.endsWith(".htm") ? "text/html" : "text/plain",
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
      },
    });

  } catch (error) {
    console.error("Error fetching SEC filing:", error);
    return NextResponse.json(
      { error: "Failed to fetch from SEC" },
      { status: 500 }
    );
  }
}
