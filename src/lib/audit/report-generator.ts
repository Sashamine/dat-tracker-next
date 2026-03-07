import { Company } from "@/lib/types";
import { getDebtMaturity, DebtMaturityStats } from "@/lib/math/debt-engine";
import { calculateStakingYield, StakingYieldResult } from "@/lib/math/yield-engine";
import { D1Client, getMetricHistory } from "@/lib/d1";
import crypto from 'node:crypto';

export interface AuditReportData {
  reportId: string;
  ticker: string;
  name: string;
  generatedAt: string;
  priceReferenceTime: string;
  summary: {
    holdings: number;
    asset: string;
    holdingsUsd: number;
    mnav: number | null;
    annualYieldUsd: number;
    totalObligationsUsd: number;
    isSelfSustaining: boolean;
    yieldCoverageRatio: number;
  };
  provenance: {
    metric: string;
    value: number;
    unit: string;
    asOf: string | null;
    sourceUrl: string | null;
    confidence: number | null;
    trustLabel: string; // Institutional, Company, or Community
    method: string | null;
  }[];
  debtLadder: DebtMaturityStats & {
    unmodeledDebtAmount: number;
  };
  staking: StakingYieldResult;
  timeline: {
    date: string;
    type: string;
    description: string;
    significance: number;
    sourceUrl: string | null;
  }[];
  caveats: string[];
}

function getTrustLabel(confidence: number | null): string {
  if (confidence === null) return "Unverified";
  if (confidence >= 0.90) return "Institutional Verified";
  if (confidence >= 0.70) return "Company Reported";
  return "Community Verified / Estimated";
}

/**
 * Aggregates all data for a comprehensive audit report.
 */
export async function generateAuditReportData(
  ticker: string,
  company: Company,
  prices: { crypto: Record<string, { price: number }>; stocks: Record<string, { price: number }> }
): Promise<AuditReportData> {
  const d1 = D1Client.fromEnv();
  
  // 1. Fetch D1 history for provenance log
  const holdingsHistory = await getMetricHistory(ticker, 'holdings_native', { limit: 10 });
  const debtHistory = await getMetricHistory(ticker, 'debt_usd', { limit: 1 });
  const cashHistory = await getMetricHistory(ticker, 'cash_usd', { limit: 1 });
  const sharesHistory = await getMetricHistory(ticker, 'basic_shares', { limit: 1 });

  // 2. Fetch Adoption Timeline
  const eventsOut = await d1.query(
    `SELECT * FROM corporate_adoption_events WHERE ticker = ? ORDER BY event_date DESC`,
    [ticker.toUpperCase()]
  );
  const events = (eventsOut.results as any[]) || [];

  // 3. Calculate Financials
  const debtStats = getDebtMaturity(company, prices.stocks[ticker]?.price || 0);
  const stakingStats = calculateStakingYield(company, prices);
  
  const cryptoPrice = prices.crypto[company.asset]?.price || 0;
  const holdingsUsd = company.holdings * cryptoPrice;
  
  const unmodeledDebtAmount = Math.max(0, (company.totalDebt || 0) - debtStats.totalFaceValue);
  const totalAnnualObligations = (company.quarterlyBurnUsd || 0) * 4 + (company.debtInterestAnnual || 0) + (company.preferredDividendAnnual || 0);

  // 4. Aggregate Provenance Log
  const provenanceLog = [
    ...holdingsHistory.map(h => ({
      metric: 'holdings_native',
      value: h.value,
      unit: h.unit,
      asOf: h.as_of,
      sourceUrl: h.artifact?.source_url || null,
      confidence: h.confidence,
      trustLabel: getTrustLabel(h.confidence),
      method: h.method
    })),
    ...debtHistory.map(h => ({
      metric: 'debt_usd',
      value: h.value,
      unit: 'USD',
      asOf: h.as_of,
      sourceUrl: h.artifact?.source_url || null,
      confidence: h.confidence,
      trustLabel: getTrustLabel(h.confidence),
      method: h.method
    })),
    ...cashHistory.map(h => ({
      metric: 'cash_usd',
      value: h.value,
      unit: 'USD',
      asOf: h.as_of,
      sourceUrl: h.artifact?.source_url || null,
      confidence: h.confidence,
      trustLabel: getTrustLabel(h.confidence),
      method: h.method
    })),
    ...sharesHistory.map(h => ({
      metric: 'basic_shares',
      value: h.value,
      unit: 'shares',
      asOf: h.as_of,
      sourceUrl: h.artifact?.source_url || null,
      confidence: h.confidence,
      trustLabel: getTrustLabel(h.confidence),
      method: h.method
    }))
  ].sort((a, b) => (b.asOf || '').localeCompare(a.asOf || ''));

  return {
    reportId: crypto.randomUUID(),
    ticker: company.ticker,
    name: company.name,
    generatedAt: new Date().toISOString(),
    priceReferenceTime: new Date().toISOString(),
    summary: {
      holdings: company.holdings,
      asset: company.asset,
      holdingsUsd,
      mnav: null, 
      annualYieldUsd: stakingStats.annualRevenueUsd,
      totalObligationsUsd: totalAnnualObligations,
      isSelfSustaining: stakingStats.isSelfSustaining,
      yieldCoverageRatio: stakingStats.yieldToBurnRatio
    },
    provenance: provenanceLog,
    debtLadder: {
      ...debtStats,
      unmodeledDebtAmount
    },
    staking: stakingStats,
    timeline: events.map(e => ({
      date: e.event_date,
      type: e.event_type,
      description: e.description,
      significance: e.significance,
      sourceUrl: e.source_url
    })),
    caveats: [
      "DATA LOCKING: This report is a point-in-time snapshot. Market values reflect prices at the reference time.",
      "FX DISCLOSURE: All non-USD balance sheet items are converted at historical point-in-time FX rates. Real-time market cap uses live forex rates.",
      "UNMODELED DEBT: Discrepancies between total reported debt and modeled instruments are flagged. Unmodeled debt may carry unknown interest rates.",
      "SOLVENCY: Self-Sustaining status is based on gross network yield vs. (Opex Burn + Debt Interest + Preferred Dividends). It does not account for corporate tax."
    ]
  };
}
