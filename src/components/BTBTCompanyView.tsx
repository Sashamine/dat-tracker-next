// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  BTBT_PROVENANCE,
  BTBT_CIK,
  BTBT_STAKING,
  BTBT_BALANCE_SHEET,
  BTBT_INCOME_STATEMENT,
  BTBT_CONVERTIBLE,
} from "@/lib/data/provenance/btbt";
import { pv, derivedSource, getSourceUrl, getSourceDate } from "@/lib/data/types/provenance";
import { StockChart } from "./stock-chart";
import { CompanyMNAVChart } from "./company-mnav-chart";
import { HoldingsPerShareChart } from "./holdings-per-share-chart";
import { HoldingsHistoryTable } from "./holdings-history-table";
import { ScheduledEvents } from "./scheduled-events";
import { StalenessNote } from "./staleness-note";
import { MnavCalculationCard } from "./mnav-calculation-card";
import { LeverageCalculationCard, EquityNavPerShareCalculationCard } from "./expandable-metric-card";
import { getCompanyIntel } from "@/lib/data/company-intel";
import { getEffectiveShares } from "@/lib/data/dilutive-instruments";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { formatLargeNumber } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import type { Company } from "@/lib/types";
import type { ProvenanceValue } from "@/lib/data/types/provenance";
import { useStockHistory, TimeRange, ChartInterval, DEFAULT_INTERVAL } from "@/lib/hooks/use-stock-history";

function su(p: any) { return p?.source ? getSourceUrl(p.source) : undefined; }
function st(p: any) { return p?.source?.type; }
function sd(p: any) { return p?.source ? getSourceDate(p.source) : undefined; }
function ss(p: any) { return (p?.source as any)?.searchTerm; }

interface Props { company: Company; className?: string; }

export function BTBTCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("BTBT", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const ethP = prices?.crypto.ETH?.price || 0;
  const sd2 = prices?.stocks.BTBT;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("BTBT", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!BTBT_PROVENANCE.holdings||!BTBT_PROVENANCE.totalDebt||!BTBT_PROVENANCE.cashReserves) return null;
    const h=BTBT_PROVENANCE.holdings.value, d=BTBT_PROVENANCE.totalDebt.value, c=BTBT_PROVENANCE.cashReserves.value;
    const pf=BTBT_PROVENANCE.preferredEquity?.value||0, sh=BTBT_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*ethP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"ETH*Price",formula:"h*p",inputs:{holdings:BTBT_PROVENANCE.holdings}}),`Live ETH: $${ethP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:BTBT_PROVENANCE.totalDebt,cash:BTBT_PROVENANCE.cashReserves,holdings:BTBT_PROVENANCE.holdings}}),`Debt: ${formatLargeNumber(d)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:BTBT_PROVENANCE.totalDebt,cash:BTBT_PROVENANCE.cashReserves,holdings:BTBT_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:BTBT_PROVENANCE.holdings,cash:BTBT_PROVENANCE.cashReserves,debt:BTBT_PROVENANCE.totalDebt}}),`$150M convertible debt`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:BTBT_PROVENANCE.holdings,shares:BTBT_PROVENANCE.sharesOutstanding!,debt:BTBT_PROVENANCE.totalDebt,cash:BTBT_PROVENANCE.cashReserves}}),`${(sh/1e6).toFixed(1)}M shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [ethP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!BTBT_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("BTBT");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of ETH exposure." ticker="btbt" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="$150M convertible debt minus $179M cash." ticker="btbt" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="btbt" /></div>
<ProvenanceMetric label="ETH Holdings" data={BTBT_PROVENANCE.holdings} format="number" subLabel="155,227 ETH (Dec 31, 2025)" tooltip="Includes ~15,218 ETH in externally managed fund + LsETH equivalents." ticker="btbt" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">ETH / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(4)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="BTBT" asset="ETH" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={ethP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(BTBT_PROVENANCE.sharesOutstanding)} sharesSource={st(BTBT_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(BTBT_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(BTBT_PROVENANCE.totalDebt)} debtSource={st(BTBT_PROVENANCE.totalDebt)} debtAsOf={sd(BTBT_PROVENANCE.totalDebt)} cashSourceUrl={su(BTBT_PROVENANCE.cashReserves)} cashSource={st(BTBT_PROVENANCE.cashReserves)} cashAsOf={sd(BTBT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(BTBT_PROVENANCE.holdings)} holdingsSource={st(BTBT_PROVENANCE.holdings)} holdingsAsOf={sd(BTBT_PROVENANCE.holdings)} holdingsSearchTerm={ss(BTBT_PROVENANCE.holdings)} debtSearchTerm={ss(BTBT_PROVENANCE.totalDebt)} cashSearchTerm={ss(BTBT_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(BTBT_PROVENANCE.totalDebt)} cashSourceUrl={su(BTBT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(BTBT_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(BTBT_PROVENANCE.holdings)} cashSourceUrl={su(BTBT_PROVENANCE.cashReserves)} debtSourceUrl={su(BTBT_PROVENANCE.totalDebt)} preferredSourceUrl={su(BTBT_PROVENANCE.preferredEquity)} sharesSourceUrl={su(BTBT_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://bit-digital.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://x.com/BitDigital_BTBT" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>Twitter/X</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${BTBT_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>SEC Filings</a>
</div>

{/* ETH Treasury Strategy Card */}
<div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
<h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">◎ ETH Treasury + Staking Company</h4>
<ul className="text-sm text-purple-600 dark:text-purple-300 space-y-1">
<li>• <strong>{"Strategic Asset Company (SAC)"}</strong>{" — pivoted from BTC mining to ETH treasury mid-2025"}</li>
<li>• <strong>{BTBT_PROVENANCE.holdings.value.toLocaleString() + " ETH"}</strong>{" held — one of the largest public ETH treasuries — "}<a href="https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">Dec 2025 PR</a></li>
<li>• <strong>{"89% staked"}</strong>{" via Figment (native staking) + EigenLayer restaking — ~3.5% annualized yield"}</li>
<li>• <strong>{"$150M 4% convertible notes"}</strong>{" due 2030 — proceeds deployed into 31,057 ETH — "}<a href="https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">PR Oct 8</a></li>
<li>• <strong>{"Majority stake in WhiteFiber (WYFI)"}</strong>{" — ~27M shares (~$427M) — AI/HPC infrastructure (Nasdaq-listed)"}</li>
<li>• CEO: Sam Tabar | Headquarters: New York, NY | Incorporated: Cayman Islands</li>
</ul>
</div>

{/* Staking Info Card */}
<div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
<h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">{"💰 ETH Staking"}</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
<div><p className="text-green-600 dark:text-green-300 font-medium">ETH Staked</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{BTBT_STAKING.stakedAmount.value.toLocaleString()}</p><p className="text-xs text-green-500">{(BTBT_STAKING.stakingPct.value * 100).toFixed(0)}% of holdings</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Staking APY</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{"~" + (BTBT_STAKING.annualizedYield.value*100).toFixed(1) + "%"}</p><p className="text-xs text-green-500">Annualized (Dec 2025)</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Q3 Staking Rev</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{"$" + (BTBT_STAKING.stakingRevenue.value/1e6).toFixed(1) + "M"}</p><p className="text-xs text-green-500">+542% YoY</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Staked Value</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{"$" + (BTBT_STAKING.stakedAmount.value * ethP / 1e6).toFixed(0) + "M"}</p><p className="text-xs text-green-500">At current ETH price</p></div>
</div>
<p className="text-xs text-green-500 mt-3">{"Source: "}<a href="https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700">Dec 2025 monthly PR</a>{". Method: Native staking via Figment with EigenLayer restaking. Also uses liquid staking (LsETH)."}</p>
</div>

{/* Convertible Notes Card */}
<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
<h4 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">{"🏦 $150M Convertible Notes (4% Due 2030)"}</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
<div><p className="text-red-600 dark:text-red-300 font-medium">Face Value</p><p className="text-2xl font-bold text-red-700 dark:text-red-300">$150M</p><p className="text-xs text-red-500">$135M + $15M OA</p></div>
<div><p className="text-red-600 dark:text-red-300 font-medium">Conversion Price</p><p className="text-2xl font-bold text-red-700 dark:text-red-300">$4.16</p><p className="text-xs text-red-500">{sp > 0 ? (sp >= 4.16 ? "⚠️ ITM" : `OTM (stock: $${sp.toFixed(2)})`) : "240.38 shares/$1K"}</p></div>
<div><p className="text-red-600 dark:text-red-300 font-medium">Dilutive Shares</p><p className="text-2xl font-bold text-red-700 dark:text-red-300">36.1M</p><p className="text-xs text-red-500">If converted</p></div>
<div><p className="text-red-600 dark:text-red-300 font-medium">Maturity</p><p className="text-2xl font-bold text-red-700 dark:text-red-300">Oct 2030</p><p className="text-xs text-red-500">Put date ~Oct 2028</p></div>
</div>
<p className="text-xs text-red-500 mt-3">{"Underwriters: Barclays, Cantor, B. Riley. Investors: Kraken, Jump Trading, Jane Street. "}<a href="https://bit-digital.com/press-releases/bit-digital-announces-pricing-of-upsized-135-million-convertible-notes-offering/" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700">Pricing PR</a>{" | "}<a href={"https://www.sec.gov/Archives/edgar/data/1710350/000121390025095533/0001213900-25-095533-index.htm"} target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700">8-K Filing</a></p>
</div>

{/* WhiteFiber / AI Business Card */}
<div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
<h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">{"🤖 WhiteFiber (WYFI) — AI/HPC Infrastructure"}</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
<div><p className="text-blue-600 dark:text-blue-300 font-medium">WYFI Shares</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">~27M</p><p className="text-xs text-blue-500">~70.7% ownership</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Stake Value</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{"$" + (BTBT_BALANCE_SHEET.wyfiStake.value/1e6).toFixed(0) + "M"}</p><p className="text-xs text-blue-500">As of Dec 31, 2025</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Cloud Revenue</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{"$" + (BTBT_INCOME_STATEMENT.revenueBreakdown.cloudServices.value/1e6).toFixed(0) + "M"}</p><p className="text-xs text-blue-500">Q3 2025 (+48% YoY)</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Colo Revenue</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{"$" + (BTBT_INCOME_STATEMENT.revenueBreakdown.colocation.value/1e6).toFixed(1) + "M"}</p><p className="text-xs text-blue-500">Q3 2025 (new segment)</p></div>
</div>
<p className="text-xs text-blue-500 mt-3">{"WhiteFiber IPO Aug 2025 (Nasdaq: WYFI). BTBT reaffirmed Jan 28, 2026: will not sell any WYFI shares in 2026. "}<a href="https://bit-digital.com/press-releases/bit-digital-reaffirms-long-term-investment-in-whitefiber-shares/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700">Reaffirmation PR</a></p>
</div>

{/* Revenue Breakdown Card */}
<div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
<h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-2">{"📊 Q3 2025 Revenue Breakdown"}</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">Total Revenue</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">$30.5M</p><p className="text-xs text-indigo-500">+33% YoY</p></div>
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">Cloud Services</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">$18.0M</p><p className="text-xs text-indigo-500">+48% YoY (WYFI)</p></div>
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">BTC Mining</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">$7.4M</p><p className="text-xs text-indigo-500">-27% YoY (winding down)</p></div>
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">ETH Staking</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">$2.9M</p><p className="text-xs text-indigo-500">+542% YoY</p></div>
</div>
<p className="text-xs text-indigo-500 mt-3">{"Net income: $146.7M ($0.47/diluted share) — includes $146M digital asset gains. "}<a href="https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-700">Q3 Earnings PR</a></p>
</div>

{/* BTC Mining Wind-down */}
<div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
<h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">{"⛏️ BTC Mining (Wind-down)"}</h4>
<div className="grid grid-cols-2