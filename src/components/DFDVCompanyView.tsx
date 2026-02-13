// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { DFDV_PROVENANCE, DFDV_CIK } from "@/lib/data/provenance/dfdv";
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

export function DFDVCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("DFDV", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const solP = prices?.crypto.SOL?.price || 0;
  const sd2 = prices?.stocks.DFDV;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("DFDV", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!DFDV_PROVENANCE.holdings||!DFDV_PROVENANCE.totalDebt||!DFDV_PROVENANCE.cashReserves) return null;
    const h=DFDV_PROVENANCE.holdings.value, d=DFDV_PROVENANCE.totalDebt.value, c=DFDV_PROVENANCE.cashReserves.value;
    const pf=DFDV_PROVENANCE.preferredEquity?.value||0, sh=DFDV_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const itm=es?.inTheMoneyDebtValue||0, ad=Math.max(0,d-itm), nav=h*solP, nd=Math.max(0,ad-c);
    const ev=mc+ad+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-ad-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"SOL*Price",formula:"h*p",inputs:{holdings:DFDV_PROVENANCE.holdings}}),`Live SOL: $${solP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:DFDV_PROVENANCE.totalDebt,cash:DFDV_PROVENANCE.cashReserves,holdings:DFDV_PROVENANCE.holdings}}),`AdjDebt: ${formatLargeNumber(ad)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:DFDV_PROVENANCE.totalDebt,cash:DFDV_PROVENANCE.cashReserves,holdings:DFDV_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:DFDV_PROVENANCE.holdings,cash:DFDV_PROVENANCE.cashReserves,debt:DFDV_PROVENANCE.totalDebt}}),`AdjDebt: ${formatLargeNumber(ad)}`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:DFDV_PROVENANCE.holdings,shares:DFDV_PROVENANCE.sharesOutstanding!,debt:DFDV_PROVENANCE.totalDebt,cash:DFDV_PROVENANCE.cashReserves}}),`Adj debt for ITM`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,ad,itm,c,pf,sh};
  }, [solP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!DFDV_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("DFDV");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of SOL exposure." ticker="dfdv" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="$134M convertible notes (5.50% due 2030) + $52M SOL/DeFi loans." ticker="dfdv" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="dfdv" /></div>
<ProvenanceMetric label="SOL Holdings" data={DFDV_PROVENANCE.holdings} format="number" subLabel="Q4 2025 Update (Jan 2026)" tooltip="2,221,329 SOL and SOL equivalents. 90% staked." ticker="dfdv" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">SOL / Share (SPS)</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(4)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="DFDV" asset="SOL" marketCap={mc} totalDebt={M.ad} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={solP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={M.itm} sharesSourceUrl={su(DFDV_PROVENANCE.sharesOutstanding)} sharesSource={st(DFDV_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(DFDV_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(DFDV_PROVENANCE.totalDebt)} debtSource={st(DFDV_PROVENANCE.totalDebt)} debtAsOf={sd(DFDV_PROVENANCE.totalDebt)} cashSourceUrl={su(DFDV_PROVENANCE.cashReserves)} cashSource={st(DFDV_PROVENANCE.cashReserves)} cashAsOf={sd(DFDV_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DFDV_PROVENANCE.holdings)} holdingsSource={st(DFDV_PROVENANCE.holdings)} holdingsAsOf={sd(DFDV_PROVENANCE.holdings)} holdingsSearchTerm={ss(DFDV_PROVENANCE.holdings)} debtSearchTerm={ss(DFDV_PROVENANCE.totalDebt)} cashSearchTerm={ss(DFDV_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.ad} itmDebtAdjustment={M.itm} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(DFDV_PROVENANCE.totalDebt)} cashSourceUrl={su(DFDV_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DFDV_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.ad} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(DFDV_PROVENANCE.holdings)} cashSourceUrl={su(DFDV_PROVENANCE.cashReserves)} debtSourceUrl={su(DFDV_PROVENANCE.totalDebt)} preferredSourceUrl={su(DFDV_PROVENANCE.preferredEquity)} sharesSourceUrl={su(DFDV_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://defidevcorp.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://x.com/defidevcorp" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>@defidevcorp</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${DFDV_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>SEC Filings</a>
</div>

<div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
<h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">◎ SOL Treasury Company</h4>
<ul className="text-sm text-purple-600 dark:text-purple-300 space-y-1">
<li>• <strong>First US public company</strong> with a SOL-focused treasury strategy</li>
<li>• Formerly Janover Inc. (JNVR) — <a href={`https://www.sec.gov/Archives/edgar/data/${DFDV_CIK}/000121390025029172/`} target="_blank" className="underline">pivoted April 2025</a> under new management</li>
<li>• <strong>2,221,329 SOL</strong> held as of Jan 1, 2026 — <strong>SPS: 0.0743</strong> (+6.2% QoQ, ~24.6% annualized)</li>
<li>• Operates <strong>validator nodes</strong> on Solana — earns staking rewards + MEV tips</li>
<li>• <strong>dfdvSOL</strong> liquid staking token — enables SOL yield while maintaining liquidity</li>
<li>• 90% of SOL treasury staked, 15%+ deployed on-chain in DeFi protocols</li>
<li>• Legacy fintech business (commercial real estate marketplace) still operational</li>
</ul>
</div>

<div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
<h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">💰 Capital Structure</h4>
<div className="grid grid-cols-2 gap-4 text-sm mb-4">
<div>
<p className="text-blue-600 dark:text-blue-300 font-medium">Convertible Notes</p>
<p className="text-2xl font-bold text-blue-700 dark:text-blue-300">$134M</p>
<p className="text-xs text-blue-500">5.50% Senior Notes due 2030</p>
<p className="text-xs text-blue-500">Conversion: $9.74/share (~13.8M pot. shares)</p>
</div>
<div>
<p className="text-blue-600 dark:text-blue-300 font-medium">SOL/DeFi Loans</p>
<p className="text-2xl font-bold text-blue-700 dark:text-blue-300">$52M</p>
<p className="text-xs text-blue-500">On-chain protocol loans (post-Q3)</p>
<p className="text-xs text-blue-500">SOL-collateralized, variable rate</p>
</div>
</div>
<div className="grid grid-cols-3 gap-4 text-sm">
<div>
<p className="text-blue-600 dark:text-blue-300 font-medium">Cash/Stablecoins</p>
<p className="text-xl font-bold text-blue-700 dark:text-blue-300">~$9M</p>
</div>
<div>
<p className="text-blue-600 dark:text-blue-300 font-medium">$5B ELOC</p>
<p className="text-xl font-bold text-blue-700 dark:text-blue-300">Undrawn</p>
<p className="text-xs text-blue-500">Equity line of credit facility</p>
</div>
<div>
<p className="text-blue-600 dark:text-blue-300 font-medium">Q4 Buyback</p>
<p className="text-xl font-bold text-blue-700 dark:text-blue-300">2.05M</p>
<p className="text-xs text-blue-500">shares @ avg $5.62</p>
</div>
</div>
<a href="https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/" target="_blank" className="text-xs text-blue-600 hover:underline mt-3 inline-block">Source: 8-K Q4 2025 Business Update (Jan 5, 2026) →</a>
</div>

<div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
<h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">🏦 Staking & Validator Operations</h4>
<div className="grid grid-cols-2 gap-4 text-sm">
<div>
<p className="text-green-600 dark:text-green-300 font-medium">Staking Revenue (9mo)</p>
<p className="text-xl font-bold text-green-700 dark:text-green-300">$4.85M</p>
<p className="text-xs text-green-500">Validator rewards + third-party staking</p>
</div>
<div>
<p className="text-green-600 dark:text-green-300 font-medium">Q4 Organic Yield</p>
<p className="text-xl font-bold text-green-700 dark:text-green-300">~8.3%</p>
<p className="text-xs text-green-500">Annualized, from staking + DeFi</p>
</div>
</div>
<p className="text-xs text-green-600 dark:text-green-300 mt-3">Yield from: staking rewards, validator MEV tips, on-chain DeFi deployment. dfdvSOL LST enables liquid yield.</p>
<a href={`https://www.sec.gov/Archives/edgar/data/${DFDV_CIK}/000119312525286660/dfdv-20250930.htm`} target="_blank" className="text-xs text-green-600 hover:underline mt-1 inline-block">Source: 10-Q Q3 2025 →</a>
</div>

<div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
<h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">📅 Key Timeline</h4>
<ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
<li>• <strong>Apr 4, 2025</strong> — New management acquires control; SOL treasury strategy announced</li>
<li>• <strong>Apr 17, 2025</strong> — Renamed from Janover Inc. to DeFi Development Corp.</li>
<li>• <strong>Apr-Jul 2025</strong> — $148.9M raised via convertible notes, rapid SOL accumulation</li>
<li>• <strong>Aug 2025</strong> — $125M share sale; dfdvSOL LST launched</li>
<li>• <strong>Oct 2025</strong> — DFDVW warrant dividend distributed to shareholders</li>
<li>• <strong>Q4 2025</strong> — Share buyback program (2.05M shares), SPS growth 6.2%</li>
<li>• <strong>Jan 1, 2026</strong> — 2,221,329 SOL held, 29.9M shares outstanding</li>
<li>• <strong>Mar 31, 2026</strong> — Q4 2025 / FY2025 results expected</li>
</ul>
</div>
</div>
</details>

{/* SPS HISTORY TABLE */}
<div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
<h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">SOL Per Share (SPS) Growth</h4>
<div className="overflow-x-auto">
<table className="w-full text-sm">
<thead><tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
<th className="pb-2 pr-4">Quarter</th><th className="pb-2 pr-4 text-right">SOL</th><th className="pb-2 pr-4 text-right">Shares</th><th className="pb-2 pr-4 text-right">SPS</th><th className="pb-2 text-right">QoQ</th>
</tr></thead>
<tbody className="text-gray-700 dark:text-gray-300">
<tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">Q2 2025 (Jun 30)</td><td className="py-1.5 pr-4 text-right">573,000</td><td className="py-1.5 pr-4 text-right">21.0M</td><td className="py-1.5 pr-4 text-right font-mono">0.0272</td><td className="py-1.5 text-right text-gray-400">—</td></tr>
<tr className="border-b border-gray-100 dark:border-gray-800"><td className="py-1.5 pr-4">Q3 2025 (Sep 30)</td><td className="py-1.5 pr-4 text-right">1,157,000</td><td className="py-1.5 pr-4 text-right">31.4M</td><td className="py-1.5 pr-4 text-right font-mono">0.0368</td><td className="py-1.5 text-right text-green-600">+35.3%</td></tr>
<tr><td className="py-1.5 pr-4 font-medium">Q4 2025 (Jan 1, 2026)</td><td className="py-1.5 pr-4 text-right font-medium">2,221,329</td><td className="py-1.5 pr-4 text-right font-medium">29.9M</td><td className="py-1.5 pr-4 text-right font-mono font-medium">0.0743</td><td className="py-1.5 text-right text-green-600 font-medium">+101.9%</td></tr>
</tbody>
</table>
</div>
<p className="text-xs text-gray-400 mt-2">Source: SEC 10-Q filings (Q2, Q3) + <a href="https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/" target="_blank" className="underline">8-K Q4 Business Update</a>. SPS = SOL / Basic Shares.</p>
</div>

{/* STALENESS NOTE */}
<StalenessNote ticker="DFDV" />

{/* CHARTS */}
<div className="mb-6">
<div className="flex items-center gap-2 mb-4">
<span className="text-lg">📈</span>
<h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2>
<div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
</div>
<div className="flex gap-2 mb-4">
{(["price","mnav","hps"] as const).map(m=>(
<button key={m} onClick={()=>setChartMode(m)} className={cn("px-3 py-1 text-sm rounded-lg transition-colors",chartMode===m?"bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300":"text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>{m==="price"?"Price":m==="mnav"?"mNAV":"SOL/Share"}</button>
))}
</div>
{chartMode==="price"&&<StockChart ticker="DFDV" data={history||[]} isLoading={historyLoading} timeRange={timeRange} onTimeRangeChange={trC} />}
{chartMode==="mnav"&&<CompanyMNAVChart ticker="DFDV" timeRange={mnavTR} interval={mnavInt} onTimeRangeChange={mtrC} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="DFDV" />}
</div>

{/* SCHEDULED EVENTS */}
<ScheduledEvents ticker="DFDV" />

{/* HOLDINGS HISTORY */}
<HoldingsHistoryTable ticker="DFDV" />

{/* DATA PROVENANCE */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Provenance</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
<ProvenanceMetric label="SOL Holdings" data={DFDV_PROVENANCE.holdings!} format="number" subLabel="From 8-K Q4 Business Update" ticker="dfdv" />
<ProvenanceMetric label="Shares Outstanding" data={DFDV_PROVENANCE.sharesOutstanding!} format="shares" subLabel="Basic shares (Jan 1, 2026)" ticker="dfdv" />
<ProvenanceMetric label="Total Debt" data={DFDV_PROVENANCE.totalDebt!} format="currency" subLabel="$134M converts + $52M SOL loans" ticker="dfdv" />
<ProvenanceMetric label="Cash/Stablecoins" data={DFDV_PROVENANCE.cashReserves!} format="currency" subLabel="Operating cash (not excess)" ticker="dfdv" />
<ProvenanceMetric label="Quarterly Burn" data={DFDV_PROVENANCE.quarterlyBurn!} format="currency" subLabel="Q3 2025 G&A" ticker="dfdv" />
</div>
<p className="text-xs text-gray-400 mt-4">All data sourced from SEC filings (CIK: {DFDV_CIK}). Click values for direct source links.</p>
</div>
</details>
</div>);
}