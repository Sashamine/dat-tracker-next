import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve the primary document URL from an SEC EDGAR filing index.
 * Fetches the index page, finds the main 10-Q/10-K/8-K document, returns its URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cik = searchParams.get("cik");
  const accession = searchParams.get("accession");

  if (!cik || !accession) {
    return NextResponse.json(
      { error: "Missing cik or accession" },
      { status: 400 }
    );
  }

  const accessionNoDashes = accession.replace(/-/g, "");
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${accession}-index.htm`;

  try {
    const res = await fetch(indexUrl, {
      headers: {
        "User-Agent": "DATCAP-Tracker contact@reservelabs.com",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Index page returned ${res.status}`, indexUrl },
        { status: 502 }
      );
    }

    const html = await res.text();

    // Parse the index page to find the primary document (sequence 1, type 10-Q/10-K/8-K)
    // The primary document is typically the first .htm file in the "Document Format Files" table
    // Pattern: <a href="/Archives/edgar/data/{cik}/{accessionNoDashes}/{filename}">filename</a>
    const docPattern = new RegExp(
      `href="[^"]*/${accessionNoDashes}/([^"]+\\.htm)"`,
      "gi"
    );
    
    const matches: string[] = [];
    let match;
    while ((match = docPattern.exec(html)) !== null) {
      const filename = match[1];
      // Skip index files, R*.htm (XBRL viewer fragments), and exhibit files
      if (
        filename.includes("-index") ||
        /^R\d+\.htm$/i.test(filename) ||
        filename.includes("index-headers")
      ) {
        continue;
      }
      matches.push(filename);
    }

    if (matches.length === 0) {
      return NextResponse.json({ error: "No document found", indexUrl });
    }

    // The primary document is typically the first non-exhibit .htm file
    // Prefer files that don't start with "ex" (exhibits)
    const primaryDoc =
      matches.find((f) => !f.toLowerCase().startsWith("ex") && !f.includes("_ex")) ||
      matches[0];

    const documentUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${primaryDoc}`;

    return NextResponse.json({ documentUrl, filename: primaryDoc, indexUrl });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e?.message || String(err), indexUrl },
      { status: 500 }
    );
  }
}
