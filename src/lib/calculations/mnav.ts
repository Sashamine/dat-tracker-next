// Calculate Net Asset Value (treasury value)
// Includes crypto holdings + cash reserves + other investments
export function calculateNAV(
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0
): number {
  return holdings * assetPrice + cashReserves + otherInvestments;
}

// Calculate NAV per share (equity value per share, net of liabilities)
export function calculateNAVPerShare(
  holdings: number,
  assetPrice: number,
  sharesOutstanding: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null;
  const grossNav = calculateNAV(holdings, assetPrice, cashReserves, otherInvestments);
  const equityNav = grossNav - totalDebt - preferredEquity;
  return equityNav / sharesOutstanding;
}

// Calculate mNAV (Enterprise Value / Crypto NAV)
// otherInvestments (equity stakes, etc.) reduce EV rather than inflating NAV.
// This keeps mNAV focused on "what premium am I paying for the crypto wrapper?"
// rather than being distorted by non-crypto assets (e.g. BTBT's $528M WhiteFiber).
export function calculateMNAV(
  marketCap: number,
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  restrictedCash: number = 0,
  secondaryCryptoValue: number = 0
): number | null {
  const baseCryptoNav = holdings * assetPrice + secondaryCryptoValue;
  if (!baseCryptoNav || baseCryptoNav <= 0) return null;

  const totalNav = baseCryptoNav + restrictedCash;

  const freeCash = cashReserves - restrictedCash;
  const enterpriseValue = marketCap + totalDebt + preferredEquity - freeCash - otherInvestments;

  return enterpriseValue / totalNav;
}

/** Extended mNAV result */
export interface MNAVResult {
  mNAV: number;
  cryptoNav: number;
  totalNav: number;
  enterpriseValue: number;
  otherInvestmentsIncluded: number;
}

export function calculateMNAVExtended(
  marketCap: number,
  holdings: number,
  assetPrice: number,
  cashReserves: number = 0,
  otherInvestments: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  restrictedCash: number = 0,
  secondaryCryptoValue: number = 0
): MNAVResult | null {
  const baseCryptoNav = holdings * assetPrice + secondaryCryptoValue;
  if (!baseCryptoNav || baseCryptoNav <= 0) return null;

  const totalNav = baseCryptoNav + restrictedCash;

  const freeCash = cashReserves - restrictedCash;
  const enterpriseValue = marketCap + totalDebt + preferredEquity - freeCash - otherInvestments;

  return {
    mNAV: enterpriseValue / totalNav,
    cryptoNav: baseCryptoNav,
    totalNav,
    enterpriseValue,
    otherInvestmentsIncluded: otherInvestments,
  };
}

// Calculate mNAV 24h change percentage
export function calculateMNAVChange(
  stockChange24h: number | undefined,
  cryptoChange24h: number | undefined,
  marketCap: number = 0,
  totalDebt: number = 0,
  preferredEquity: number = 0,
  cashReserves: number = 0
): number | null {
  if (stockChange24h === undefined || cryptoChange24h === undefined) return null;

  const stockChangeDec = stockChange24h / 100;
  const cryptoChangeDec = cryptoChange24h / 100;

  const ev = marketCap + totalDebt + preferredEquity - cashReserves;
  const alpha = ev > 0 ? marketCap / ev : 1;

  if (1 + cryptoChangeDec <= 0) return null;

  return ((1 + alpha * stockChangeDec) / (1 + cryptoChangeDec) - 1) * 100;
}

// Calculate NAV discount/premium
export function calculateNAVDiscount(stockPrice: number, navPerShare: number | null): number | null {
  if (!navPerShare || navPerShare <= 0) return null;
  return (stockPrice - navPerShare) / navPerShare;
}

// Calculate holdings per share
export function calculateHoldingsPerShare(
  holdings: number,
  sharesOutstanding: number
): number | null {
  if (!sharesOutstanding || sharesOutstanding <= 0) return null;
  return holdings / sharesOutstanding;
}
