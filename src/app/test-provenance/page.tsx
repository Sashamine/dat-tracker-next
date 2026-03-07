'use client';

import React, { useState } from 'react';
import { AuditTrail } from '@/components/AuditTrail';
import { FilingViewer } from '@/components/FilingViewer';
import { BMNR_PROVENANCE } from '@/lib/data/provenance/bmnr';

export default function TestProvenancePage() {
  const [activeFiling, setActiveFiling] = useState<{ticker: string, acc: string, quote?: string} | null>(null);

  const handleSelectFiling = (acc: string, quote?: string) => {
    setActiveFiling({
      ticker: 'BMNR',
      acc,
      quote
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Pane: Data & Audit Trail */}
      <div className={`flex-1 flex flex-col overflow-auto p-8 transition-all duration-300 ${activeFiling ? 'max-w-[40%]' : 'max-w-full'}`}>
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Institutional Proof Prototype</h1>
          <p className="text-gray-500 mt-2">Demonstrating derived provenance and integrated filing viewer.</p>
        </header>

        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-mono">1</div>
              Quoted Value Example (Holdings)
            </h2>
            {BMNR_PROVENANCE.holdings && (
              <AuditTrail 
                label="Total ETH Holdings" 
                provenance={BMNR_PROVENANCE.holdings} 
                onSelectFiling={handleSelectFiling}
              />
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-mono">2</div>
              Derived Value Example (Cost Basis)
            </h2>
            {BMNR_PROVENANCE.costBasisAvg && (
              <AuditTrail 
                label="Average ETH Cost Basis" 
                provenance={BMNR_PROVENANCE.costBasisAvg} 
                onSelectFiling={handleSelectFiling}
              />
            )}
          </section>
        </div>

        {!activeFiling && (
          <div className="mt-12 p-6 border-2 border-dashed border-gray-300 rounded-xl text-center">
            <p className="text-gray-500 font-medium italic">Click "View Filing" above to open the Evidence Sidecar.</p>
          </div>
        )}
      </div>

      {/* Right Pane: Evidence Sidecar */}
      {activeFiling && (
        <div className="w-[60%] h-full animate-in slide-in-from-right duration-500">
          <FilingViewer 
            ticker={activeFiling.ticker}
            accession={activeFiling.acc}
            highlightQuote={activeFiling.quote}
            onClose={() => setActiveFiling(null)}
          />
        </div>
      )}
    </div>
  );
}
