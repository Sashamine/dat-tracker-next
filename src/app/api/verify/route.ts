import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";

interface VerificationResult {
  ticker: string;
  name: string;
  asset: string;
  holdings: number;
  holdingsLastUpdated: string | null;
  holdingsSource: string | null;
  holdingsSourceUrl: string | null;
  sourceQuote: string | null;
  accessionNumber: string | null;
  filingUrl: string | null;
  historyEntries: number;
  latestHistoryDate: string | null;
  historyHoldingsMatch: boolean | null;
  status: "verified" | "quoted" | "sourced" | "unsourced";
}

export async function GET() {
  const companies = allCompanies;
  const results: VerificationResult[] = [];

  for (const company of companies) {
    // Build filing URL from accession number
    const accession = company.accessionNumber || company.holdingsAccession;
    const filingUrl = accession
      ? `/filings/${company.ticker.toLowerCase()}/${accession}`
      : null;

    // Check holdings history
    const historyData = HOLDINGS_HISTORY[company.ticker];
    const history = historyData?.history || [];
    const latestHistory = history.length > 0 ? history[history.length - 1] : null;
    const historyHoldingsMatch = latestHistory
      ? Math.abs(latestHistory.holdings - company.holdings) / Math.max(company.holdings, 1) < 0.01
      : null;

    // Determine verification status
    let status: VerificationResult["status"];
    if (company.sourceQuote && company.holdingsSourceUrl) {
      status = "verified"; // Has quote + source URL
    } else if (company.sourceQuote) {
      status = "quoted"; // Has quote but no URL
    } else if (company.holdingsSourceUrl) {
      status = "sourced"; // Has URL but no quote
    } else {
      status = "unsourced"; // Neither
    }

    results.push({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      holdings: company.holdings,
      holdingsLastUpdated: company.holdingsLastUpdated || null,
      holdingsSource: company.holdingsSource || null,
      holdingsSourceUrl: company.holdingsSourceUrl || null,
      sourceQuote: company.sourceQuote || null,
      accessionNumber: accession || null,
      filingUrl,
      historyEntries: history.length,
      latestHistoryDate: latestHistory?.date || null,
      historyHoldingsMatch,
      status,
    });
  }

  // Sort: unsourced first, then quoted, then sourced, then verified
  const statusOrder = { unsourced: 0, sourced: 1, quoted: 2, verified: 3 };
  results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const stats = {
    total: results.length,
    verified: results.filter((r) => r.status === "verified").length,
    quoted: results.filter((r) => r.status === "quoted").length,
    sourced: results.filter((r) => r.status === "sourced").length,
    unsourced: results.filter((r) => r.status === "unsourced").length,
    historyMismatches: results.filter((r) => r.historyHoldingsMatch === false).length,
  };

  return NextResponse.json({ results, stats });
}
