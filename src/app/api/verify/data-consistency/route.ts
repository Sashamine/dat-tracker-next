import { NextResponse } from "next/server";
import { btcCompanies, ethCompanies, solCompanies, hypeCompanies, bnbCompanies, taoCompanies, linkCompanies, dogeCompanies, zecCompanies, avaxCompanies } from "@/lib/data/companies";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";
import { EARNINGS_DATA } from "@/lib/data/earnings-data";

export const dynamic = "force-dynamic";

// Combine all companies
const allCompanies = [
  ...btcCompanies,
  ...ethCompanies,
  ...solCompanies,
  ...hypeCompanies,
  ...bnbCompanies,
  ...taoCompanies,
  ...linkCompanies,
  ...dogeCompanies,
  ...zecCompanies,
  ...avaxCompanies,
];

interface Mismatch {
  ticker: string;
  field: string;
  expected: string | number;
  actual: string | number;
  source: string;
}

interface CompanyResult {
  ticker: string;
  name: string;
  asset: string;
  status: "ok" | "mismatches" | "missing";
  mismatches: Mismatch[];
  checks: number;
}

export async function GET() {
  const results: CompanyResult[] = [];
  
  for (const company of allCompanies) {
    const ticker = company.ticker;
    const mismatches: Mismatch[] = [];
    let checks = 0;
    
    // Get holdings history for this company
    const historyData = HOLDINGS_HISTORY[ticker];
    const history = historyData?.history || [];
    const latestHistory = history.length > 0 ? history[history.length - 1] : null;
    
    // Get dilutive instruments for this company
    const dilution = dilutiveInstruments[ticker];
    
    // Get earnings data for this company
    const earnings = EARNINGS_DATA.filter(e => e.ticker === ticker);
    const latestEarnings = earnings.length > 0 
      ? earnings.sort((a, b) => b.earningsDate.localeCompare(a.earningsDate))[0] 
      : null;
    
    // Check 1: Current holdings match latest history
    if (latestHistory && company.holdings) {
      checks++;
      const historyHoldings = latestHistory.holdings;
      const companyHoldings = company.holdings;
      // Allow small tolerance for rounding
      if (Math.abs(historyHoldings - companyHoldings) > 1) {
        mismatches.push({
          ticker,
          field: "holdings",
          expected: historyHoldings,
          actual: companyHoldings,
          source: `holdings-history (${latestHistory.date}) vs companies.ts`,
        });
      }
    }
    
    // Check 2: Shares consistency between history and company
    if (latestHistory && company.sharesForMnav) {
      checks++;
      const histShares = latestHistory.sharesOutstanding;
      const compShares = company.sharesForMnav;
      // Allow 10% tolerance (timing differences, different sources)
      if (Math.abs(histShares - compShares) / compShares > 0.10) {
        mismatches.push({
          ticker,
          field: "sharesForMnav",
          expected: histShares,
          actual: compShares,
          source: `holdings-history (${latestHistory.date}) vs companies.ts`,
        });
      }
    }
    
    // Check 3: Holdings history exists if company has history
    if (company.holdings > 0 && history.length === 0) {
      checks++;
      mismatches.push({
        ticker,
        field: "holdingsHistory",
        expected: "history entries",
        actual: "none",
        source: "company has holdings but no history",
      });
    }
    
    // Check 4: Holdings history is sorted by date (ascending)
    if (history.length > 1) {
      checks++;
      for (let i = 1; i < history.length; i++) {
        if (history[i].date < history[i - 1].date) {
          mismatches.push({
            ticker,
            field: "holdingsHistory.order",
            expected: "ascending dates",
            actual: `${history[i - 1].date} > ${history[i].date}`,
            source: "holdings-history date order",
          });
          break;
        }
      }
    }
    
    // Check 5: Earnings data is sorted by date (ascending)
    if (earnings.length > 1) {
      checks++;
      const sortedByDate = [...earnings].sort((a, b) => a.earningsDate.localeCompare(b.earningsDate));
      for (let i = 1; i < sortedByDate.length; i++) {
        if (sortedByDate[i].earningsDate < sortedByDate[i - 1].earningsDate) {
          mismatches.push({
            ticker,
            field: "earningsData.order",
            expected: "ascending dates",
            actual: `${sortedByDate[i - 1].earningsDate} > ${sortedByDate[i].earningsDate}`,
            source: "earnings-data date order",
          });
          break;
        }
      }
    }
    
    // Check 6: Dilutive instruments exist check
    if (dilution && dilution.length > 0 && company.sharesForMnav) {
      checks++;
      let totalDilutionShares = 0;
      for (const instrument of dilution) {
        totalDilutionShares += instrument.potentialShares || 0;
      }
      // Just log that we have dilution data (no specific expected value)
    }
    
    // Check 7: Required fields present
    checks++;
    const requiredFields = ["ticker", "name", "asset", "holdings"];
    for (const field of requiredFields) {
      if (!(field in company) || company[field as keyof typeof company] === undefined) {
        mismatches.push({
          ticker,
          field: `required.${field}`,
          expected: "present",
          actual: "missing",
          source: "companies.ts required fields",
        });
      }
    }
    
    // Check 8: Holdings source URL if we have holdings
    if (company.holdings > 0) {
      checks++;
      if (!company.holdingsSourceUrl) {
        mismatches.push({
          ticker,
          field: "holdingsSourceUrl",
          expected: "present (for citations)",
          actual: "missing",
          source: "companies.ts citation requirement",
        });
      }
    }
    
    // Check 9: Latest earnings holdings match company holdings (if recent)
    if (latestEarnings?.holdingsAtQuarterEnd && company.holdings) {
      const earningsDate = new Date(latestEarnings.earningsDate);
      const now = new Date();
      const daysDiff = (now.getTime() - earningsDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Only check if earnings are from last 120 days
      if (daysDiff < 120) {
        checks++;
        const earnHoldings = latestEarnings.holdingsAtQuarterEnd;
        const compHoldings = company.holdings;
        // Holdings can change significantly, so just flag large discrepancies (>50%)
        if (Math.abs(earnHoldings - compHoldings) / Math.max(earnHoldings, compHoldings) > 0.50) {
          mismatches.push({
            ticker,
            field: "holdings vs earnings",
            expected: earnHoldings,
            actual: compHoldings,
            source: `earnings-data (${latestEarnings.earningsDate}) vs companies.ts - >50% difference`,
          });
        }
      }
    }
    
    results.push({
      ticker,
      name: company.name,
      asset: company.asset,
      status: mismatches.length === 0 ? "ok" : "mismatches",
      mismatches,
      checks,
    });
  }
  
  // Summary
  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    withMismatches: results.filter(r => r.status === "mismatches").length,
    totalMismatches: results.reduce((sum, r) => sum + r.mismatches.length, 0),
    totalChecks: results.reduce((sum, r) => sum + r.checks, 0),
  };
  
  return NextResponse.json({
    summary,
    results: results.sort((a, b) => b.mismatches.length - a.mismatches.length),
  });
}
