// Format helpers

export function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "—";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function formatTokenAmount(num: number | null | undefined, symbol: string): string {
  if (num === null || num === undefined) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M ${symbol}`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K ${symbol}`;
  return `${num.toLocaleString()} ${symbol}`;
}

// Precise token formatting - shows exact number with commas, no rounding
export function formatTokenAmountPrecise(num: number | null | undefined, symbol: string): string {
  if (num === null || num === undefined) return "—";
  return `${num.toLocaleString()} $${symbol}`;
}

export function formatPercent(num: number | null | undefined, includeSign = false): string {
  if (num === null || num === undefined) return "—";
  const sign = includeSign && num > 0 ? "+" : "";
  return `${sign}${(num * 100).toFixed(2)}%`;
}

export function formatMNAV(mnav: number | null | undefined): string {
  if (mnav === null || mnav === undefined || mnav === 0) return "—";
  return `${mnav.toFixed(2)}x`;
}
