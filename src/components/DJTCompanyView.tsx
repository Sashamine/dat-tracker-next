// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import { DJT_PROVENANCE, DJT_CIK, DJT_CAPITAL_RAISE, DJT_BALANCE_SHEET, DJT_TODO } from "@/lib/data/provenance/djt";
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

export function DJTCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("DJT", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const btcP = prices?.crypto.BTC?.price || 0;
  const sd2 = prices?.stocks.DJT;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("DJT", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!DJT_PROVENANCE.holdings||!DJT_PROVENANCE.totalDebt||!DJT_PROVENANCE.cashReserves) return null;
    const h=DJT_PROVENANCE.holdings.value, d=DJT_PROVENANCE.totalDebt.value, c=DJT_PROVENANCE.cashReserves.value;
    const pf=DJT_PROVENANCE.preferredEquity?.value||0, sh=DJT_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const itm=es?.inTheMoneyDebtValue||0, ad=Math.max(0,d-itm), nav=h*btcP, nd=Math.max(0,ad-c);
    const ev=mc+ad+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-ad-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"BTC*Price",formula:"h*p",inputs:{holdings:DJT_PROVENANCE.holdings}}),`Live BTC: $${btcP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:DJT_PROVENANCE.totalDebt,cash:DJT_PROVENANCE.cashReserves,holdings:DJT_PROVENANCE.holdings}}),`AdjDebt: ${formatLargeNumber(ad)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:DJT_PROVENANCE.totalDebt,cash:DJT_PROVENANCE.cashReserves,holdings:DJT_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:DJT_PROVENANCE.holdings,cash:DJT_PROVENANCE.cashReserves,debt:DJT_PROVENANCE.totalDebt}}),`AdjDebt: ${formatLargeNumber(ad)}`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:DJT_PROVENANCE.holdings,shares:DJT_PROVENANCE.sharesOutstanding!,debt:DJT_PROVENANCE.totalDebt,cash:DJT_PROVENANCE.cashReserves}}),`Adj debt for ITM`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,ad,itm,c,pf,sh};
  }, [btcP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!DJT_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("DJT");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of BTC exposure." ticker="djt" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="$1B zero-coupon converts due 2030." ticker="djt" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="djt" /></div>
<ProvenanceMetric label="BTC Holdings" data={DJT_PROVENANCE.holdings} format="number" subLabel="From 8-K Dec 2025" tooltip="11,542 BTC. Also holds CRO + $300M options (not counted)." ticker="djt" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">BTC / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(6)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="DJT" asset="BTC" marketCap={mc} totalDebt={M.ad} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={btcP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={M.itm} sharesSourceUrl={su(DJT_PROVENANCE.sharesOutstanding)} sharesSource={st(DJT_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(DJT_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(DJT_PROVENANCE.totalDebt)} debtSource={st(DJT_PROVENANCE.totalDebt)} debtAsOf={sd(DJT_PROVENANCE.totalDebt)} cashSourceUrl={su(DJT_PROVENANCE.cashReserves)} cashSource={st(DJT_PROVENANCE.cashReserves)} cashAsOf={sd(DJT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DJT_PROVENANCE.holdings)} holdingsSource={st(DJT_PROVENANCE.holdings)} holdingsAsOf={sd(DJT_PROVENANCE.holdings)} holdingsSearchTerm={ss(DJT_PROVENANCE.holdings)} debtSearchTerm={ss(DJT_PROVENANCE.totalDebt)} cashSearchTerm={ss(DJT_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.ad} itmDebtAdjustment={M.itm} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(DJT_PROVENANCE.totalDebt)} cashSourceUrl={su(DJT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DJT_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.ad} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(DJT_PROVENANCE.holdings)} cashSourceUrl={su(DJT_PROVENANCE.cashReserves)} debtSourceUrl={su(DJT_PROVENANCE.totalDebt)} preferredSourceUrl={su(DJT_PROVENANCE.preferredEquity)} sharesSourceUrl={su(DJT_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://tmtgcorp.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://truthsocial.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>Truth Social</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${DJT_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>SEC Filings</a>
</div>

<div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
<h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide mb-2">₿ Bitcoin Treasury Company</h4>
<ul className="text-sm text-orange-600 dark:text-orange-300 space-y-1">
<li>• <strong>Truth Social parent company</strong> — pivoted to BTC treasury strategy in 2025</li>
<li>• $2.5B private placement: $1.5B equity + $1B zero-coupon convertible notes due 2030</li>
<li>• <strong>11,542 BTC</strong> accumulated as of Dec 2025 via Crypto.com &amp; Anchorage Digital</li>
<li>• Revenue ~$1M/quarter from Truth Social (minimal relative to treasury)</li>
</ul>
</div>

<div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
<h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">💰 $2.5B Capital Raise</h4>
<div className="grid grid-cols-2 gap-4 text-sm">
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Equity Component</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${(DJT_CAPITAL_RAISE.equityComponent/1e9).toFixed(1)}B</p><p className="text-xs text-blue-500">~{(DJT_CAPITAL_RAISE.sharesIssued/1e6).toFixed(0)}M new shares</p></div>
<div><p className="text-blue-600 dark:text-blue-300 font-medium">Convertible Notes</p><p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${(DJT_CAPITAL_RAISE.debtComponent/1e9).toFixed(1)}B</p><p className="text-xs text-blue-500">Zero-coupon, due {DJT_CAPITAL_RAISE.convertMaturity}</p></div>
</div>
<p className="text-xs text-blue-500 mt-3">~{DJT_CAPITAL_RAISE.investors} institutional investors • Custodians: {DJT_CAPITAL_RAISE.custodians.join(", ")}</p>
<a href="/filings/djt/0001140361-25-046056" className="text-xs text-blue-600 hover:underline mt-1 inline-block">Source: 8-K (Dec 18, 2025) →</a>
</div>

<div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
<h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">⚠️ Unverified / TBD</h4>
<ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
<li>• <strong>DJTWW warrants</strong> — legacy SPAC warrants; count &amp; strike not verified</li>
<li>• <strong>Earnout shares</strong> — from DWAC merger; status/tranches unknown</li>
<li>• <strong>CRO tokens</strong> — DJT holds CRO (Crypto.com); amount not quantified</li>
<li>• <strong>$300M BTC options</strong> — allocated to options strategy; not in mNAV</li>
<li>• <strong>Convert strike</strong> — conversion ratio not yet verified from 8-K exhibits</li>
</ul>
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
{chartMode==="mnav"&&M.mn&&sp>0&&btcP>0&&<CompanyMNAVChart ticker="DJT" asset="BTC" currentMNAV={M.mn} currentStockPrice={sp} currentCryptoPrice={btcP} timeRange={mnavTR} interval={mnavInt} companyData={{holdings:M.h,sharesForMnav:M.sh,totalDebt:M.ad,preferredEquity:M.pf,cashReserves:M.c,restrictedCash:0,asset:"BTC",currency:"USD"}} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="DJT" asset="BTC" currentHoldingsPerShare={M.hps} />}
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
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} BTC`} tooltip="BTC holdings at current market price" ticker="djt" />
{DJT_PROVENANCE.cashReserves&&<ProvenanceMetric label="Cash (Unrestricted)" data={DJT_PROVENANCE.cashReserves} format="currency" subLabel={`$${(DJT_BALANCE_SHEET.cashTotalInclRestricted/1e6).toFixed(0)}M total incl restricted`} tooltip="$166M unrestricted. $336M restricted from convertible proceeds. $502M total." ticker="djt" />}
{DJT_PROVENANCE.totalDebt&&<ProvenanceMetric label="Total Debt" data={DJT_PROVENANCE.totalDebt} format="currency" subLabel="$1B par zero-coupon converts" tooltip="Carrying value ~$951M ($1B par minus issuance costs). Due 2030." ticker="djt" />}
{DJT_PROVENANCE.sharesOutstanding&&<ProvenanceMetric label="Shares Outstanding" data={DJT_PROVENANCE.sharesOutstanding} format="shares" subLabel="Post-PIPE (~81M new)" tooltip="279.9M shares. Pre-PIPE was ~199M." ticker="djt" />}
</div>

{/* Additional Metrics */}
<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Metrics</h3>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{DJT_PROVENANCE.quarterlyBurn&&<ProvenanceMetric label="Quarterly Burn" data={DJT_PROVENANCE.quarterlyBurn} format="currency" subLabel="9M 2025 OpCF: +$2.6M" tooltip="Operations are cash-flow neutral/positive. 9M 2025 OpCF was +$2.6M." ticker="djt" />}

{DJT_PROVENANCE.restrictedCash&&<ProvenanceMetric label="Restricted Cash" data={DJT_PROVENANCE.restrictedCash} format="currency" subLabel="From convertible proceeds" tooltip="$336M restricted from convertible note proceeds. Total cash = $502M." ticker="djt" />}
{DJT_PROVENANCE.revenueQ3&&<ProvenanceMetric label="Revenue (Q3 2025)" data={DJT_PROVENANCE.revenueQ3} format="currency" subLabel="Truth Social (~$1M/qtr)" tooltip="Truth Social revenue. Minimal relative to treasury strategy." ticker="djt" />}
{DJT_PROVENANCE.netLossQ3&&<ProvenanceMetric label="Net Loss (Q3 2025)" data={DJT_PROVENANCE.netLossQ3} format="currency" subLabel="Includes crypto FV changes" tooltip="Net loss includes crypto fair value changes. Operating loss was -$57.7M." ticker="djt" />}

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
<div className="px-4 pb-4"><HoldingsHistoryTable ticker="DJT" asset="BTC" /></div>
</details>

<details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></summary>
<div className="px-4 pb-4"><ScheduledEvents ticker="DJT" stockPrice={sp} /></div>
</details>

{/* RESEARCH */}
<div className="mb-4 mt-8 flex items-center gap-2"><span className="text-lg">📰</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>

<div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
<strong>Data Provenance:</strong> All values are sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source. BTC holdings from 8-K treasury update (Dec 30, 2025). Balance sheet from Q3 2025 10-Q (period ending Sep 30, 2025). No standard XBRL crypto tags — DJT uses custom taxonomy. Also holds CRO tokens and $300M BTC options strategy (not included in mNAV calculations). DJTWW warrants and earnout shares are flagged as unverified.
</div>
</div>);
}
