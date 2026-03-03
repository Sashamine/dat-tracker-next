import type { HoldingsBasis } from "@/lib/d1-overlay";

const STYLE: Record<HoldingsBasis, string> = {
  native_units:    "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  usd_fair_value:  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  static_fallback: "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20",
};

const LABEL: Record<HoldingsBasis, string> = {
  native_units:    "D1 native",
  usd_fair_value:  "D1 USD÷price",
  static_fallback: "static",
};

const TITLE: Record<HoldingsBasis, string> = {
  native_units:    "Holdings count sourced from D1 SEC filings (native crypto units)",
  usd_fair_value:  "Holdings derived from D1 USD fair value divided by live price",
  static_fallback: "Holdings from static data (companies.ts) — no D1 data available",
};

/**
 * Tiny pill showing how a company's holdings were resolved.
 * Reads `(company as any)._holdingsBasis` set by applyD1Overlay.
 */
export function HoldingsBasisBadge({ basis }: { basis?: HoldingsBasis }) {
  if (!basis) return null;
  return (
    <span
      className={`inline-flex items-center text-[9px] leading-tight font-medium px-1 py-px rounded border cursor-help ${STYLE[basis]}`}
      title={TITLE[basis]}
    >
      {LABEL[basis]}
    </span>
  );
}
