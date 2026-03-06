'use client';

import React, { useState } from 'react';
import { ProvenanceValue, DerivedSource, DocumentSource } from '@/lib/data/types/provenance';

interface AuditTrailProps {
  label: string;
  provenance: ProvenanceValue<any>;
  onSelectFiling: (accession: string, quote?: string) => void;
}

/**
 * Renders the "Math Audit" for a derived value or a direct proof for a quoted value.
 */
export const AuditTrail: React.FC<AuditTrailProps> = ({ label, provenance, onSelectFiling }) => {
  const [expandedInputs, setExpandedInputs] = useState<Record<string, boolean>>({});

  const toggleInput = (key: string) => {
    setExpandedInputs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSource = (source: any, val: any) => {
    if (source.type === 'sec-document') {
      const sec = source as DocumentSource;
      return (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">SEC {sec.filingType} Proof</span>
              <p className="text-sm font-medium text-gray-900 mt-1">"{sec.quote}"</p>
              <p className="text-xs text-gray-500 mt-1 italic">Filed: {sec.filingDate} • Accession: {sec.accession}</p>
            </div>
            <button 
              onClick={() => sec.accession && onSelectFiling(sec.accession, sec.quote)}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              View Filing
            </button>
          </div>
        </div>
      );
    }

    if (source.type === 'derived') {
      const derived = source as DerivedSource;
      return (
        <div className="mt-2 pl-4 border-l-2 border-gray-200">
          <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Calculation</span>
            <div className="font-mono text-sm font-bold text-gray-800 mt-1 bg-white p-2 rounded border border-gray-200">
              {derived.formula} = {typeof val === 'number' ? val.toLocaleString() : val}
            </div>
            <p className="text-xs text-gray-600 mt-2">{derived.derivation}</p>
            
            <div className="mt-3 space-y-2">
              {Object.entries(derived.inputs).map(([key, input]) => (
                <div key={key} className="border-t border-gray-100 pt-2">
                  <button 
                    onClick={() => toggleInput(key)}
                    className="flex items-center text-xs font-medium text-gray-700 hover:text-blue-600"
                  >
                    <span className="mr-1">{expandedInputs[key] ? '▼' : '▶'}</span>
                    {key}: <span className="ml-1 font-mono">{typeof input.value === 'number' ? input.value.toLocaleString() : input.value}</span>
                  </button>
                  {expandedInputs[key] && (
                    <div className="mt-1">
                      {renderSource(input.source, input.value)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 text-xs text-gray-500 italic">
        Source: {source.type} (UI implementation pending)
      </div>
    );
  };

  return (
    <div className="audit-trail p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3">
        Institutional Evidence: {label}
      </h3>
      {renderSource(provenance.source, provenance.value)}
      {provenance.notes && (
        <p className="mt-3 text-xs text-gray-500 bg-yellow-50 p-2 rounded">
          <strong>Note:</strong> {provenance.notes}
        </p>
      )}
    </div>
  );
};
