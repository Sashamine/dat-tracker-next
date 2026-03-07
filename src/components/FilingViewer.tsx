'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FilingViewerProps {
  ticker: string;
  accession: string;
  highlightQuote?: string;
  onClose?: () => void;
}

/**
 * Integrated Evidence Viewer.
 * Fetches and displays a preprocessed SEC document with highlighting and auto-scroll.
 */
export const FilingViewer: React.FC<FilingViewerProps> = ({ ticker, accession, highlightQuote, onClose }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFiling() {
      setLoading(true);
      setError(null);
      try {
        // In this prototype, we're assuming the file is accessible at this path.
        // In production, this would be a fetch to R2 or an API proxy.
        const response = await fetch(`/api/filings/${ticker.toLowerCase()}/${accession}`);
        if (!response.ok) throw new Error(`Filing not found: ${accession}`);
        const text = await response.text();
        setHtml(text);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (accession) loadFiling();
  }, [ticker, accession]);

  // Effect to handle scrolling to the highlight
  useEffect(() => {
    if (!loading && html && containerRef.current) {
      // Find the mark tag (injected by preprocessor)
      const mark = containerRef.current.querySelector('mark');
      if (mark) {
        setTimeout(() => {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [loading, html, highlightQuote]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
        <div>
          <h2 className="text-sm font-bold">{ticker.toUpperCase()} Filing</h2>
          <p className="text-xs text-gray-400 font-mono">{accession}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-[#fdfdfd] relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="p-8 text-center">
            <div className="inline-block p-3 bg-red-50 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Evidence Unavailable</h3>
            <p className="text-sm text-gray-500 mt-2">{error}</p>
            <p className="text-xs text-gray-400 mt-4 italic">Verification failed for this specific institutional document.</p>
          </div>
        )}

        {!loading && !error && html && (
          <div 
            ref={containerRef}
            className="sec-content-viewer"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Auth: SEC EDGAR Static Archive</span>
      </div>
    </div>
  );
};
