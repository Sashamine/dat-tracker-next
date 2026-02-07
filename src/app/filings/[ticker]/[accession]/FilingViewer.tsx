"use client";

import { useEffect, useRef, useState } from "react";

interface FilingViewerProps {
  ticker: string;
  accession: string;
  content: string;
  searchQuery?: string;
  anchor?: string; // Anchor text to find and highlight
}

// Map anchor IDs to search terms
const ANCHOR_KEYWORDS: Record<string, string[]> = {
  "btc-holdings": ["bitcoin", "btc", "digital assets"],
  "eth-holdings": ["ethereum", "eth", "ether"],
  "sol-holdings": ["solana", "sol"],
  "ltc-holdings": ["litecoin", "ltc"],
  "trx-holdings": ["tron", "trx"],
  "holdings": ["digital assets", "cryptocurrency", "holdings"],
  "staking": ["staking", "staked", "staking yield", "validator"],
  "crypto-holdings": ["digital assets", "cryptocurrency", "crypto"],
  "shares": ["shares outstanding", "common stock", "diluted shares"],
  "debt": ["convertible notes", "senior secured", "debt", "borrowings"],
  "operating-burn": ["operating expenses", "cash used in operating", "net cash used"],
  "operating-burn-mda": ["management's discussion", "liquidity", "operating activities"],
  "investors": ["investor", "shareholders", "stockholders"],
};

export default function FilingViewer({ ticker, accession, content, searchQuery, anchor }: FilingViewerProps) {
  // If anchor is provided, use its keywords as the search query
  const effectiveSearchQuery = searchQuery || (anchor ? ANCHOR_KEYWORDS[anchor]?.[0] : undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [processedContent, setProcessedContent] = useState(content);
  
  useEffect(() => {
    if (!effectiveSearchQuery || !contentRef.current) {
      setProcessedContent(content);
      setMatchCount(0);
      return;
    }
    
    // Escape special regex characters
    const escaped = effectiveSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Allow flexible whitespace matching
    const pattern = escaped.replace(/\s+/g, "\\s+");
    const regex = new RegExp(`(${pattern})`, "gi");
    
    // Count matches
    const matches = content.match(regex);
    setMatchCount(matches?.length || 0);
    
    if (matches && matches.length > 0) {
      // Highlight all matches with mark tags
      let matchIndex = 0;
      const highlighted = content.replace(regex, (match) => {
        const id = `match-${matchIndex++}`;
        return `<mark id="${id}" class="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded scroll-mt-24">${match}</mark>`;
      });
      setProcessedContent(highlighted);
      
      // Scroll to first match after render
      setTimeout(() => {
        const firstMatch = document.getElementById("match-0");
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
          setCurrentMatch(0);
        }
      }, 100);
    } else {
      setProcessedContent(content);
    }
  }, [content, effectiveSearchQuery]);
  
  const scrollToMatch = (index: number) => {
    const match = document.getElementById(`match-${index}`);
    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      setCurrentMatch(index);
    }
  };
  
  const nextMatch = () => {
    if (matchCount > 0) {
      const next = (currentMatch + 1) % matchCount;
      scrollToMatch(next);
    }
  };
  
  const prevMatch = () => {
    if (matchCount > 0) {
      const prev = (currentMatch - 1 + matchCount) % matchCount;
      scrollToMatch(prev);
    }
  };
  
  // Determine if content is HTML or plain text
  const isHtml = content.trim().startsWith("<") || content.includes("<html") || content.includes("<HTML");
  
  return (
    <div>
      {/* Search bar (if searching) */}
      {effectiveSearchQuery && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Search: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{effectiveSearchQuery}</code>
              {anchor && <span className="text-xs text-gray-500 ml-1">(from #{anchor})</span>}
            </span>
            {matchCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {matchCount} match{matchCount !== 1 ? "es" : ""}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMatch}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="Previous match"
                  >
                    ↑
                  </button>
                  <span className="text-gray-500 dark:text-gray-400 min-w-[3rem] text-center">
                    {currentMatch + 1}/{matchCount}
                  </span>
                  <button
                    onClick={nextMatch}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    title="Next match"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                No matches found
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div 
          ref={contentRef}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 overflow-auto"
        >
          {isHtml ? (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none filing-content"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          ) : (
            <pre 
              className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          )}
        </div>
      </div>
      
      {/* Styles for filing content */}
      <style jsx global>{`
        .filing-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
        }
        .filing-content td, .filing-content th {
          border: 1px solid #e5e7eb;
          padding: 0.5rem;
        }
        .filing-content th {
          background: #f9fafb;
        }
        .dark .filing-content td, .dark .filing-content th {
          border-color: #374151;
        }
        .dark .filing-content th {
          background: #1f2937;
        }
      `}</style>
    </div>
  );
}
