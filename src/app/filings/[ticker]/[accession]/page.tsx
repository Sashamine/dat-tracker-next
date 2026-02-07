import FilingViewerClient from "./FilingViewerClient";

interface PageProps {
  params: Promise<{
    ticker: string;
    accession: string;
  }>;
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function FilingViewerPage({ params, searchParams }: PageProps) {
  const { ticker, accession } = await params;
  const { q: searchQuery } = await searchParams;
  
  return (
    <FilingViewerClient 
      ticker={ticker.toUpperCase()}
      accession={accession}
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
