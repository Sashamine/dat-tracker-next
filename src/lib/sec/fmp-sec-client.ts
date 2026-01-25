// FMP SEC Filings API Client
// Fetches SEC filing metadata from Financial Modeling Prep

const FMP_API_KEY = process.env.FMP_API_KEY || "";
const FMP_BASE_URL = "https://financialmodelingprep.com";

export interface SECFiling {
  symbol: string;
  cik: string;
  filingDate: string;
  acceptedDate: string;
  formType: string;
  link: string;      // Index page URL
  finalLink: string; // Direct document URL
}

export interface FilingSearchParams {
  symbol?: string;
  cik?: string;
  formType?: string;
  from: string;  // YYYY-MM-DD
  to: string;    // YYYY-MM-DD
  limit?: number;
  page?: number;
}

// Fetch filings by symbol
export async function getFilingsBySymbol(
  symbol: string,
  from: string,
  to: string,
  limit = 50
): Promise<SECFiling[]> {
  if (!FMP_API_KEY) {
    console.error("[FMP SEC] API key not configured");
    return [];
  }

  try {
    const url = `${FMP_BASE_URL}/stable/sec-filings-search/symbol?symbol=${symbol}&from=${from}&to=${to}&limit=${limit}&apikey=${FMP_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[FMP SEC] API error for ${symbol}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[FMP SEC] Error fetching filings for ${symbol}:`, error);
    return [];
  }
}

// Fetch filings by CIK (useful for companies FMP doesn't have by symbol)
export async function getFilingsByCik(
  cik: string,
  from: string,
  to: string,
  limit = 50
): Promise<SECFiling[]> {
  if (!FMP_API_KEY) {
    console.error("[FMP SEC] API key not configured");
    return [];
  }

  // Pad CIK to 10 digits
  const paddedCik = cik.padStart(10, "0");

  try {
    const url = `${FMP_BASE_URL}/stable/sec-filings-search/cik?cik=${paddedCik}&from=${from}&to=${to}&limit=${limit}&apikey=${FMP_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[FMP SEC] API error for CIK ${cik}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[FMP SEC] Error fetching filings for CIK ${cik}:`, error);
    return [];
  }
}

// Get latest 8-K filings across all companies
export async function getLatest8KFilings(
  from: string,
  to: string,
  limit = 100
): Promise<SECFiling[]> {
  if (!FMP_API_KEY) {
    console.error("[FMP SEC] API key not configured");
    return [];
  }

  try {
    const url = `${FMP_BASE_URL}/stable/sec-filings-8k?from=${from}&to=${to}&limit=${limit}&apikey=${FMP_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[FMP SEC] API error for 8-K feed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[FMP SEC] Error fetching 8-K feed:`, error);
    return [];
  }
}

// Filter filings to only 8-K (material events)
export function filter8KFilings(filings: SECFiling[]): SECFiling[] {
  return filings.filter(f => f.formType === "8-K");
}

// Filter filings to 10-Q/10-K (quarterly/annual reports)
export function filterFinancialReports(filings: SECFiling[]): SECFiling[] {
  return filings.filter(f => f.formType === "10-Q" || f.formType === "10-K");
}

// Get date range for last N days
export function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}
