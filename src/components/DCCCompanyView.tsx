// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  DCC_PROVENANCE,
} from "@/lib/data/provenance/dcc";
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

// URL constants used in JSX
const WEBSITE_URL = "https://www.digitalx.com";
const TREASURY_DASHBOARD_URL = "https://treasury.digitalx.com";
const ASX_FILINGS_URL = "https://www.asx.com.au/markets/company/DCC";
const LISTCORP_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited";
const TREASURY_DEC_2025_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html";
const Q2_FY2026_4C_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html";

function su(p: any) { return p?.source ? getSourceUrl(p.source) : undefined; }
function st(p: any) { return p?.source?.type; }
function sd(p: any) { return p?.source ? getSourceDate(p.source) : undefined; }
function ss(p: any) { return (p?.source as any)?.searchTerm; }

interface Props { company: Company; className?: string; }

export function DCCCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("DCC.AX", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const btcP = prices?.crypto.BTC?.price || 0;
  const sd2 = prices?.stocks["DCC.AX"];
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("DCC.AX", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!DCC_PROVENANCE.holdings||!DCC_PROVENANCE.totalDebt||!DCC_PROVENANCE.cashReserves) return null;
    const h=DCC_PROVENANCE.holdings.value, d=DCC_PROVENANCE.totalDebt.value, c=DCC_PROVENANCE.cashReserves.value;
    const pf=DCC_PROVENANCE.preferredEquity?.value||0, sh=DCC_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*btcP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"BTC×Price",formula:"h*p",inputs:{holdings:DCC_PROVENANCE.holdings}}),`Live BTC: $${btcP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:DCC_PROVENANCE.totalDebt,cash:DCC_PROVENANCE.cashReserves,holdings:DCC_PROVENANCE.holdings}}),`No debt, clean balance sheet`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:DCC_PROVENANCE.totalDebt,cash:DCC_PROVENANCE.cashReserves,holdings:DCC_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:DCC_PROVENANCE.holdings,cash:DCC_PROVENANCE.cashReserves,debt:DCC_PROVENANCE.totalDebt}}),`After debt`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:DCC_PROVENANCE.holdings,shares:DCC_PROVENANCE.sharesOutstanding!,debt:DCC_PROVENANCE.totalDebt,cash:DCC_PROVENANCE.cashReserves}}),`${(sh/1e9).toFixed(2)}B shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [btcP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!DCC_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("DCC.AX");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-orange-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-orange-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of BTC exposure. No debt = clean mNAV." ticker="dcc" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="Net debt as % of BTC holdings value. Zero — no debt." ticker="dcc" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt (USD)." ticker="dcc" /></div>
<ProvenanceMetric label="BTC Holdings" data={DCC_PROVENANCE.holdings} format="number" subLabel="308.8 direct + 194.85 BTXX ETF" tooltip="503.7 BTC total (Dec 31, 2025). Direct holdings + DigitalX Bitcoin ETF own fund units." ticker="dcc" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">Sats / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{(M.hps*100_000_000).toFixed(2)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} BTC / {(M.sh/1e9).toFixed(2)}B shares</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="DCC.AX" asset="BTC" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={btcP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(DCC_PROVENANCE.sharesOutstanding)} sharesSource={st(DCC_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(DCC_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(DCC_PROVENANCE.totalDebt)} debtSource={st(DCC_PROVENANCE.totalDebt)} debtAsOf={sd(DCC_PROVENANCE.totalDebt)} cashSourceUrl={su(DCC_PROVENANCE.cashReserves)} cashSource={st(DCC_PROVENANCE.cashReserves)} cashAsOf={sd(DCC_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DCC_PROVENANCE.holdings)} holdingsSource={st(DCC_PROVENANCE.holdings)} holdingsAsOf={sd(DCC_PROVENANCE.holdings)} holdingsSearchTerm={ss(DCC_PROVENANCE.holdings)} debtSearchTerm={ss(DCC_PROVENANCE.totalDebt)} cashSearchTerm={ss(DCC_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(DCC_PROVENANCE.totalDebt)} cashSourceUrl={su(DCC_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DCC_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(DCC_PROVENANCE.holdings)} cashSourceUrl={su(DCC_PROVENANCE.cashReserves)} debtSourceUrl={su(DCC_PROVENANCE.totalDebt)} preferredSourceUrl={su(DCC_PROVENANCE.preferredEquity)} sharesSourceUrl={su(DCC_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href={TREASURY_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>Treasury Dashboard</a>
<a href={LISTCORP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📋 Listcorp</a>
<a href={ASX_FILINGS_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📈 ASX</a>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* BTC Treasury Strategy */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">₿ BTC Treasury Strategy</h4>
<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Australia&apos;s first and largest ASX-listed Bitcoin treasury company. Goal: 2,100 BTC by 2027 via strategic capital raises and market-neutral trading strategies.</p>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>503.7 BTC</strong>: 308.8 direct + 194.85 via <a href={TREASURY_DEC_2025_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">BTXX ETF own fund units</a></li>
<li>• BTC treasury strategy launched <strong>July 1, 2025</strong> — A$20.7M raise from UTXO Group, ParaFi Capital &amp; Animoca Brands</li>
<li>• <strong>Debt-free</strong> balance sheet — no convertibles or credit facilities</li>
<li>• Also holds: <strong>20,521 SOL</strong> (staked, ~A$3.8M) + Lime Street Capital fund (~A$4.9M)</li>
<li>• Real-time treasury dashboard: <a href={TREASURY_DASHBOARD_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">treasury.digitalx.com</a></li>
</ul>
</div>

{/* Capital Structure & Financials */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💰 Capital Structure &amp; Financials</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>Zero debt</strong> — no convertible notes, no credit facilities, no preferred equity</li>
<li>• <strong>1.49B shares</strong> outstanding (ASX:DCC, ISIN: AU000000DCC9)</li>
<li>• <strong>A$2.83M cash</strong> at bank (<a href={Q2_FY2026_4C_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Q2 FY2026 4C</a>)</li>
<li>• Quarterly burn: <strong>A$705K</strong> (~US$440K) — down 38% from Q1</li>
<li>• ~A$1M annualised cost savings from operational reset</li>
<li>• Sell My Shares revenue: <strong>A$723K/qtr</strong> (partially offsets burn)</li>
</ul>
</div>

{/* Business Segments */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🏢 Business Segments</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>Bitcoin Treasury</strong> — Core strategy, 504 BTC total exposure</li>
<li>• <strong>DigitalX Bitcoin ETF (ASX:BTXX)</strong> — A$47.7M AUM, DigitalX is investment manager</li>
<li>• <strong>Sell My Shares</strong> — Online brokerage platform, A$723K/qtr revenue</li>
<li>• <strong>Drawbridge</strong> — Governance/compliance SaaS</li>
<li>• <strong>Lime Street Capital</strong> — Market-neutral digital asset trading (US$3.2M deployed)</li>
<li>• Founded 2014 (originally DigitalBTC), one of first blockchain companies on a major exchange</li>
</ul>
</div>

{/* Key People */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">👥 Key People</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>General Manager:</strong> William Hamilton (appointed Sep 26, 2025)</li>
<li>• Lisa Wade (CEO) departed Sep 3, 2024</li>
<li>• Interim CEO Demetrios Christou resigned Sep 26, 2025</li>
<li>• Headquarters: Perth, Western Australia</li>
<li>• ASX:DCC | OTCQB: DGGXF</li>
<li>• ABN: 59 009 575 035</li>
</ul>
</div>
</div>
</div>
</details>

{/* CHART SECTION */}
<div className="mb-6">
<div className="flex items-center gap-2 mb-4">
<div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
{(["price","mnav","hps"] as const).map(m=><button key={m} onClick={()=>setChartMode(m)} className={cn("px-3 py-1 rounded-md text-sm transition-colors",chartMode===m?"bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100":"text-gray-500 hover:text-gray-900 dark:hover:text-gray-100")}>{m==="price"?"Price":m==="mnav"?"mNAV":"HPS"}</button>)}
</div>
</div>
{chartMode==="price"&&<StockChart data={history||[]} isLoading={historyLoading} timeRange={timeRange} onTimeRangeChange={trC} interval={interval} onIntervalChange={setInterval} />}
{chartMode==="mnav"&&<CompanyMNAVChart ticker="DCC.AX" timeRange={mnavTR} onTimeRangeChange={mtrC} interval={mnavInt} onIntervalChange={setMnavInt} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="DCC.AX" />}
</div>

{/* BALANCE SHEET METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📋</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Sheet</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
<ProvenanceMetric label="Shares" data={DCC_PROVENANCE.sharesOutstanding} format="number" subLabel="Basic shares for mNAV" tooltip="1,488,510,854 shares as of Jan 30, 2026. ASX registry. ~240M dilutive options/rights untracked." ticker="dcc" />
<ProvenanceMetric label="Total Debt" data={DCC_PROVENANCE.totalDebt} format="currency" subLabel="Debt-free balance sheet" tooltip="No debt disclosed in Q2 FY2026 quarterly report or Appendix 4C." ticker="dcc" />
<ProvenanceMetric label="Cash" data={DCC_PROVENANCE.cashReserves} format="currency" subLabel="A$2.83M (Q2 FY2026 4C)" tooltip="A$2,829,509 at Dec 31, 2025. USD at 0.63 AUD/USD. Operating capital." ticker="dcc" />
<ProvenanceMetric label="Quarterly Burn" data={DCC_PROVENANCE.quarterlyBurn} format="currency" subLabel="A$705K, down 38% QoQ" tooltip="A$705K operating outflow Q2 FY2026. Down 38% from Q1 ($1.1M AUD). Partially offset by Sell My Shares revenue." ticker="dcc" />
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} BTC × $${btcP.toLocaleString()}`} tooltip="Live BTC holdings × current BTC price." ticker="dcc" />
</div>

{/* STALENESS + EVENTS */}
<StalenessNote dates={[company.holdingsLastUpdated, company.cashAsOf, company.sharesAsOf]} />
<ScheduledEvents ticker="DCC.AX" />

{/* HOLDINGS HISTORY */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📜</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings History</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<HoldingsHistoryTable ticker="DCC.AX" />

</div>);
}
