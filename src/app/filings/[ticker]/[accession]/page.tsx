import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import FilingViewer from "./FilingViewer";

interface PageProps {
  params: Promise<{
    ticker: string;
    accession: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
}

// Try to load filing content from local storage
async function getFilingContent(ticker: string, accession: string): Promise<{ content: string; source: string } | null> {
  const tickerLower = ticker.toLowerCase();
  const tickerUpper = ticker.toUpperCase();
  
  // Normalize accession (remove dashes for comparison)
  const accessionNoDashes = accession.replace(/-/g, "");
  const accessionWithDashes = accession.includes("-") 
    ? accession 
    : `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${accession.slice(12)}`;
  
  // Check multiple possible locations
  const possiblePaths = [
    // data/sec-content/[ticker]/[accession].txt
    path.join(process.cwd(), "data", "sec-content", tickerLower, `${accessionWithDashes}.txt`),
    path.join(process.cwd(), "data", "sec-content", tickerUpper, `${accessionWithDashes}.txt`),
    // public/sec/[ticker]/[type]/[form]-[date].html - would need manifest lookup
    // For now, try accession-based naming
    path.join(process.cwd(), "public", "sec", tickerLower, `${accessionWithDashes}.html`),
    path.join(process.cwd(), "public", "sec", tickerLower, `${accessionNoDashes}.html`),
  ];
  
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return { content, source: filePath };
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

export default async function FilingViewerPage({ params, searchParams }: PageProps) {
  const { ticker, accession } = await params;
  const { q: searchQuery } = await searchParams;
  
  const filing = await getFilingContent(ticker, accession);
  
  if (!filing) {
    // Could redirect to SEC as fallback, but for now show not found
    notFound();
  }
  
  return (
    <FilingViewer 
      ticker={ticker.toUpperCase()}
      accession={accession}
      content={filing.content}
      searchQuery={searchQuery}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { ticker, accession } = await params;
  return {
    title: `${ticker.toUpperCase()} Filing ${accession} | DAT Tracker`,
    description: `SEC filing ${accession} for ${ticker.toUpperCase()}`,
  };
}
