// @ts-nocheck
"use client";

import {
  FWDI_PROVENANCE,
  FWDI_CIK,
  FWDI_BALANCE_SHEET,
  FWDI_INCOME_STATEMENT,
  FWDI_STAKING,
  FWDI_CAPITAL,
} from "@/lib/data/provenance/fwdi";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { formatLargeNumber } from "@/lib/calculations";

import { CompanyViewBase, type CompanyViewBaseConfig } from "./CompanyViewBase";

function su(p: any) {
  return p?.source ? getSourceUrl(p.source) : undefined;
}
function st(p: any) {
  return p?.source?.type;
}
function sd(p: any) {
  return p?.source ? getSourceDate(p.source) : undefined;
}
function ss(p: any) {
  return (p?.source as any)?.searchTerm;
}

interface Props {
  company: Company;
  className?: string;
}

export function FWDICompanyView({ company, className = "" }: Props) {
  const config: CompanyViewBaseConfig = {
    ticker: "FWDI",
    // Note: FWDI is SOL; base currently supports BTC|ETH only, but view previously passed SOL to cards.
    // Keep it as BTC for base asset typing while still using SOL pricing in buildMetrics and cards.
    // @ts-ignore
    asset: "BTC",
    cik: FWDI_CIK,
    provenance: FWDI_PROVENANCE,
    provenanceHelpers: {
      sourceUrl: su,
      sourceType: st,
      sourceDate: sd,
      searchTerm: ss,
    },

    scheduledEventsProps: ({ ticker, stockPrice }) => ({ ticker, stockPrice }),

    buildMetrics: ({ company, prices, marketCap }) => {
      if (!FWDI_PROVENANCE.holdings || !FWDI_PROVENANCE.totalDebt || !FWDI_PROVENANCE.cashReserves) return null;

      const solPrice = prices?.crypto?.SOL?.price || 0;

      const holdings = FWDI_PROVENANCE.holdings.value;
      const totalDebt = FWDI_PROVENANCE.totalDebt.value;
      const cashReserves = FWDI_PROVENANCE.cashReserves.value;
      const preferredEquity = FWDI_PROVENANCE.preferredEquity?.value || 0;
      const sharesOutstanding = FWDI_PROVENANCE.sharesOutstanding?.value || company.sharesForMnav || 0;

      const cryptoNav = holdings * solPrice;
      const netDebt = Math.max(0, totalDebt - cashReserves);
      const ev = marketCap + totalDebt + preferredEquity - cashReserves;
      const mNav = cryptoNav > 0 ? ev / cryptoNav : null;
      const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
      const equityNav = cryptoNav + cashReserves - totalDebt - preferredEquity;
      const equityNavPerShare = sharesOutstanding > 0 ? equityNav / sharesOutstanding : 0;
      const holdingsPerShare = sharesOutstanding > 0 ? holdings / sharesOutstanding : 0;

      const cryptoNavPv: ProvenanceValue<number> = pv(
        cryptoNav,
        derivedSource({
          derivation: "SOL Holdings × SOL Price",
          formula: "holdings × solPrice",
          inputs: { holdings: FWDI_PROVENANCE.holdings },
        }),
        `Using live SOL price: $${solPrice.toLocaleString()}`
      );

      const mNavPv =
        mNav !== null
          ? pv(
              mNav,
              derivedSource({
                derivation: "Enterprise Value ÷ Crypto NAV",
                formula: "(marketCap + debt + preferred - cash) / cryptoNav",
                inputs: {
                  debt: FWDI_PROVENANCE.totalDebt,
                  cash: FWDI_PROVENANCE.cashReserves,
                  holdings: FWDI_PROVENANCE.holdings,
                },
              }),
              `Debt: ${formatLargeNumber(totalDebt)}`
            )
          : null;

      const leveragePv = pv(
        leverage,
        derivedSource({
          derivation: "Net Debt ÷ Crypto NAV",
          formula: "max(0, debt - cash) / cryptoNav",
          inputs: {
            debt: FWDI_PROVENANCE.totalDebt,
            cash: FWDI_PROVENANCE.cashReserves,
            holdings: FWDI_PROVENANCE.holdings,
          },
        }),
        `Net Debt: ${formatLargeNumber(netDebt)}`
      );

      const equityNavPv = pv(
        equityNav,
        derivedSource({
          derivation: "Crypto NAV + Cash − Debt − Preferred",
          formula: "cryptoNav + cash - debt - preferred",
          inputs: {
            holdings: FWDI_PROVENANCE.holdings,
            cash: FWDI_PROVENANCE.cashReserves,
            debt: FWDI_PROVENANCE.totalDebt,
          },
        }),
        `Debt-free company`
      );

      const equityNavPerSharePv = pv(
        equityNavPerShare,
        derivedSource({
          derivation: "Equity NAV ÷ Shares Outstanding",
          formula: "equityNav / shares",
          inputs: {
            holdings: FWDI_PROVENANCE.holdings,
            shares: FWDI_PROVENANCE.sharesOutstanding!,
            debt: FWDI_PROVENANCE.totalDebt,
            cash: FWDI_PROVENANCE.cashReserves,
          },
        }),
        `${(sharesOutstanding / 1e6).toFixed(1)}M shares`
      );

      return {
        holdings,
        cryptoNav,
        netDebt,
        totalDebt,
        cashReserves,
        preferredEquity,
        sharesOutstanding,
        holdingsPerShare,
        mNav,
        leverage,
        equityNav,
        equityNavPerShare,
        cryptoNavPv,
        mNavPv,
        leveragePv,
        equityNavPv,
        equityNavPerSharePv,
      } as any;
    },

    stalenessDates: ({ company }) => [company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf],

    renderStrategyAndOverview: () => {
      const holdings = FWDI_PROVENANCE.holdings?.value || 0;
      return (
        <details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
          <summary className="p-6 cursor-pointer flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
            <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 mb-6">
              <a href="https://www.forwardindustries.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Website</a>
              <a href="https://x.com/FWDI_io" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">Twitter</a>
              <a
                href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${FWDI_CIK}&type=&dateb=&owner=include&count=40`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                SEC Filings
              </a>
            </div>

            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">◎ SOL Treasury Company</h4>
              <ul className="text-sm text-purple-600 dark:text-purple-300 space-y-1">
                <li>• <strong>World's largest SOL treasury company</strong> — pivoted from design/accessories in Sep 2025</li>
                <li>
                  • Galaxy Digital, Jump Crypto, Multicoin Capital backed —{" "}
                  <a href="https://www.sec.gov/Archives/edgar/data/38264/000168316825006734/forward_8k.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">$1.65B PIPE closed Sep 11, 2025</a>
                </li>
                <li>
                  • <strong>{holdings.toLocaleString()} SOL-equivalent</strong> accumulated —{" "}
                  <a href="https://forwardindustries.com/sol-treasury" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">SOL Treasury</a>
                </li>
                <li>
                  • First equity tokenized on Solana via Superstate —{" "}
                  <a href="https://www.sec.gov/Archives/edgar/data/38264/000168316826000960/forward_i10q-123125.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">1,489,896 shares tokenized</a>
                </li>
                <li>
                  • Active DeFi deployment: borrow-lend vaults, token exchanges, liquid staking —{" "}
                  <a href="https://www.sec.gov/Archives/edgar/data/38264/000168316826000960/forward_i10q-123125.htm" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">10-Q</a>
                </li>
                <li>• Design segment ~$4M/qtr revenue, still profitable — legacy business</li>
              </ul>
            </div>

            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">💰 Staking Revenue</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-green-600 dark:text-green-400 font-semibold">{(FWDI_STAKING.q3FwdsolRewardsSol / 1_000_000).toFixed(2)}M SOL</div>
                  <div className="text-gray-600 dark:text-gray-400">Q3 fwdSOL rewards</div>
                </div>
                <div>
                  <div className="text-green-600 dark:text-green-400 font-semibold">${(FWDI_STAKING.q3FwdsolRewardsUsd / 1_000_000).toFixed(2)}M</div>
                  <div className="text-gray-600 dark:text-gray-400">Q3 staking income</div>
                </div>
                <div>
                  <div className="text-green-600 dark:text-green-400 font-semibold">{(FWDI_STAKING.q3TotalStakingIncome / 1_000_000).toFixed(2)}M</div>
                  <div className="text-gray-600 dark:text-gray-400">Q3 total income</div>
                </div>
                <div>
                  <div className="text-green-600 dark:text-green-400 font-semibold">{(FWDI_STAKING.q3StakingYield * 100).toFixed(1)}%</div>
                  <div className="text-gray-600 dark:text-gray-400">Annualized yield</div>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Forward Industries ({"FWDI"}) pivoted to a Solana treasury strategy, accumulating SOL and deploying it in DeFi.
            </p>
          </div>
        </details>
      );
    },

    renderBalanceSheetExtras: () => (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Staking, Capital & Financials</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <div>Balance sheet (Q3): Cash ${formatLargeNumber(FWDI_BALANCE_SHEET.cash)}; Total assets ${formatLargeNumber(FWDI_BALANCE_SHEET.totalAssets)}.</div>
          <div>Income statement (Q3): Revenue ${formatLargeNumber(FWDI_INCOME_STATEMENT.revenue)}; Net income ${formatLargeNumber(FWDI_INCOME_STATEMENT.netIncome)}.</div>
          <div>Capital: PIPE ${formatLargeNumber(FWDI_CAPITAL.pipeGrossProceeds)} gross.</div>
        </div>
      </div>
    ),
  } as any;

  return <CompanyViewBase company={company} className={className} config={config} />;
}
