"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuditReportData } from "@/lib/audit/report-generator";
import { formatLargeNumber, formatMNAV, formatPercent } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import { FileText, Download, ArrowLeft, ShieldCheck, Clock, ExternalLink } from "lucide-react";

export default function AuditReportPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params?.ticker as string;
  const [data, setData] = useState<AuditReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticker) return;

    async function fetchReport() {
      try {
        const res = await fetch(`/api/company/${ticker}/audit-report`);
        const json = await res.json();
        if (json.success) {
          setData(json.report);
        }
      } catch (err) {
        console.error("Failed to fetch audit report:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Generating Audit Report...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-red-600 font-bold">
        Report Generation Failed
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      {/* Control Bar - Hidden on Print */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft size={16} /> Back to Company
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all font-bold text-sm"
        >
          <Download size={16} /> Save as PDF
        </button>
      </div>

      {/* Main Report Container */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 print:shadow-none print:border-none print:m-0">
        
        {/* Header Section */}
        <div className="p-8 border-b-4 border-blue-600 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-blue-600" size={24} />
                <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tighter uppercase">
                  Institutional Audit Report
                </h1>
              </div>
              <p className="text-gray-500 text-sm uppercase font-bold tracking-widest flex items-center gap-2">
                DAT Tracker Verified Provenance 
                {data.summary.isSelfSustaining && (
                  <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[10px] lowercase font-normal border border-green-100">
                    ✨ self-sustaining
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-blue-600">{data.ticker}</p>
              <p className="text-xs text-gray-400 font-mono">ID: {data.reportId.substring(0, 8)}</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Certified Holdings</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {data.summary.holdings.toLocaleString()} {data.summary.asset}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Treasury Value</p>
              <p className="text-lg font-bold text-green-600">
                {formatLargeNumber(data.summary.holdingsUsd)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Annual Yield</p>
              <p className="text-lg font-bold text-indigo-600">
                {formatLargeNumber(data.summary.annualYieldUsd)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Yield Coverage</p>
              <p className={cn(
                "text-lg font-bold",
                data.summary.isSelfSustaining ? "text-green-600" : "text-amber-600"
              )}>
                {data.summary.yieldCoverageRatio.toFixed(1)}x
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-10">
          
          {/* Section: Verified Provenance Log */}
          <section>
            <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2 mb-4 flex items-center gap-2">
              <Clock size={16} /> Verified Provenance Log
            </h2>
            <div className="overflow-hidden border border-gray-100 dark:border-gray-800 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">As Of</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Metric</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Value</th>
                    <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Trust Tier</th>
                    <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.provenance.map((p, i) => (
                    <tr key={i} className="text-xs">
                      <td className="px-4 py-2 font-mono text-gray-600 dark:text-gray-400">{p.asOf || 'N/A'}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{p.metric}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatLargeNumber(p.value)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded font-bold text-[9px] uppercase",
                          p.trustLabel === "Institutional Verified" ? "bg-green-100 text-green-700" :
                          p.trustLabel === "Company Reported" ? "bg-blue-100 text-blue-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {p.trustLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {p.sourceUrl ? (
                          <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                            Link <ExternalLink size={8} />
                          </a>
                        ) : 'Verified Archive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section: Debt Maturity & Liquidity */}
          <section>
            <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">
              Debt Maturity &amp; Liquidity
            </h2>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {data.debtLadder.ladder.map((l) => (
                <div key={l.year} className="p-3 border border-gray-100 dark:border-gray-800 rounded-lg text-center">
                  <p className="text-[10px] text-gray-400 font-bold mb-1">{l.year}</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(l.amount)}</p>
                  {l.requiresCash && (
                    <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded font-bold">CASH SETTLEMENT</span>
                  )}
                </div>
              ))}
            </div>
            {data.debtLadder.unmodeledDebtAmount > 0 && (
              <div className="space-y-2">
                {data.debtLadder.nonConvertibleDebt > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg text-xs text-blue-700 dark:text-blue-300 font-medium">
                    NON-CONVERTIBLE DEBT: {formatLargeNumber(data.debtLadder.nonConvertibleDebt)} in credit facilities, secured loans, or other non-convertible obligations. No dilution risk.
                  </div>
                )}
                {data.debtLadder.unmodeledConvertibleDebt > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-lg text-xs text-amber-700 dark:text-amber-300 font-medium">
                    UNMODELED CONVERTIBLE DEBT: {formatLargeNumber(data.debtLadder.unmodeledConvertibleDebt)} in convertible instruments missing face value data. Dilution may be undermodeled.
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section: Adoption Journey */}
          <section>
            <h2 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">
              Historical Adoption Journey
            </h2>
            <div className="space-y-4">
              {data.timeline.slice(0, 8).map((event, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-20 shrink-0 font-mono text-[10px] text-gray-400 pt-1">
                    {event.date}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{event.description}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Significance Tier: {event.significance}/5</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Disclosure & Caveats */}
          <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-100 dark:border-gray-800">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Important Disclosures & Methodology</h2>
            <ul className="list-disc pl-4 space-y-1">
              {data.caveats.map((c, i) => (
                <li key={i} className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed italic">{c}</li>
              ))}
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[10px] text-gray-400 font-mono">
          <div>
            REPORT ID: {crypto.randomUUID().substring(0, 8).toUpperCase()}-{data.ticker}
          </div>
          <div className="text-right">
            GENERATED: {new Date(data.generatedAt).toLocaleString()} • DAT-TRACKER.COM
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .min-h-screen { padding: 0 !important; }
          @page { size: auto; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
