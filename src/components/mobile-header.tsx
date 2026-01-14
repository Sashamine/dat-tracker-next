"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CRYPTO_ICONS, ALL_ASSETS } from "@/components/app-sidebar";

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  className?: string;
}

export function MobileHeader({ title = "DAT Tracker", showBack = false, className }: MobileHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <header className={cn("lg:hidden sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800", className)}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {showBack ? (
              <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
              </Link>
            )}
            <h1 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-14 w-72 h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-6">
              {/* Quick Links */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Quick Links
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    All Companies
                  </Link>
                  <Link
                    href="/verify"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  >
                    Verify Holdings
                  </Link>
                </div>
              </div>

              {/* Assets */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Assets
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_ASSETS.map((asset) => (
                    <Link
                      key={asset}
                      href={`/asset/${asset.toLowerCase()}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {CRYPTO_ICONS[asset] && (
                        <img src={CRYPTO_ICONS[asset]} alt={asset} className="w-8 h-8 rounded-full" />
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">{asset}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
