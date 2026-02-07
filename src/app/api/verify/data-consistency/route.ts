import { NextResponse } from "next/server";
import { companies } from "@/lib/data/companies";
import { holdingsHistory } from "@/lib/data/holdings-history";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";
import { earningsData } from "@/lib/data/earnings-data";

export const dynamic = "force-dynamic";

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
  status: "ok" | "mismatches" | "missing";
  mismatches: Mismatch[];
  checks: number;
}

export async function GET() {
  const results: CompanyResult[] = [];
  
  for (const company of companies) {
    const ticker = company.ticker;
    const mismatches: Mismatch[] = [];
    let checks = 0;
    
    // Get holdings history for this company
    const history = holdingsHistory[ticker] || [];
    const latestHistory = history.length > 0 ? history[history.length - 1] : null;
    
    // Get dilutive instruments for this company
    const dilution = dilutiveInstruments[ticker];
    
    // Get earnings data for this company
    const earnings = earningsData[ticker];
    const latestEarnings = earnings && earnings.length > 0 ? earnings[earnings.length - 1] : null;
    
    // Check 1: Current holdings match latest history
    if (latestHistory && company.holdings) {
      for (const [asset, amount] of Object.entries(company.holdings)) {
        checks++;
        const historyAmount = latestHistory.holdings[asset];
        if (historyAmount !== undefined && Math.abs(historyAmount - amount) > 0.01) {
          mismatches.push({
            ticker,
            field: `holdings.${asset}`,
            expected: historyAmount,
            actual: amount,
            source: `holdings-history (${latestHistory.date}) vs companies.ts`,
          });
        }
      }
    }
    
    // Check 2: Shares outstanding consistency
    if (company.sharesOutstanding) {
      // Check against latest history
      if (latestHistory?.sharesOutstanding) {
        checks++;
        const histShares = latestHistory.sharesOutstanding;
        const compShares = company.sharesOutstanding;
        // Allow 5% tolerance for timing differences
        if (Math.abs(histShares - compShares) / compShares > 0.05) {
          mismatches.push({
            ticker,
            field: "sharesOutstanding",
            expected: histShares,
            actual: compShares,
            source: `holdings-history (${latestHistory.date}) vs companies.ts`,
          });
        }
      }
      
      // Check against latest earnings
      if (latestEarnings?.sharesOutstanding) {
        checks++;
        const earnShares = latestEarnings.sharesOutstanding;
        const compShares = company.sharesOutstanding;
        // Allow 10% tolerance (earnings may be older)
        if (Math.abs(earnShares - compShares) / compShares > 0.10) {
          mismatches.push({
            ticker,
            field: "sharesOutstanding",
            expected: earnShares,
            actual: compShares,
            source: `earnings-data (${latestEarnings.period}) vs companies.ts`,
          });
        }
      }
    }
    
    // Check 3: Dilutive instruments total matches company.fullyDilutedShares calculation
    if (dilution && company.sharesOutstanding) {
      checks++;
      let totalDilution = 0;
      
      if (dilution.warrants) {
        for (const w of dilution.warrants) {
          if (w.status === "outstanding") {
            totalDilution += w.shares;
          }
        }
      }
      if (dilution.options) {
        for (const o of dilution.options) {
          if (o.status === "outstanding") {
            totalDilution += o.shares;
          }
        }
      }
      if (dilution.convertibles) {
        for (const c of dilution.convertibles) {
          if (c.status === "outstanding") {
            totalDilution += c.sharesIfConverted;
          }
        }
      }
      
      const calculatedFD = company.sharesOutstanding + totalDilution;
      
      // Check if company has fullyDilutedShares and compare
      if (company.fullyDilutedShares) {
        const diff = Math.abs(calculatedFD - company.fullyDilutedShares);
        // Allow 2% tolerance
        if (diff / company.fullyDilutedShares > 0.02) {
          mismatches.push({
            ticker,
            field: "fullyDilutedShares",
            expected: calculatedFD,
            actual: company.fullyDilutedShares,
            source: "dilutive-instruments calculation vs companies.ts",
          });
        }
      }
    }
    
    // Check 4: Holdings history is sorted by date
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
    
    // Check 5: Earnings data is sorted by period
    if (earnings && earnings.length > 1) {
      checks++;
      for (let i = 1; i < earnings.length; i++) {
        if (earnings[i].period < earnings[i - 1].period) {
          mismatches.push({
            ticker,
            field: "earningsData.order",
            expected: "ascending periods",
            actual: `${earnings[i - 1].period} > ${earnings[i].period}`,
            source: "earnings-data period order",
          });
          break;
        }
      }
    }
    
    // Check 6: Asset type consistency
    if (company.holdings && company.primaryAsset) {
      checks++;
      const primaryAsset = company.primaryAsset;
      if (!company.holdings[primaryAsset] && company.holdings[primaryAsset] !== 0) {
        mismatches.push({
          ticker,
          field: "primaryAsset",
          expected: `holdings should include ${primaryAsset}`,
          actual: Object.keys(company.holdings).join(", "),
          source: "companies.ts primaryAsset vs holdings",
        });
      }
    }
    
    results.push({
      ticker,
      name: company.name,
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
