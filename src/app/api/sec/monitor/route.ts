// SEC Filing Monitor API Endpoint
// GET /api/sec/monitor - Check for new SEC filings for all tracked companies
// Query params:
//   days: number of days to look back (default 7)
//   ticker: optional single ticker to check

import { NextResponse } from "next/server";
import { monitorAllCompanies, checkCompanyFilings, getMonitorableCompanies, FilingAlert } from "@/lib/sec/sec-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for full scan

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  const ticker = searchParams.get("ticker");
  const relevanceFilter = searchParams.get("relevance") || "all"; // all, high, medium

  try {
    if (ticker) {
      // Check single company
      const companies = getMonitorableCompanies();
      const company = companies.find(c => c.ticker.toUpperCase() === ticker.toUpperCase());

      if (!company) {
        return NextResponse.json({
          error: `Company ${ticker} not found or has no SEC CIK configured`,
          availableCompanies: companies.map(c => c.ticker),
        }, { status: 404 });
      }

      const result = await checkCompanyFilings(company, days);

      // Apply relevance filter
      let filteredAlerts = result.alerts;
      if (relevanceFilter === "high") {
        filteredAlerts = result.alerts.filter(a => a.relevance === "high");
      } else if (relevanceFilter === "medium") {
        filteredAlerts = result.alerts.filter(a => a.relevance === "high" || a.relevance === "medium");
      }

      return NextResponse.json({
        ticker: company.ticker,
        name: company.name,
        secCik: company.secCik,
        lookbackDays: days,
        filingCount: result.filings.length,
        alertCount: filteredAlerts.length,
        filings: result.filings,
        alerts: filteredAlerts,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Full scan of all companies
      const result = await monitorAllCompanies(days);

      // Apply relevance filter
      let filteredAlerts = result.alerts;
      if (relevanceFilter === "high") {
        filteredAlerts = result.alerts.filter(a => a.relevance === "high");
      } else if (relevanceFilter === "medium") {
        filteredAlerts = result.alerts.filter(a => a.relevance === "high" || a.relevance === "medium");
      }

      // Group alerts by company
      const alertsByCompany: Record<string, FilingAlert[]> = {};
      for (const alert of filteredAlerts) {
        if (!alertsByCompany[alert.ticker]) {
          alertsByCompany[alert.ticker] = [];
        }
        alertsByCompany[alert.ticker].push(alert);
      }

      return NextResponse.json({
        summary: {
          companiesChecked: result.companies,
          totalFilings: result.totalFilings,
          newFilings: result.newFilings,
          alertCount: filteredAlerts.length,
          companiesWithAlerts: Object.keys(alertsByCompany).length,
        },
        lookbackDays: days,
        relevanceFilter,
        alertsByCompany,
        errors: result.errors.length > 0 ? result.errors : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[SEC Monitor] Error:", error);
    return NextResponse.json({
      error: "Failed to monitor SEC filings",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
