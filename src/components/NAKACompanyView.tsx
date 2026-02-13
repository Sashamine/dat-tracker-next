// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { NAKA_PROVENANCE, NAKA_CIK, NAKA_CAPITAL_RAISE, NAKA_BALANCE_SHEET, NAKA_TODO } from "@/lib/data/provenance/naka";
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

export function NAKACompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("NAKA", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const btcP = prices?.crypto.BTC?.price || 0;
  const sd2 = prices?.stocks.NAKA;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("NAKA", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!NAKA_PROVENANCE.holdings||!NAKA_PROVENANCE.totalDebt||!NAKA_PROVENANCE.cashReserves) return null;
    const h=NAKA_PROVENANCE.holdings.value, d=NAKA_PROVENANCE.totalDebt.value, c=NAKA_PROVENANCE.cashReserves.value;
    const pf=NAKA_PROVENANCE.preferredEquity?.value||0, sh=NAKA_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const itm=es?.inTheMoneyDebtValue||0, ad=Math.max(0,d-itm), nav=h*btcP, nd=Math.max(0,ad-c);
    const ev=mc+ad+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-ad-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"BTC*Price",formula:"h*p",inputs:{holdings:NAKA_PROVENANCE.holdings}}),`Live BTC: $${btcP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:NAKA_PROVENANCE.totalDebt,cash:NAKA_PROVENANCE.cashReserves,holdings:NAKA_PROVENANCE.holdings}}),`AdjDebt: ${formatLargeNumber(ad)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:NAKA_PROVENANCE.totalDebt,cash:NAKA_PROVENANCE.cashReserves,holdings:NAKA_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:NAKA_PROVENANCE.holdings,cash:NAKA_PROVENANCE.cashReserves,debt:NAKA_PROVENANCE.totalDebt}}),`AdjDebt: ${formatLargeNumber(ad)}`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:NAKA_PROVENANCE.holdings,shares:NAKA_PROVENANCE.sharesOutstanding!,debt:NAKA_PROVENANCE.totalDebt,cash:NAKA_PROVENANCE.cashReserves}}),`Adj debt for ITM`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,ad,itm,c,pf,sh};
  }, [btcP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!NAKA_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("NAKA");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of BTC exposure." ticker="naka" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="$210M Kraken BTC-backed loan, 8% annual, due Dec 2026." ticker="naka" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="naka" /></div>
<ProvenanceMetric label="BTC Holdings" data={NAKA_PROVENANCE.holdings} format="number" subLabel="XBRL verified (Q3 2025)" tooltip="5,398 BTC held. 5,765 purchased at avg $118,205; 367 used for strategic investments." ticker="naka" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">BTC / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(6)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="NAKA" asset="BTC" marketCap={mc} totalDebt={M.ad} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={btcP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={M.itm} sharesSourceUrl={su(NAKA_PROVENANCE.sharesOutstanding)} sharesSource={st(NAKA_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(NAKA_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(NAKA_PROVENANCE.totalDebt)} debtSource={st(NAKA_PROVENANCE.totalDebt)} debtAsOf={sd(NAKA_PROVENANCE.totalDebt)} cashSourceUrl={su(NAKA_PROVENANCE.cashReserves)} cashSource={st(NAKA_PROVENANCE.cashReserves)} cashAsOf={sd(NAKA_PROVENANCE.cashReserves)} holdingsSourceUrl={su(NAKA_PROVENANCE.holdings)} holdingsSource={st(NAKA_PROVENANCE.holdings)} holdingsAsOf={sd(NAKA_PROVENANCE.holdings)} holdingsSearchTerm={ss(NAKA_PROVENANCE.holdings)} debtSearchTerm={ss(NAKA_PROVENANCE.totalDebt)} cashSearchTerm={ss(NAKA_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.ad} itmDebtAdjustment={M.itm} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(NAKA_PROVENANCE.totalDebt)} cashSourceUrl={su(NAKA_PROVENANCE.cashReserves)} holdingsSourceUrl={su(NAKA_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.ad} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(NAKA_PROVENANCE.holdings)} cashSourceUrl={su(NAKA_PROVENANCE.cashReserves)} debtSourceUrl={su(NAKA_PROVENANCE.totalDebt)} preferredSourceUrl={su(NAKA_PROVENANCE.preferredEquity)} sharesSourceUrl={su(NAKA_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://nakamoto.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://twitter.com/nakamotoinc" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>Twitter</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${NAKA_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>SEC Filings</a>
</div>

<div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
<h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">₿ Bitcoin Conglomerate</h4>
<ul className="text-sm text-orange-600 dark:text-orange-300 space-y-1">
<li>• <strong>First publicly traded Bitcoin conglomerate</strong> — acquires Bitcoin-native companies</li>
<li>• Merged with KindlyMD in Aug 2025, <a href="https://www.sec.gov/Archives/edgar/data/1946573/000149315226003008/ex99-1.htm" target="_blank" className="underline">rebranded to Nakamoto Inc.</a> Jan 21, 2026</li>
<li>• <strong>5,398 BTC</strong> in treasury — purchased 5,765 BTC at avg $118,205; 367 BTC used for strategic investments</li>
<li>• Goal: accumulate 1 million BTC ("one Nakamoto")</li>
<li>• CEO: David Bailey (founder of Bitcoin Magazine / BTC Inc.)</li>
</ul>
</div>

<div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
<h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">💰 Capital Raise & Financing</h4>
<div className="grid grid-cols-2 gap-4 text-sm">
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Initial PIPE</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">$540M</p><p className="text-xs text-blue-500">Largest crypto PIPE ever (May 2025)</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Kraken Loan</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">$210M</p><p className="text-xs text-blue-500">8% annual, BTC-backed, due Dec 2026</p></div>
</div>
<div className="grid grid-cols-2 gap-4 text-sm mt-3">
<div><p className="text-blue-600 dark:text-blue-300 font-medium">ATM Authorized</p><p className="text-xl font-bold text-blue-700 dark:text-blue-300">$5B</p><p className="text-xs text-blue-500">$5.6M used at avg $4.15/share (Q3 2025)</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Share Buyback</p><p className="text-xl font-bold text-blue-700 dark:text-blue-300">Authorized</p><p className="text-xs text-blue-500">Dec 2025 — when mNAV &lt; 1</p></div>
</div>
<a href="https://www.sec.gov/Archives/edgar/data/1946573/000121390025041722/ea0241620-8k_kindly.htm" target="_blank" className="text-xs text-blue-600 hover:underline mt-3 inline-block">Source: 8-K May 12, 2025 (PIPE) →</a>
<span className="mx-2 text-blue-300">|</span>
<a href="https://www.sec.gov/Archives/edgar/data/1946573/000149315225026862/form8-k.htm" target="_blank" className="text-xs text-blue-600 hover:underline">Source: 8-K Dec 9, 2025 (Kraken) →</a>
</div>

<div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
<h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">🌐 Strategic Investments</h4>
<div className="grid grid-cols-3 gap-4 text-sm">
<div><p className="text-green-600 dark:text-green-300 font-medium">Metaplanet (3350.T)</p><p className="text-xl font-bold text-green-700 dark:text-green-300">$30M</p><p className="text-xs text-green-500">Japanese BTC treasury leader</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Treasury BV</p><p className="text-xl font-bold text-green-700 dark:text-green-300">$15M</p><p className="text-xs text-green-500">Netherlands BTC treasury</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">FUTURE Holdings</p><p className="text-xl font-bold text-green-700 dark:text-green-300">$6M</p><p className="text-xs text-green-500">Switzerland BTC treasury</p></div>
</div>
<p className="text-xs text-green-500 mt-3">Total: $51M in BTC treasury companies. Also: call option on BTC Inc. (Bitcoin Magazine parent) + UTXO Management GP.</p>
</div>

<div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
<h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">📋 Debt History</h4>
<div className="space-y-2 text-sm text-purple-600 dark:text-purple-300">
<p>1. <strong>May 2025:</strong> $200M Yorkville convertible debenture ($2.80 conversion price)</p>
<p>2. <strong>Oct 2025:</strong> Redeemed via Two Prime/Antalpha $93M BTC-backed loan (7% annual)</p>
<p>3. <strong>Dec 2025:</strong> Refinanced to <a href="https://www.sec.gov/Archives/edgar/data/1946573/000149315225026862/form8-k.htm" target="_blank" className="underline">Kraken $210M USDT loan</a> (8% annual, BTC-collateralized, due Dec 4, 2026)</p>
<p className="text-xs text-purple-400 mt-1">Kraken collateral: min $323.4M in BTC. Prepayable with make-whole for first 6 months.</p>
</div>
</div>

{intel?.strategySummary && <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>}
{intel?.keyBackers && intel.keyBackers.length > 0 && <div className="mb-6"><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key People</h4><div className="flex flex-wrap gap-2">{intel.keyBackers.map((b,i)=><span key={i} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">{b}</span>)}</div></div>}
{intel?.recentDevelopments && intel.recentDevelopments.length > 0 && <div className="mb-6"><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Recent Developments</h4><ul className="space-y-2">{intel.recentDevelopments.slice(0,6).map((d2,i)=><li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm"><span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-orange-500" /><span>{d2}</span></li>)}</ul></div>}
{intel?.outlook2026 && <div><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Outlook & Catalysts</h4><div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{intel.outlook2026}</div></div>}
</div>
</details>

{/* CHARTS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📈</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
<div className="flex justify-center gap-6 mb-4">{(["price","mnav","hps"] as const).map((mode)=><label key={mode} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="chartMode" checked={chartMode===mode} onChange={()=>setChartMode(mode)} className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500" /><span className="text-base font-semibold text-gray-900 dark:text-white">{mode==="price"?"Price":mode==="mnav"?"mNAV":"HPS"}</span></label>)}</div>
<div className="flex flex-wrap items-center gap-2 mb-4"><div className="flex gap-1">{(["1d","7d","1mo","1y","all"] as const).map((v)=><button key={v} onClick={()=>chartMode==="mnav"?mtrC(v):trC(v)} className={cn("px-3 py-1 text-sm rounded-md transition-colors",(chartMode==="mnav"?mnavTR:timeRange)===v?"bg-indigo-600 text-white":"bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300")}>{v==="1d"?"24H":v==="7d"?"7D":v==="1mo"?"1M":v==="1y"?"1Y":"ALL"}</button>)}</div></div>
{chartMode==="price"&&(historyLoading?<div className="h-[400px] flex items-center justify-center text-gray-500">Loading chart...</div>:history&&history.length>0?<StockChart data={history} chartMode="price" />:<div className="h-[400px] flex items-center justify-center text-gray-500">No historical data available</div>)}
{chartMode==="mnav"&&M.mn&&sp>0&&btcP>0&&<CompanyMNAVChart ticker="NAKA" asset="BTC" currentMNAV={M.mn} currentStockPrice={sp} currentCryptoPrice={btcP} timeRange={mnavTR} interval={mnavInt} companyData={{holdings:M.h,sharesForMnav:M.sh,totalDebt:M.ad,preferredEquity:M.pf,cashReserves:M.c,restrictedCash:0,asset:"BTC",currency:"USD"}} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="NAKA" asset="BTC" currentHoldingsPerShare={M.hps} />}
</div>

{/* BALANCE SHEET */}
<details open className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between">
<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Balance Sheet</h2>
<div className="flex items-center gap-3"><span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatLargeNumber(M.en)} Equity NAV</span><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
</summary>
<div className="px-4 pb-4">
<div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mb-4">
<p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Equity NAV Formula</p>
<p className="text-sm font-mono text-gray-700 dark:text-gray-300">
<span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(M.nav)}</span><span className="text-gray-400"> BTC</span>
<span className="text-green-600"> + {formatLargeNumber(M.c)}</span><span className="text-gray-400"> cash</span>
<span className="text-red-600"> − {formatLargeNumber(M.ad)}</span><span className="text-gray-400"> debt</span>
<span className="text-indigo-600 font-semibold"> = {formatLargeNumber(M.en)}</span>
</p>
{M.itm > 0 && <p className="text-xs text-gray-500 mt-1">Debt adjusted: {formatLargeNumber(M.d)} raw − {formatLargeNumber(M.itm)} ITM = {formatLargeNumber(M.ad)}</p>}
</div>
<StalenessNote dates={[company.holdingsLastUpdated,company.debtAsOf,company.cashAsOf,company.sharesAsOf]} secCik={company.secCik} />
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} BTC`} tooltip="BTC holdings at current market price" ticker="naka" />
{NAKA_PROVENANCE.cashReserves&&<ProvenanceMetric label="Cash" data={NAKA_PROVENANCE.cashReserves} format="currency" subLabel="XBRL verified Sep 2025" tooltip="$24.2M cash as of Sep 30, 2025 (up from $2.3M pre-strategy)" ticker="naka" />}
{NAKA_PROVENANCE.totalDebt&&<ProvenanceMetric label="Total Debt" data={NAKA_PROVENANCE.totalDebt} format="currency" subLabel="Kraken $210M (Dec 2025)" tooltip="$210M USDT, 8% annual, BTC-collateralized, due Dec 4, 2026" ticker="naka" />}
{NAKA_PROVENANCE.sharesOutstanding&&<ProvenanceMetric label="Shares Outstanding" data={NAKA_PROVENANCE.sharesOutstanding} format="shares" subLabel="439.9M common + 71.7M pre-funded" tooltip="511.6M total shares (including pre-funded warrants at $0.001 exercise)" ticker="naka" />}
</div>

{/* Additional Metrics */}
<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Metrics</h3>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{NAKA_PROVENANCE.quarterlyBurn&&<ProvenanceMetric label="Quarterly Burn" data={NAKA_PROVENANCE.quarterlyBurn} format="currency" subLabel="Q3 2025 G&A: $4.98M" tooltip="Conservative estimate from G&A + ramp costs. 9M OpCF: -$15.9M." ticker="naka" />}

<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
<p className="text-sm text-gray-500 dark:text-gray-400">Cost Basis</p>
<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${(118205).toLocaleString()}</p>
<p className="text-xs text-gray-400">avg per BTC (5,765 purchased)</p>
</div>

<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
<p className="text-sm text-gray-500 dark:text-gray-400">Investments</p>
<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">$51M</p>
<p className="text-xs text-gray-400">in BTC treasury companies</p>
</div>

{es&&es.diluted>es.basic&&<div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
<p className="text-sm text-amber-700 dark:text-amber-400">ITM Dilution</p>
<p className="text-2xl font-bold text-amber-600">+{((es.diluted-es.basic)/1e6).toFixed(1)}M</p>
<p className="text-xs text-amber-500">shares from ITM instruments at ${sp.toFixed(0)}</p>
</div>}
</div>
</div>
</div>
</details>

{/* DATA */}
<div className="mb-4 mt-8 flex items-center gap-2"><span className="text-lg">📁</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>

<details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></summary>
<div className="px-4 pb-4"><HoldingsHistoryTable ticker="NAKA" asset="BTC" /></div>
</details>

<details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></summary>
<div className="px-4 pb-4"><ScheduledEvents ticker="NAKA" stockPrice={sp} /></div>
</details>

{/* RESEARCH */}
<div className="mb-4 mt-8 flex items-center gap-2"><span className="text-lg">📰</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>

<div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
<strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source. BTC holdings from 10-Q Q3 2025 XBRL (CryptoAssetNumberOfUnits = 5,398, BTCMember). Shares from cover page (EntityCommonStockSharesOutstanding = 439,850,889 as of Nov 14, 2025 + 71,704,975 pre-funded warrants at $0.001). Debt from 8-K Dec 9, 2025 (Kraken $210M USDT loan). Cash from Q3 2025 balance sheet. 85.1M tradeable warrants (NAKAW, ~$11.50 strike) tracked in dilutive-instruments.ts.
</div>
</div>);
}