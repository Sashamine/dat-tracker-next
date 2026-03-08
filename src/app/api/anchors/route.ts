import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";

interface AnchorEntry {
  ticker: string;
  name: string;
  asset: string;
  holdings: number;
  holdingsSource: string | null;
  holdingsSourceUrl: string | null;
  sourceQuote: string | null;
  accessionNumber: string | null;
  filingUrl: string | null;
  date: string;
}

export async function GET() {
  const companies = allCompanies;
  const anchors: AnchorEntry[] = [];

  for (const company of companies) {
    const accession = company.accessionNumber || company.holdingsAccession;
    if (!accession && !company.holdingsSourceUrl) continue;

    const filingUrl = accession
      ? `/filings/${company.ticker.toLowerCase()}/${accession}`
      : null;

    anchors.push({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      holdings: company.holdings,
      holdingsSource: company.holdingsSource || null,
      holdingsSourceUrl: company.holdingsSourceUrl || null,
      sourceQuote: company.sourceQuote || null,
      accessionNumber: accession || null,
      filingUrl,
      date: company.holdingsLastUpdated || "",
    });
  }

  // Sort by date descending
  anchors.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ anchors });
}
