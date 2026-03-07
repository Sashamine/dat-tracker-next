import { Company } from "@/lib/types";
import { getDebtMaturity, DebtMaturityStats } from "@/lib/math/debt-engine";
import { calculateStakingYield, StakingYieldResult } from "@/lib/math/yield-engine";
import { dilutiveInstruments } from "@/lib/data/dilutive-instruments";
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
    nonConvertibleDebt: number;
    unmodeledConvertibleDebt: number;
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
  
  // 1. Fetch D1 history for provenance log (graceful if tables missing)
  const [holdingsHistory, debtHistory, cashHistory, sharesHistory] = await Promise.all([
    getMetricHistory(ticker, 'holdings_native', { limit: 10 }).catch(() => []),
    getMetricHistory(ticker, 'debt_usd', { limit: 1 }).catch(() => []),
    getMetricHistory(ticker, 'cash_usd', { limit: 1 }).catch(() => []),
    getMetricHistory(ticker, 'basic_shares', { limit: 1 }).catch(() => []),
  ]);

  // 2. Fetch Adoption Timeline (graceful if table missing)
  let events: any[] = [];
  try {
    const eventsOut = await d1.query(
      `SELECT * FROM corporate_adoption_events WHERE ticker = ? ORDER BY event_date DESC`,
      [ticker.toUpperCase()]
    );
    events = (eventsOut.results as any[]) || [];
  } catch {
    // Table may not exist yet
  }

  // 3. Calculate Financials
  const debtStats = getDebtMaturity(company, prices.stocks[ticker]?.price || 0);
  const stakingStats = calculateStakingYield(company, prices);
  
  const cryptoPrice = prices.crypto[company.asset]?.price || 0;
  const holdingsUsd = company.holdings * cryptoPrice;
  
  // Classify unmodeled debt: non-convertible (no dilution risk) vs missing convertible data
  const dilutiveInsts = dilutiveInstruments[company.ticker] || [];
  const convertibles = dilutiveInsts.filter(i => i.type === 'convertible');
  const convertibleFaceValue = convertibles.reduce((sum, i) => sum + (i.faceValue || 0), 0);
  const convertiblesMissingFaceValue = convertibles.filter(i => !i.faceValue);
  // Total modeled = debt instruments (for ladder) + dilutive convertible faceValues (may overlap)
  const totalModeledDebt = Math.max(debtStats.totalFaceValue, convertibleFaceValue);
  const unmodeledDebtAmount = Math.max(0, (company.totalDebt || 0) - totalModeledDebt);
  // If there are convertibles missing faceValue, some of the gap might be unmodeled convertible debt
  const unmodeledConvertibleDebt = convertiblesMissingFaceValue.length > 0
    ? unmodeledDebtAmount  // Conservative: attribute gap to missing convertible data
    : 0;
  const nonConvertibleDebt = unmodeledDebtAmount - unmodeledConvertibleDebt;
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
      unmodeledDebtAmount,
      nonConvertibleDebt,
      unmodeledConvertibleDebt,
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
      "DEBT CLASSIFICATION: Debt is classified as convertible (dilution risk, modeled as instruments) or non-convertible (credit facilities, secured loans, DeFi positions — no dilution risk). Gaps between total reported debt and modeled instruments are categorized accordingly.",
      "SOLVENCY: Self-Sustaining status is based on gross network yield vs. (Opex Burn + Debt Interest + Preferred Dividends). It does not account for corporate tax."
    ]
  };
}
