"use client";

import { ProvenanceMetric } from "./ProvenanceMetric";
import { MSTR_PROVENANCE } from "@/lib/data/provenance/mstr";

/**
 * MSTR-specific provenance section
 * Shows key financial metrics with full source tracking
 */
export function MSTRProvenanceSection() {
  return (
    <details className="mb-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group">
      <summary className="p-4 cursor-pointer flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            📊 Verified Financial Data
          </h2>
          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
            Click any value for source
          </span>
        </div>
        <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      
      <div className="px-4 pb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Every value below is sourced from SEC filings (XBRL data or document text). 
          Click any number to see its exact source and verify it yourself.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* BTC Holdings */}
          {MSTR_PROVENANCE.holdings && (
            <ProvenanceMetric
              label="BTC Holdings"
              data={MSTR_PROVENANCE.holdings}
              format="btc"
              subLabel="From SEC 8-K"
              tooltip="Total bitcoin held by the company"
            />
          )}
          
          {/* Holdings Value */}
          {MSTR_PROVENANCE.holdingsValue && (
            <ProvenanceMetric
              label="Holdings Value"
              data={MSTR_PROVENANCE.holdingsValue}
              format="currency"
              subLabel="Book value (XBRL)"
              tooltip="Value of BTC on balance sheet"
            />
          )}
          
          {/* Cost Basis */}
          {MSTR_PROVENANCE.costBasisAvg && (
            <ProvenanceMetric
              label="Avg Cost Basis"
              data={MSTR_PROVENANCE.costBasisAvg}
              format="currency"
              subLabel="Per BTC"
              tooltip="Average purchase price per bitcoin"
            />
          )}
          
          {/* Total Cost Basis */}
          {MSTR_PROVENANCE.totalCostBasis && (
            <ProvenanceMetric
              label="Total Cost Basis"
              data={MSTR_PROVENANCE.totalCostBasis}
              format="currency"
              subLabel="All BTC purchases"
              tooltip="Total amount spent acquiring bitcoin"
            />
          )}
          
          {/* Quarterly Burn */}
          {MSTR_PROVENANCE.quarterlyBurn && (
            <ProvenanceMetric
              label="Quarterly Burn"
              data={MSTR_PROVENANCE.quarterlyBurn}
              format="currency"
              subLabel="Operating expenses"
              tooltip="Cash used in operations per quarter"
            />
          )}
          
          {/* Shares Outstanding */}
          {MSTR_PROVENANCE.sharesOutstanding && (
            <ProvenanceMetric
              label="Shares Outstanding"
              data={MSTR_PROVENANCE.sharesOutstanding}
              format="shares"
              subLabel="Basic shares"
              tooltip="Common shares outstanding"
            />
          )}
          
          {/* Total Debt */}
          {MSTR_PROVENANCE.totalDebt && (
            <ProvenanceMetric
              label="Total Debt"
              data={MSTR_PROVENANCE.totalDebt}
              format="currency"
              subLabel="Convertible notes"
              tooltip="Long-term debt obligations"
            />
          )}
          
          {/* Cash Reserves */}
          {MSTR_PROVENANCE.cashReserves && (
            <ProvenanceMetric
              label="Cash Reserves"
              data={MSTR_PROVENANCE.cashReserves}
              format="currency"
              subLabel="USD Reserve"
              tooltip="Cash held for dividends/interest"
            />
          )}
          
          {/* Preferred Equity */}
          {MSTR_PROVENANCE.preferredEquity && (
            <ProvenanceMetric
              label="Preferred Equity"
              data={MSTR_PROVENANCE.preferredEquity}
              format="currency"
              subLabel="STRF/STRC/etc"
              tooltip="Perpetual preferred stock issued"
            />
          )}
        </div>
        
        {/* Data freshness note */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-500 dark:text-gray-400">
          <strong>Data Sources:</strong> SEC EDGAR XBRL (10-Q, 10-K) and 8-K filings. 
          Some values are derived (e.g., quarterly burn = YTD ÷ quarters). 
          Click any value to see the exact source and calculation.
        </div>
      </div>
    </details>
  );
}
