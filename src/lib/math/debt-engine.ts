import { DebtInstrument, Company } from "@/lib/types";
import { debtInstruments } from "@/lib/data/debt-instruments";

export interface DebtMaturityStats {
  ticker: string;
  totalFaceValue: number;
  annualInterestExpense: number;
  next24MonthsDebt: number;
  maturityConcentration: number; // % of total debt due in next 24 months
  liquidityCoverageRatio: number; // (Cash + Annual Yield) / (Next 24mo debt + Annual interest)
  refinancingRisk: "low" | "medium" | "high" | "critical";
  ladder: {
    year: number;
    amount: number;
    count: number;
    requiresCash: boolean; // True if OTM convertible or straight debt
  }[];
}

/**
 * Calculates debt maturity profiles and interest obligations.
 */
export function getDebtMaturity(
  company: Company, 
  stockPrice: number = 0,
  annualYieldUsd: number = 0
): DebtMaturityStats {
  const instruments = debtInstruments[company.ticker] || [];
  const now = new Date();
  const next24Months = new Date();
  next24Months.setMonth(now.getMonth() + 24);

  let totalFaceValue = 0;
  let annualInterestExpense = 0;
  let next24MonthsDebt = 0;
  
  const yearMap: Record<number, { amount: number; count: number; requiresCash: boolean }> = {};

  for (const inst of instruments) {
    totalFaceValue += inst.faceValue;
    annualInterestExpense += inst.faceValue * inst.couponRate;

    const maturity = new Date(inst.maturityDate);
    const year = maturity.getFullYear();

    // Determine if this specific instrument requires cash settlement
    // - Straight debt (bond, loan) always requires cash
    // - Convertibles require cash if OTM (stockPrice < strike)
    const isConvertible = inst.type === "convertible";
    const strike = (inst as any).conversionPrice || 0;
    const requiresCash = !isConvertible || (stockPrice > 0 && stockPrice < strike);

    if (maturity <= next24Months) {
      next24MonthsDebt += inst.faceValue;
    }

    if (!yearMap[year]) {
      yearMap[year] = { amount: 0, count: 0, requiresCash: false };
    }
    yearMap[year].amount += inst.faceValue;
    yearMap[year].count += 1;
    if (requiresCash) {
      yearMap[year].requiresCash = true;
    }
  }

  const ladder = Object.entries(yearMap)
    .map(([year, data]) => ({
      year: parseInt(year),
      amount: data.amount,
      count: data.count,
      requiresCash: data.requiresCash,
    }))
    .sort((a, b) => a.year - b.year);

  // Liquidity Coverage = (Liquid Cash + 2 years of yield) / (Debt due in 24 months + 2 years of interest)
  const liquidAssets = (company.cashReserves || 0) + (annualYieldUsd * 2);
  const totalObligations24mo = next24MonthsDebt + (annualInterestExpense * 2);
  const liquidityCoverageRatio = totalObligations24mo > 0 ? liquidAssets / totalObligations24mo : 100;

  // Refinancing Risk Logic
  let refinancingRisk: DebtMaturityStats["refinancingRisk"] = "low";
  if (next24MonthsDebt > 0) {
    if (liquidityCoverageRatio < 0.5) refinancingRisk = "critical";
    else if (liquidityCoverageRatio < 1.0) refinancingRisk = "high";
    else if (liquidityCoverageRatio < 2.0) refinancingRisk = "medium";
  }

  return {
    ticker: company.ticker,
    totalFaceValue,
    annualInterestExpense,
    next24MonthsDebt,
    maturityConcentration: totalFaceValue > 0 ? next24MonthsDebt / totalFaceValue : 0,
    liquidityCoverageRatio,
    refinancingRisk,
    ladder,
  };
}
