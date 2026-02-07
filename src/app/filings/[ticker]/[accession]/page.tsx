import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    ticker: string;
    accession: string;
  }>;
}

// Map tickers to CIKs for SEC EDGAR redirect
const TICKER_CIKS: Record<string, string> = {
  mstr: "0001050446",
  mara: "0001507605",
  riot: "0001167419",
  clsk: "0001771485",
  btbt: "0001710350",
  kulr: "0001662684",
  fufu: "0001921158",
  naka: "0001946573",
  abtc: "0001755953",
  btcs: "0000827876",
  bmnr: "0001946573",
  game: "0001714562",
  fgnx: "0001591890",
  lits: "0001262104",
  dfdv: "0001805526",
  upxi: "0001903596",
  hsdt: "0001959534",
  tron: "0001956744",
  cwd: "0001627282",
  stke: "0001846839",
  sqns: "0001383395",
  twav: "0000746210",
};

export default async function FilingViewerPage({ params }: PageProps) {
  const { ticker, accession } = await params;
  
  const tickerLower = ticker.toLowerCase();
  const cik = TICKER_CIKS[tickerLower];
  
  if (!cik) {
    // Fallback to SEC EDGAR search
    redirect(`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=40`);
  }
  
  // Clean up accession number for SEC URL
  const accessionClean = accession.replace(/-/g, "");
  
  // Redirect to SEC EDGAR filing
  redirect(`https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accessionClean}/`);
}
