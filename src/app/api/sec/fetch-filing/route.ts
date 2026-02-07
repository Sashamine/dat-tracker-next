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
  asst: "1698113",
  djt: "1849635",
  xxi: "2015834",
  fld: "1899287",
  sbet: "1835567",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toLowerCase();
  const accession = searchParams.get("accession");
  const cikParam = searchParams.get("cik");
  const accessionRaw = searchParams.get("accessionRaw");

  // Get CIK from ticker or direct param
  let cik = cikParam;
  if (!cik && ticker) {
    cik = TICKER_CIKS[ticker];
  }

  // Get accession from param or raw
  let accessionClean = accession?.replace(/-/g, "").split("#")[0];
  if (!accessionClean && accessionRaw) {
    accessionClean = accessionRaw;
  }

  if (!cik || !accessionClean) {
    return NextResponse.json(
      { error: "Missing CIK or accession. Provide ticker+accession or cik+accessionRaw" },
      { status: 400 }
    );
  }

  try {
    // Fetch from SEC EDGAR
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
    
    const indexRes = await fetch(indexUrl, {
      headers: { "User-Agent": "DAT-Tracker research@example.com" },
    });

    if (!indexRes.ok) {
      const directUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
      return NextResponse.redirect(directUrl);
    }

    const index = await indexRes.json();
    const items = index.directory?.item || [];

    // Find the primary document
    let primaryDoc = items.find(
      (item: { name: string; size: string }) =>
        item.name.endsWith(".htm") &&
        !item.name.toLowerCase().includes("ex") &&
        !item.name.includes("_") &&
        (item.name.includes("10q") || item.name.includes("10k") || item.name.includes("8k") || item.name.includes("6k"))
    );
    
    if (!primaryDoc) {
      primaryDoc = items.find(
        (item: { name: string }) =>
          item.name.endsWith(".htm") &&
          !item.name.toLowerCase().includes("ex") &&
          !item.name.startsWith("R")
      );
    }
    
    if (!primaryDoc) {
      primaryDoc = items.find((item: { name: string }) => item.name.endsWith(".htm"));
    }

    if (!primaryDoc) {
      const directUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
      return NextResponse.redirect(directUrl);
    }

    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
    
    const docRes = await fetch(docUrl, {
      headers: { "User-Agent": "DAT-Tracker research@example.com" },
    });

    if (!docRes.ok) {
      return NextResponse.redirect(docUrl);
    }

    let html = await docRes.text();

    // Inject base tag for relative links
    const baseUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/`;
    html = html.replace(/<head[^>]*>/i, `$&<base href="${baseUrl}">`);

    // Add CSS for readability
    html = html.replace(
      "</head>",
      `<style>
        body { 
          font-family: system-ui, -apple-system, sans-serif !important;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          background: #fff;
          color: #000;
        }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 4px 8px; border: 1px solid #ddd; }
        th { background: #f5f5f5; }
        a { color: #0066cc; }
      </style></head>`
    );

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (error) {
    console.error("Error fetching SEC filing:", error);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head><title>Error Loading Filing</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>⚠️ Error Loading SEC Filing</h1>
          <p>Could not load the requested filing.</p>
          <p>CIK: ${cik}, Accession: ${accessionClean}</p>
          <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}" 
             target="_blank" 
             style="display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px;">
            Search SEC EDGAR →
          </a>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
