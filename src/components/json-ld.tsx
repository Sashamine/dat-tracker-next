/**
 * JSON-LD Structured Data Components
 * 
 * These components inject schema.org structured data into pages
 * to improve SEO and help search engines understand the content.
 */

import { allCompanies } from "@/lib/data/companies";

// Site-wide organization schema
export function SiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://datcap.co/#website",
    name: "DAT Tracker",
    alternateName: "Digital Asset Treasury Tracker",
    url: "https://datcap.co",
    description:
      "Real-time tracking of public companies holding cryptocurrency as treasury assets. Track mNAV, holdings, dilution, and SEC filings.",
    publisher: {
      "@type": "Organization",
      name: "DATCAP",
      url: "https://datcap.co",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://datcap.co/?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Dataset schema for the entire collection
export function DatasetJsonLd() {
  const btcCompanies = allCompanies.filter((c) => c.asset === "BTC");
  const ethCompanies = allCompanies.filter((c) => c.asset === "ETH");
  const otherCompanies = allCompanies.filter(
    (c) => !["BTC", "ETH"].includes(c.asset)
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": "https://datcap.co/#dataset",
    name: "Digital Asset Treasury Companies Database",
    description: `Comprehensive database of ${allCompanies.length} public companies holding cryptocurrency as treasury assets, including ${btcCompanies.length} Bitcoin treasury companies, ${ethCompanies.length} Ethereum treasury companies, and ${otherCompanies.length} companies holding other digital assets.`,
    url: "https://datcap.co",
    keywords: [
      "bitcoin treasury",
      "corporate bitcoin",
      "crypto treasury",
      "mNAV",
      "digital asset companies",
      "MSTR",
      "MicroStrategy",
      "bitcoin holdings",
      "treasury management",
    ],
    creator: {
      "@type": "Organization",
      name: "DATCAP",
      url: "https://datcap.co",
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "text/html",
      contentUrl: "https://datcap.co",
    },
    variableMeasured: [
      {
        "@type": "PropertyValue",
        name: "Holdings",
        description: "Total cryptocurrency held by the company",
      },
      {
        "@type": "PropertyValue",
        name: "mNAV",
        description:
          "Market cap to Net Asset Value ratio - shows premium/discount to holdings",
      },
      {
        "@type": "PropertyValue",
        name: "Holdings Per Share",
        description: "Cryptocurrency exposure per share owned",
      },
      {
        "@type": "PropertyValue",
        name: "Dilution Rate",
        description: "Share issuance rate between filing periods",
      },
    ],
    includedInDataCatalog: {
      "@type": "DataCatalog",
      name: "Digital Asset Treasury Data",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// FAQ schema for common questions
export function FAQJsonLd() {
  const faqs = [
    {
      question: "What is mNAV?",
      answer:
        "mNAV (market NAV) is the ratio of a company's market capitalization to its crypto net asset value. An mNAV of 2.0x means the company trades at twice the value of its crypto holdings.",
    },
    {
      question: "What is a Bitcoin treasury company?",
      answer:
        "A Bitcoin treasury company is a publicly traded company that holds Bitcoin as a significant portion of its treasury assets, rather than traditional cash reserves.",
    },
    {
      question: "What is Holdings Per Share?",
      answer:
        "Holdings Per Share shows how much cryptocurrency you're exposed to for each share you own. It's calculated by dividing total holdings by diluted shares outstanding.",
    },
    {
      question: "What does dilution mean for treasury companies?",
      answer:
        "Dilution occurs when companies issue new shares to fund Bitcoin purchases. While holdings may increase, holdings per share may decrease if shares grow faster than crypto accumulation.",
    },
    {
      question: "How is DAT Tracker different from other crypto trackers?",
      answer:
        "DAT Tracker focuses specifically on publicly traded companies with crypto treasuries, providing mNAV analysis, dilution tracking, SEC filing integration, and holdings history that general crypto trackers don't offer.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Breadcrumb schema generator
export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Article/Analysis schema for mNAV page
export function AnalysisJsonLd({
  title,
  description,
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: description,
    author: {
      "@type": "Organization",
      name: "DATCAP",
      url: "https://datcap.co",
    },
    publisher: {
      "@type": "Organization",
      name: "DATCAP",
      url: "https://datcap.co",
    },
    datePublished: datePublished || new Date().toISOString().split("T")[0],
    dateModified: dateModified || new Date().toISOString().split("T")[0],
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": "https://datcap.co/mnav",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
