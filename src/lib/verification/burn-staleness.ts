/**
 * Burn Rate Staleness Checker
 * 
 * Checks all companies for stale burn rate data and flags those needing updates.
 * 
 * Staleness thresholds:
 * - US Domestic (10-Q filers): >6 months (quarterly filings expected)
 * - FPI (20-F/6-K filers): >12 months (annual/semi-annual filings)
 * 
 * Usage:
 *   import { getStaleCompanies, checkBurnStaleness } from './burn-staleness';
 *   
 *   // Get all companies with stale burn data
 *   const stale = await getStaleCompanies();
 *   
 *   // Check a specific company
 *   const result = checkBurnStaleness(company);
 */

import type { Company, FilingType } from '../types';
import { 
  btcCompanies, 
  ethCompanies, 
  solCompanies, 
  hypeCompanies, 
  bnbCompanies, 
  taoCompanies, 
  linkCompanies,
  trxCompanies,
  xrpCompanies,
  zecCompanies,
  ltcCompanies,
  suiCompanies,
  dogeCompanies,
  avaxCompanies,
  adaCompanies,
  hbarCompanies,
} from '../data/companies';

// Staleness thresholds in days
const US_STALENESS_DAYS = 180;   // 6 months for 10-Q filers
const FPI_STALENESS_DAYS = 365;  // 12 months for 20-F/6-K filers

export interface BurnStalenessResult {
  ticker: string;
  companyId: string;
  name: string;
  asset: string;
  
  // Current burn data
  currentBurn: number | undefined;
  burnAsOf: string | undefined;
  burnSource: string | undefined;
  
  // Staleness analysis
  isStale: boolean;
  daysSinceBurn: number | null;
  stalenessThreshold: number;
  filingType: FilingType | undefined;
  
  // Reason for staleness
  reason: 'no_burn_data' | 'no_burn_date' | 'threshold_exceeded' | 'fresh';
}

/**
 * Calculate days since a given date
 */
function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get staleness threshold for a company based on filing type
 */
function getStalenessThreshold(company: Company): number {
  // FPI companies file less frequently
  if (company.filingType === 'FPI') {
    return FPI_STALENESS_DAYS;
  }
  
  // Default to US domestic threshold
  return US_STALENESS_DAYS;
}

/**
 * Check burn rate staleness for a single company
 */
export function checkBurnStaleness(company: Company): BurnStalenessResult {
  const threshold = getStalenessThreshold(company);
  
  // No burn data at all
  if (company.quarterlyBurnUsd === undefined) {
    return {
      ticker: company.ticker,
      companyId: company.id,
      name: company.name,
      asset: company.asset,
      currentBurn: undefined,
      burnAsOf: undefined,
      burnSource: company.burnSource,
      isStale: true,
      daysSinceBurn: null,
      stalenessThreshold: threshold,
      filingType: company.filingType,
      reason: 'no_burn_data',
    };
  }
  
  // No burn date - consider stale since we can't verify freshness
  if (!company.burnAsOf) {
    return {
      ticker: company.ticker,
      companyId: company.id,
      name: company.name,
      asset: company.asset,
      currentBurn: company.quarterlyBurnUsd,
      burnAsOf: undefined,
      burnSource: company.burnSource,
      isStale: true,
      daysSinceBurn: null,
      stalenessThreshold: threshold,
      filingType: company.filingType,
      reason: 'no_burn_date',
    };
  }
  
  // Check if threshold exceeded
  const days = daysSince(company.burnAsOf);
  const isStale = days > threshold;
  
  return {
    ticker: company.ticker,
    companyId: company.id,
    name: company.name,
    asset: company.asset,
    currentBurn: company.quarterlyBurnUsd,
    burnAsOf: company.burnAsOf,
    burnSource: company.burnSource,
    isStale,
    daysSinceBurn: days,
    stalenessThreshold: threshold,
    filingType: company.filingType,
    reason: isStale ? 'threshold_exceeded' : 'fresh',
  };
}

/**
 * Get all companies with SEC CIKs (companies we can fetch XBRL data for)
 */
export function getSECCompanies(): Company[] {
  const allCompanies = [
    ...btcCompanies,
    ...ethCompanies,
    ...solCompanies,
    ...hypeCompanies,
    ...bnbCompanies,
    ...taoCompanies,
    ...linkCompanies,
    ...trxCompanies,
    ...xrpCompanies,
    ...zecCompanies,
    ...ltcCompanies,
    ...suiCompanies,
    ...dogeCompanies,
    ...avaxCompanies,
    ...adaCompanies,
    ...hbarCompanies,
  ];
  
  // Filter to companies with SEC CIKs
  return allCompanies.filter(c => c.secCik);
}

/**
 * Get all companies with stale burn rate data
 * 
 * Returns list of companies that need burn rate updates, sorted by staleness
 */
export function getStaleCompanies(): BurnStalenessResult[] {
  const companies = getSECCompanies();
  
  const results = companies.map(c => checkBurnStaleness(c));
  
  // Filter to only stale companies and sort by urgency
  // (no data > old data > recently stale)
  return results
    .filter(r => r.isStale)
    .sort((a, b) => {
      // No data first
      if (a.reason === 'no_burn_data' && b.reason !== 'no_burn_data') return -1;
      if (b.reason === 'no_burn_data' && a.reason !== 'no_burn_data') return 1;
      
      // No date second
      if (a.reason === 'no_burn_date' && b.reason !== 'no_burn_date') return -1;
      if (b.reason === 'no_burn_date' && a.reason !== 'no_burn_date') return 1;
      
      // Then by days since burn (most stale first)
      const aDays = a.daysSinceBurn ?? Infinity;
      const bDays = b.daysSinceBurn ?? Infinity;
      return bDays - aDays;
    });
}

/**
 * Get companies with fresh burn data
 */
export function getFreshCompanies(): BurnStalenessResult[] {
  const companies = getSECCompanies();
  
  return companies
    .map(c => checkBurnStaleness(c))
    .filter(r => !r.isStale);
}

/**
 * Get burn staleness summary for all SEC companies
 */
export interface BurnStalenessSummary {
  total: number;
  fresh: number;
  stale: number;
  noBurnData: number;
  noBurnDate: number;
  thresholdExceeded: number;
  
  // Breakdown by filing type
  usDomestic: {
    total: number;
    stale: number;
  };
  fpi: {
    total: number;
    stale: number;
  };
}

export function getBurnStalenessSummary(): BurnStalenessSummary {
  const companies = getSECCompanies();
  const results = companies.map(c => checkBurnStaleness(c));
  
  const usDomestic = results.filter(r => r.filingType !== 'FPI');
  const fpi = results.filter(r => r.filingType === 'FPI');
  
  return {
    total: results.length,
    fresh: results.filter(r => !r.isStale).length,
    stale: results.filter(r => r.isStale).length,
    noBurnData: results.filter(r => r.reason === 'no_burn_data').length,
    noBurnDate: results.filter(r => r.reason === 'no_burn_date').length,
    thresholdExceeded: results.filter(r => r.reason === 'threshold_exceeded').length,
    
    usDomestic: {
      total: usDomestic.length,
      stale: usDomestic.filter(r => r.isStale).length,
    },
    fpi: {
      total: fpi.length,
      stale: fpi.filter(r => r.isStale).length,
    },
  };
}

/**
 * Get tickers of companies needing burn rate updates
 */
export function getTickersNeedingBurnUpdate(): string[] {
  return getStaleCompanies().map(r => r.ticker);
}
