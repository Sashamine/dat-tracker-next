"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface FilingViewerProps {
  ticker: string;
  accession: string;
  content: string;
  searchQuery?: string;
}

export default function FilingViewer({ ticker, accession, content, searchQuery }: FilingViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [processedContent, setProcessedContent] = useState(content);
  
  useEffect(() => {
    if (!searchQuery || !contentRef.current) {
      setProcessedContent(content);
      setMatchCount(0);
      return;
    }
    
    // Escape special regex characters
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  }, [content, searchQuery]);
  
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Link 
                href={`/company/${ticker.toLowerCase()}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                ← {ticker}
              </Link>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filing: {accession}
              </h1>
            </div>
            
            {/* Search info bar */}
            {searchQuery && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Search: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{searchQuery}</code>
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
            )}
          </div>
        </div>
      </div>
      
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
