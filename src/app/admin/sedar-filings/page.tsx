"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Upload,
  FileText,
  FolderOpen
} from "lucide-react";

interface ExpectedFiling {
  ticker: string;
  companyName: string;
  filingType: string;
  periodEnd: string;
  expectedBy: string;
  status: "pending" | "overdue" | "filed";
  sedarProfileNumber: string;
  sedarSearchUrl: string;
}

interface Company {
  ticker: string;
  localTicker: string;
  name: string;
  sedarProfileNumber: string;
  exchange: string;
  asset: string;
}

const STATUS_STYLES = {
  overdue: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    border: "border-red-500",
    icon: AlertTriangle,
  },
  pending: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-300",
    border: "border-yellow-500",
    icon: Clock,
  },
  filed: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    border: "border-green-500",
    icon: CheckCircle,
  },
};

function FilingCard({ filing }: { filing: ExpectedFiling }) {
  const style = STATUS_STYLES[filing.status];
  const StatusIcon = style.icon;

  const uploadPath = `data/sedar-content/${filing.ticker.toLowerCase()}/${filing.filingType.toLowerCase().replace(/\s+/g, "-")}-${filing.periodEnd.replace(/-/g, "")}.pdf`;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 border-l-4 ${style.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/company/${filing.ticker}`}
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {filing.ticker}
            </Link>
            <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${style.bg} ${style.text}`}>
              <StatusIcon className="w-3 h-3" />
              {filing.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filing.companyName}</p>
        </div>
        <a
          href={filing.sedarSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open SEDAR+
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Filing Type:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{filing.filingType}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Period End:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{filing.periodEnd}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Expected By:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{filing.expectedBy}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Profile #:</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{filing.sedarProfileNumber}</p>
        </div>
      </div>

      {/* Upload Instructions */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Upload className="w-4 h-4" />
          After downloading, save to:
        </div>
        <code className="block bg-gray-200 dark:bg-gray-700 rounded px-3 py-2 text-xs text-gray-800 dark:text-gray-200 font-mono break-all">
          {uploadPath}
        </code>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Then update <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">holdings-history.ts</code> with extracted data
        </p>
      </div>
    </div>
  );
}

function CompanyQuickLinks({ companies }: { companies: Company[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <FolderOpen className="w-5 h-5" />
        SEDAR+ Quick Links
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {companies.map((company) => (
          <a
            key={company.ticker}
            href={`https://www.sedarplus.ca/csa-party/records/searchRecords.html?_=profile&profile=${company.sedarProfileNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{company.ticker}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {company.localTicker} · {company.asset}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function SedarFilingsPage() {
  const [filings, setFilings] = useState<ExpectedFiling[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/cron/sedar-check?manual=true");
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch SEDAR data");
        }

        setFilings(data.expectedFilings || []);
        setCompanies(data.companies || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const overdue = filings.filter((f) => f.status === "overdue");
  const pending = filings.filter((f) => f.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MobileHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              Home
            </Link>
            <span>/</span>
            <span>Admin</span>
            <span>/</span>
            <span>SEDAR+ Filings</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            SEDAR+ Filing Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and process Canadian regulatory filings for IHLDF, XTAIF, and LUXFF.
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm">
            <Link href="/admin/data-health" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Data Health
            </Link>
            <span className="text-gray-300 dark:text-gray-700">•</span>
            <Link href="/admin/corporate-actions" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Corporate Actions
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{overdue.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pending.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Companies</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{companies.length || 3}</p>
          </div>
        </div>

        {/* Quick Links */}
        {companies.length > 0 && <CompanyQuickLinks companies={companies} />}

        {/* Filings List */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Expected Filings
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 dark:text-gray-400 mt-4">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          ) : filings.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No expected filings at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {overdue.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                    🚨 Overdue ({overdue.length})
                  </h3>
                  {overdue.map((filing, i) => (
                    <FilingCard key={`overdue-${i}`} filing={filing} />
                  ))}
                </>
              )}

              {pending.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide mt-6">
                    ⏰ Pending ({pending.length})
                  </h3>
                  {pending.map((filing, i) => (
                    <FilingCard key={`pending-${i}`} filing={filing} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            How to Process a Filing
          </h2>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 space-y-3">
            <p><strong>1.</strong> Click &quot;Open SEDAR+&quot; to go to the company&apos;s filing search</p>
            <p><strong>2.</strong> Find the relevant filing (Interim/Annual Financial Statements)</p>
            <p><strong>3.</strong> Download the PDF and save it to the path shown on the card</p>
            <p><strong>4.</strong> Open the PDF and extract:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Holdings amount (look for &quot;Digital Assets&quot; or crypto name in balance sheet)</li>
              <li>Shares outstanding (look in Notes to Financial Statements)</li>
            </ul>
            <p><strong>5.</strong> Update <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">src/lib/data/holdings-history.ts</code></p>
            <p><strong>6.</strong> Commit and push to trigger Vercel deploy</p>
          </div>
        </div>
      </main>
    </div>
  );
}
