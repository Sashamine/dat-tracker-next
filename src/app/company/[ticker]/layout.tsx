import { Metadata } from "next";
import { allCompanies } from "@/lib/data/companies";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";

interface Props {
  params: Promise<{ ticker: string }>;
  children: React.ReactNode;
}

// Generate dynamic metadata with JSON-LD for each company
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticker } = await params;
  const company = allCompanies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  );

  if (!company) {
    return {
      title: "Company Not Found | DAT Tracker",
    };
  }

  const holdingsData = HOLDINGS_HISTORY[ticker.toUpperCase()];
  const latestHoldings = holdingsData?.history?.[holdingsData.history.length - 1];

  const title = `${company.name} (${company.ticker}) - ${company.asset} Treasury | DAT Tracker`;
  const description = `Track ${company.name}'s ${company.asset} treasury holdings, mNAV, dilution, and SEC filings. ${
    latestHoldings
      ? `Currently holds ${latestHoldings.holdings.toLocaleString()} ${company.asset}.`
      : ""
  }`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "DAT Tracker",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// JSON-LD structured data component
function CompanyJsonLd({ ticker }: { ticker: string }) {
  const company = allCompanies.find(
    (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
  );

  if (!company) return null;

  const holdingsData = HOLDINGS_HISTORY[ticker.toUpperCase()];
  const latestHoldings = holdingsData?.history?.[holdingsData.history.length - 1];

  // Build JSON-LD schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `https://datcap.co/company/${ticker}`,
    name: company.name,
    ticker: company.ticker,
    url: `https://datcap.co/company/${ticker}`,
    description: `${company.name} is a publicly traded company that holds ${company.asset} as a treasury asset.`,
    
    // Additional structured data
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Treasury Asset",
        value: company.asset,
      },
      ...(latestHoldings
        ? [
            {
              "@type": "PropertyValue",
              name: "Total Holdings",
              value: latestHoldings.holdings,
              unitText: company.asset,
            },
            {
              "@type": "PropertyValue",
              name: "Holdings Per Share",
              value: latestHoldings.holdingsPerShare,
            },
            {
              "@type": "PropertyValue",
              name: "Shares Outstanding (Diluted)",
              value: latestHoldings.sharesOutstandingDiluted,
            },
            {
              "@type": "PropertyValue",
              name: "Holdings Data Date",
              value: latestHoldings.date,
            },
          ]
        : []),
    ],

    // Link to related pages
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://datcap.co/company/${ticker}`,
    },

    // Dataset for time series
    ...(holdingsData?.history && holdingsData.history.length > 1
      ? {
          subjectOf: {
            "@type": "Dataset",
            name: `${company.name} Treasury Holdings History`,
            description: `Historical ${company.asset} holdings data for ${company.name}`,
            temporalCoverage: `${holdingsData.history[0].date}/${
              holdingsData.history[holdingsData.history.length - 1].date
            }`,
            variableMeasured: [
              {
                "@type": "PropertyValue",
                name: "Holdings",
                unitText: company.asset,
              },
              {
                "@type": "PropertyValue",
                name: "Shares Outstanding",
                unitText: "shares",
              },
            ],
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function CompanyLayout({ params, children }: Props) {
  const { ticker } = await params;

  return (
    <>
      <CompanyJsonLd ticker={ticker} />
      {children}
    </>
  );
}
