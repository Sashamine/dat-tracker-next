// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  HSDT_PROVENANCE,
  HSDT_CIK,
  HSDT_STAKING,
  HSDT_CAPITAL,
} from "@/lib/data/provenance/hsdt";
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

export function HSDTCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("HSDT", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const solP = prices?.crypto.SOL?.price || 0;
  const sd2 = prices?.stocks.HSDT;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("HSDT", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!HSDT_PROVENANCE.holdings||!HSDT_PROVENANCE.totalDebt||!HSDT_PROVENANCE.cashReserves) return null;
    const h=HSDT_PROVENANCE.holdings.value, d=HSDT_PROVENANCE.totalDebt.value, c=HSDT_PROVENANCE.cashReserves.value;
    const pf=HSDT_PROVENANCE.preferredEquity?.value||0, sh=HSDT_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*solP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"SOL*Price",formula:"h*p",inputs:{holdings:HSDT_PROVENANCE.holdings}}),`Live SOL: ${solP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:HSDT_PROVENANCE.totalDebt,cash:HSDT_PROVENANCE.cashReserves,holdings:HSDT_PROVENANCE.holdings}}),`Debt: ${formatLargeNumber(d)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:HSDT_PROVENANCE.totalDebt,cash:HSDT_PROVENANCE.cashReserves,holdings:HSDT_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:HSDT_PROVENANCE.holdings,cash:HSDT_PROVENANCE.cashReserves,debt:HSDT_PROVENANCE.totalDebt}}),`Debt-free company`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:HSDT_PROVENANCE.holdings,shares:HSDT_PROVENANCE.sharesOutstanding!,debt:HSDT_PROVENANCE.totalDebt,cash:HSDT_PROVENANCE.cashReserves}}),`${(sh/1e6).toFixed(1)}M shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [solP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!HSDT_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("HSDT");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of SOL exposure." ticker="hsdt" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="Zero debt — no leverage." ticker="hsdt" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="hsdt" /></div>
<ProvenanceMetric label="SOL Holdings" data={HSDT_PROVENANCE.holdings} format="number" subLabel="~2.3M SOL (Oct 29, 2025)" tooltip="Oct 29 8-K press release. XBRL Q3 2025 shows 1,739,355 SOL at Sep 30." ticker="hsdt" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">SOL / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(4)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="HSDT" asset="SOL" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={solP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(HSDT_PROVENANCE.sharesOutstanding)} sharesSource={st(HSDT_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(HSDT_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(HSDT_PROVENANCE.totalDebt)} debtSource={st(HSDT_PROVENANCE.totalDebt)} debtAsOf={sd(HSDT_PROVENANCE.totalDebt)} cashSourceUrl={su(HSDT_PROVENANCE.cashReserves)} cashSource={st(HSDT_PROVENANCE.cashReserves)} cashAsOf={sd(HSDT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(HSDT_PROVENANCE.holdings)} holdingsSource={st(HSDT_PROVENANCE.holdings)} holdingsAsOf={sd(HSDT_PROVENANCE.holdings)} holdingsSearchTerm={ss(HSDT_PROVENANCE.holdings)} debtSearchTerm={ss(HSDT_PROVENANCE.totalDebt)} cashSearchTerm={ss(HSDT_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(HSDT_PROVENANCE.totalDebt)} cashSourceUrl={su(HSDT_PROVENANCE.cashReserves)} holdingsSourceUrl={su(HSDT_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(HSDT_PROVENANCE.holdings)} cashSourceUrl={su(HSDT_PROVENANCE.cashReserves)} debtSourceUrl={su(HSDT_PROVENANCE.totalDebt)} preferredSourceUrl={su(HSDT_PROVENANCE.preferredEquity)} sharesSourceUrl={su(HSDT_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://solanacompany.co" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://x.com/SolanaCompany1" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>Twitter</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${HSDT_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>SEC Filings</a>
</div>

<div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
<h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide mb-2">{"◎ SOL Treasury Company"}</h4>
<ul className="text-sm text-purple-600 dark:text-purple-300 space-y-1">
<li>{"• "}<strong>{"Pivoted from medical devices (PoNS\u2122)"}</strong>{" to SOL treasury strategy in May 2025"}</li>
<li>{"• Pantera Capital & Summer Capital led \u2014 "}<a href="https://www.sec.gov/Archives/edgar/data/1610853/000110465925089774/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">{"$500M PIPE closed Sep 15, 2025"}</a></li>
<li>{"• "}<strong>{HSDT_PROVENANCE.holdings.value.toLocaleString() + " SOL"}</strong>{" held as of Oct 29, 2025 \u2014 "}<a href="https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-800">{"8-K Oct 29"}</a></li>
<li>{"• Partnered with "}<strong>{"Solana Foundation"}</strong>{" \u2014 strategic alignment with Solana ecosystem"}</li>
<li>{"• SOL held in custody at "}<strong>{"Anchorage Digital"}</strong>{" \u2014 institutional-grade qualified custodian"}</li>
<li>{"• 95% staked via native staking \u2014 7.03% APY, earning ~$342K/qtr staking rewards"}</li>
<li>{"• Name changed from Helius Medical Technologies to Solana Company Sep 2025"}</li>
</ul>
</div>

{/* Staking Info Card */}
<div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
<h4 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">{"\uD83D\uDCB0 Staking Revenue"}</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
<div><p className="text-green-600 dark:text-green-300 font-medium">Staking Revenue</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{"$" + (HSDT_STAKING.stakingRevenueQ3/1e3).toFixed(0) + "K"}<span className="text-sm font-normal">/qtr</span></p><p className="text-xs text-green-500">Q3 2025 (first full quarter)</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Staking APY</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{(HSDT_STAKING.stakingApy*100).toFixed(2) + "%"}</p><p className="text-xs text-green-500">Native staking yield</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">% Staked</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">{(HSDT_STAKING.stakingPct*100).toFixed(0) + "%"}</p><p className="text-xs text-green-500">Of total SOL holdings</p></div>
<div><p className="text-green-600 dark:text-green-300 font-medium">Custodian</p><p className="text-2xl font-bold text-green-700 dark:text-green-300">Anchorage</p><p className="text-xs text-green-500">Qualified digital asset custodian</p></div>
</div>
<p className="text-xs text-green-500 mt-3">{"Source: "}<a href="https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/" target="_blank" rel="noopener noreferrer" className="underline hover:text-green-700">{"Q3 2025 10-Q"}</a>{" \u2014 commenced native staking September 2025."}</p>
</div>

{/* PIPE Details */}
<div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
<h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-2">{"\uD83D\uDCC8 $500M PIPE (Sep 2025)"}</h4>
<div className="grid grid-cols-2 gap-4 text-sm">
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">Total PIPE Proceeds</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{"$" + (HSDT_CAPITAL.pipeTotal/1e6).toFixed(0) + "M"}</p><p className="text-xs text-indigo-500">{"Closed " + HSDT_CAPITAL.pipeClosedDate}</p></div>
<div><p className="text-indigo-600 dark:text-indigo-300 font-medium">Lead Investors</p><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Pantera + Summer</p><p className="text-xs text-indigo-500">Pantera Capital & Summer Capital</p></div>
</div>
<p className="text-xs text-indigo-500 mt-3">{"Source: "}<a href="https://www.sec.gov/Archives/edgar/data/1610853/000110465925089774/" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-700">{"8-K Sep 15, 2025"}</a>{" \u2014 Items 1.01, 3.02, 7.01, 8.01. Cash on hand Sep 30: $124M (PIPE proceeds being deployed)."}</p>
</div>

{/* Share Structure */}
<div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
<h4 className="text-sm font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-3">{"\uD83D\uDD0D Share Structure (Nov 17, 2025)"}</h4>
<div className="space-y-2 text-sm">
<div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Common Stock (basic)</span><span className="font-mono font-bold text-gray-900 dark:text-gray-100">41,301,400</span></div>
<div className="text-xs text-gray-500 ml-4">XBRL EntityCommonStockSharesOutstanding (cover page)</div>
<div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">{"Pre-funded Warrants @ $0.00001"}</span><span className="font-mono font-bold text-gray-900 dark:text-gray-100">~34,598,600</span></div>
<div className="text-xs text-gray-500 ml-4">Economically equivalent to shares — included in FD count</div>
<div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2 flex justify-between items-center"><span className="text-gray-700 dark:text-gray-200 font-semibold">Total for mNAV</span><span className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">75,900,000</span></div>
<div className="text-xs text-gray-500">{"Per Q3 2025 earnings press release \u2014 "}<a href="https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">{"10-Q"}</a></div>
</div>
</div>

{/* Medical Device Legacy */}
<div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
<h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">{"\uD83C\uDFE5 Legacy: Helius Medical Technologies"}</h4>
<p className="text-sm text-amber-600 dark:text-amber-300">{"Previously developed the PoNS\u2122 (Portable Neuromodulation Stimulator) device for neurological rehabilitation. Company pivoted to SOL treasury strategy in May 2025, with the medical device business being wound down. Name changed from Helius Medical Technologies to Solana Company effective Sep 29, 2025."}</p>
</div>

{intel?.strategySummary && <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">{intel.strategySummary}</p>}
{intel?.keyBackers && intel.keyBackers.length > 0 && <div className="mb-6"><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Key People</h4><div className="flex flex-wrap gap-2">{intel.keyBackers.map((b: string,i: number)=><span key={i} className="px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">{b}</span>)}</div></div>}
{intel?.recentDevelopments && intel.recentDevelopments.length > 0 && <div className="mb-6"><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Recent Developments</h4><ul className="space-y-2">{intel.recentDevelopments.slice(0,6).map((d2: string,i: number)=><li key={i} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm"><span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-purple-500" /><span>{d2}</span></li>)}</ul></div>}
{intel?.outlook2026 && <div><h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">Outlook & Catalysts</h4><div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{intel.outlook2026}</div></div>}
</div>
</details>

{/* CHARTS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">{"\uD83D\uDCC8"}</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Charts</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="mb-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
<div className="flex justify-center gap-6 mb-4">{(["price","mnav","hps"] as const).map((mode)=><label key={mode} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="chartModeHSDT" checked={chartMode===mode} onChange={()=>setChartMode(mode)} className="w-4 h-4 border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500" /><span className="text-base font-semibold text-gray-900 dark:text-white">{mode==="price"?"Price":mode==="mnav"?"mNAV":"HPS"}</span></label>)}</div>
<div className="flex flex-wrap items-center gap-2 mb-4"><div className="flex gap-1">{(["1d","7d","1mo","1y","all"] as const).map((v)=><button key={v} onClick={()=>chartMode==="mnav"?mtrC(v):trC(v)} className={cn("px-3 py-1 text-sm rounded-md transition-colors",(chartMode==="mnav"?mnavTR:timeRange)===v?"bg-indigo-600 text-white":"bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300")}>{v==="1d"?"24H":v==="7d"?"7D":v==="1mo"?"1M":v==="1y"?"1Y":"ALL"}</button>)}</div></div>
{chartMode==="price"&&(historyLoading?<div className="h-[400px] flex items-center justify-center text-gray-500">Loading chart...</div>:history&&history.length>0?<StockChart data={history} chartMode="price" />:<div className="h-[400px] flex items-center justify-center text-gray-500">No historical data available</div>)}
{chartMode==="mnav"&&M.mn&&sp>0&&solP>0&&<CompanyMNAVChart ticker="HSDT" asset="SOL" currentMNAV={M.mn} currentStockPrice={sp} currentCryptoPrice={solP} timeRange={mnavTR} interval={mnavInt} companyData={{holdings:M.h,sharesForMnav:M.sh,totalDebt:M.d,preferredEquity:M.pf,cashReserves:M.c,restrictedCash:0,asset:"SOL",currency:"USD"}} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="HSDT" asset="SOL" currentHoldingsPerShare={M.hps} />}
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
<span className="text-gray-900 dark:text-gray-100">{formatLargeNumber(M.nav)}</span><span className="text-gray-400"> SOL</span>
<span className="text-green-600">{" + " + formatLargeNumber(M.c)}</span><span className="text-gray-400"> cash</span>
<span className="text-red-600">{" \u2212 " + formatLargeNumber(M.d)}</span><span className="text-gray-400"> debt</span>
<span className="text-indigo-600 font-semibold">{" = " + formatLargeNumber(M.en)}</span>
</p>
</div>
<StalenessNote dates={[company.holdingsLastUpdated,company.debtAsOf,company.cashAsOf,company.sharesAsOf]} secCik={company.secCik} />
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} SOL`} tooltip="SOL holdings at current market price" ticker="hsdt" />
{HSDT_PROVENANCE.cashReserves&&<ProvenanceMetric label="Cash" data={HSDT_PROVENANCE.cashReserves} format="currency" subLabel="Mostly PIPE proceeds" tooltip="$124M at Sep 30. Includes $500M PIPE proceeds being deployed into SOL purchases." ticker="hsdt" />}
{HSDT_PROVENANCE.totalDebt&&<ProvenanceMetric label="Total Debt" data={HSDT_PROVENANCE.totalDebt} format="currency" subLabel="Debt free" tooltip="No long-term debt. LongTermDebt XBRL tag not reported (404)." ticker="hsdt" />}
{HSDT_PROVENANCE.sharesOutstanding&&<ProvenanceMetric label="Shares Outstanding" data={HSDT_PROVENANCE.sharesOutstanding} format="shares" subLabel="41.3M basic + ~34.6M PFWs" tooltip="75.9M total = 41,301,400 common shares + ~34,598,600 pre-funded warrants @ $0.00001. PFWs included in basic count per press release." ticker="hsdt" />}
</div>

{/* Additional Metrics */}
<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
<h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Additional Metrics</h3>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{HSDT_PROVENANCE.quarterlyBurn&&<ProvenanceMetric label="Quarterly Burn" data={HSDT_PROVENANCE.quarterlyBurn} format="currency" subLabel="SGA Q3 2025" tooltip="$4.6M SGA for Jul-Sep 2025. Elevated vs prior quarters due to SOL treasury ops." ticker="hsdt" />}
{es&&es.diluted>es.basic&&<div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
<p className="text-sm text-amber-700 dark:text-amber-400">ITM Dilution</p>
<p className="text-2xl font-bold text-amber-600">{"+"+((es.diluted-es.basic)/1e6).toFixed(1)+"M"}</p>
<p className="text-xs text-amber-500">{"shares from ITM instruments at $"+sp.toFixed(0)}</p>
</div>}
</div>
</div>
</div>
</details>

{/* DATA */}
<div className="mb-4 mt-8 flex items-center gap-2"><span className="text-lg">{"\uD83D\uDCC1"}</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>

<details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Holdings History</h3><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></summary>
<div className="px-4 pb-4"><HoldingsHistoryTable ticker="HSDT" asset="SOL" /></div>
</details>

<details className="mb-4 bg-gray-50 dark:bg-gray-900 rounded-lg group">
<summary className="p-4 cursor-pointer flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled Events</h3><svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></summary>
<div className="px-4 pb-4"><ScheduledEvents ticker="HSDT" stockPrice={sp} /></div>
</details>

{/* RESEARCH */}
<div className="mb-4 mt-8 flex items-center gap-2"><span className="text-lg">{"\uD83D\uDCF0"}</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research & Filings</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>

<div className="mt-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-500 dark:text-gray-400">
<strong>Data Provenance:</strong> All values sourced from SEC EDGAR filings (XBRL data or document text). Click any metric to see its exact source. SOL holdings from Oct 29, 2025 8-K press release (~2.3M SOL). XBRL Q3 2025 shows 1,739,355 SOL at Sep 30 (pre-Oct acquisitions). Shares include 41.3M common + ~34.6M pre-funded warrants @ $0.00001. Cash of $124M at Sep 30 includes PIPE proceeds being deployed. Fiscal year ends December 31.
</div>
</div>);
}