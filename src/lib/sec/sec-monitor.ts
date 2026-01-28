// SEC Filing Monitor Service
// Monitors SEC filings for all tracked companies and detects new filings

import { COMPANY_SOURCES, CompanyDataSources } from "../data/company-sources";
import { getFilingsBySymbol, getFilingsByCik, SECFiling, filter8KFilings, getDateRange } from "./fmp-sec-client";

export interface MonitoredCompany {
  ticker: string;
  name: string;
  secCik: string;
  exchange: string;
  lastChecked?: string;
  lastFilingDate?: string;
}

export interface FilingAlert {
  ticker: string;
  companyName: string;
  filing: SECFiling;
  isNew: boolean;
  relevance: "high" | "medium" | "low";
  reason: string;
}

// Get all companies with SEC CIKs that we can monitor
export function getMonitorableCompanies(): MonitoredCompany[] {
  return Object.values(COMPANY_SOURCES)
    .filter((c): c is CompanyDataSources & { secCik: string } => !!c.secCik)
    .map(c => ({
      ticker: c.ticker,
      name: c.name,
      secCik: c.secCik,
      exchange: c.exchange || "UNKNOWN",
    }));
}

// Check for new filings for a single company
export async function checkCompanyFilings(
  company: MonitoredCompany,
  lookbackDays = 7
): Promise<{ filings: SECFiling[]; alerts: FilingAlert[] }> {
  const { from, to } = getDateRange(lookbackDays);

  // Try by symbol first (faster, more reliable)
  let filings = await getFilingsBySymbol(company.ticker, from, to);

  // Fallback to CIK if symbol returns nothing (for new tickers)
  if (filings.length === 0 && company.secCik) {
    filings = await getFilingsByCik(company.secCik, from, to);
  }

  // Generate alerts for relevant filings
  const alerts: FilingAlert[] = filings.map(filing => ({
    ticker: company.ticker,
    companyName: company.name,
    filing,
    isNew: true, // Will be filtered by caller based on last-checked
    relevance: classifyFilingRelevance(filing.formType),
    reason: getFilingReason(filing.formType),
  }));

  return { filings, alerts };
}

// Classify how relevant a filing type is for holdings/shares data
function classifyFilingRelevance(formType: string): "high" | "medium" | "low" {
  // Include foreign private issuer forms (40-F = annual, 6-K = interim, 20-F = annual)
  const highRelevance = ["8-K", "10-Q", "10-K", "40-F", "6-K", "20-F"];
  const mediumRelevance = ["S-1", "S-3", "424B5", "DEF 14A", "DEF 14C"];

  if (highRelevance.includes(formType)) return "high";
  if (mediumRelevance.includes(formType)) return "medium";
  return "low";
}

// Get human-readable reason for why a filing type matters
function getFilingReason(formType: string): string {
  const reasons: Record<string, string> = {
    "8-K": "Material event - may contain holdings update, acquisitions, or corporate changes",
    "10-Q": "Quarterly report - contains shares outstanding, balance sheet, holdings",
    "10-K": "Annual report - contains full financial statements and share counts",
    "40-F": "Foreign private issuer annual report - Canadian company financials and share counts",
    "6-K": "Foreign private issuer interim report - may contain holdings updates, material events",
    "20-F": "Foreign private issuer annual report - international company financials",
    "S-1": "Registration statement - new share offerings",
    "S-3": "Shelf registration - potential dilution",
    "424B5": "Prospectus supplement - share offering details",
    "DEF 14A": "Proxy statement - share counts, executive compensation",
    "DEF 14C": "Information statement - corporate actions, share counts",
    "4": "Insider transaction - may indicate company activity",
    "3": "Initial ownership statement - new insider",
  };
  return reasons[formType] || `Filing type: ${formType}`;
}

// Monitor all companies and return alerts
export async function monitorAllCompanies(
  lookbackDays = 7,
  lastCheckedMap?: Map<string, string>
): Promise<{
  companies: number;
  totalFilings: number;
  newFilings: number;
  alerts: FilingAlert[];
  errors: string[];
}> {
  const companies = getMonitorableCompanies();
  const alerts: FilingAlert[] = [];
  const errors: string[] = [];
  let totalFilings = 0;
  let newFilings = 0;

  console.log(`[SEC Monitor] Checking ${companies.length} companies...`);

  // Process companies in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async company => {
        try {
          const result = await checkCompanyFilings(company, lookbackDays);
          return { company, result };
        } catch (error) {
          errors.push(`${company.ticker}: ${error instanceof Error ? error.message : String(error)}`);
          return { company, result: { filings: [], alerts: [] } };
        }
      })
    );

    for (const { company, result } of results) {
      totalFilings += result.filings.length;

      // Filter to only high/medium relevance
      const relevantAlerts = result.alerts.filter(a => a.relevance !== "low");

      // If we have a last-checked date, filter to new filings only
      if (lastCheckedMap) {
        const lastChecked = lastCheckedMap.get(company.ticker);
        if (lastChecked) {
          const lastCheckedDate = new Date(lastChecked);
          for (const alert of relevantAlerts) {
            const filingDate = new Date(alert.filing.filingDate);
            if (filingDate > lastCheckedDate) {
              alert.isNew = true;
              newFilings++;
              alerts.push(alert);
            }
          }
        } else {
          // No last-checked date, consider all as new
          newFilings += relevantAlerts.length;
          alerts.push(...relevantAlerts);
        }
      } else {
        // No tracking map provided, return all relevant alerts
        alerts.push(...relevantAlerts);
      }
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < companies.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`[SEC Monitor] Found ${totalFilings} total filings, ${newFilings} new, ${alerts.length} alerts`);

  return {
    companies: companies.length,
    totalFilings,
    newFilings,
    alerts,
    errors,
  };
}

// Get filings that likely contain holdings data (8-K with specific items)
export function filterHoldingsRelevantFilings(filings: SECFiling[]): SECFiling[] {
  // 8-K items that typically contain holdings/treasury data:
  // 2.01 - Completion of Acquisition/Disposition
  // 7.01 - Regulation FD Disclosure (often used for treasury updates)
  // 8.01 - Other Events (catch-all for material events)
  // We can't filter by item from FMP metadata, so we return all 8-Ks
  return filter8KFilings(filings);
}
