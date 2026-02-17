// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  DDC_PROVENANCE,
  DDC_CIK,
} from "@/lib/data/provenance/ddc";
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
const DDC_WEBSITE = "https://ir.ddc.xyz";
const DDC_TWITTER = "https://x.com/ddcbtc_";
const DDC_TREASURY = "https://treasury.ddc.xyz";
const DDC_SEC_URL = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${DDC_CIK}&type=&dateb=&owner=include&count=40`;
const DDC_424B3_URL = "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm";
const DDC_6K_FEB6_URL = "https://www.sec.gov/Archives/edgar/data/1808110/000121390026013341/ea027596901-6k_ddcenter.htm";
const DDC_ANSON_EX102_URL = "https://www.sec.gov/Archives/edgar/data/1808110/000121390025063293/ea024799501ex10-2_ddcenter.htm";

function su(p: any) { return p?.source ? getSourceUrl(p.source) : undefined; }
function st(p: any) { return p?.source?.type; }
function sd(p: any) { return p?.source ? getSourceDate(p.source) : undefined; }
function ss(p: any) { return (p?.source as any)?.searchTerm; }

interface Props { company: Company; className?: string; }

export function DDCCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("DDC", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const btcP = prices?.crypto.BTC?.price || 0;
  const sd2 = prices?.stocks.DDC;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("DDC", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!DDC_PROVENANCE.holdings||!DDC_PROVENANCE.totalDebt||!DDC_PROVENANCE.cashReserves) return null;
    const h=DDC_PROVENANCE.holdings.value, d=DDC_PROVENANCE.totalDebt.value, c=DDC_PROVENANCE.cashReserves.value;
    const pf=DDC_PROVENANCE.preferredEquity?.value||0, sh=DDC_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*btcP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"BTC×Price",formula:"h*p",inputs:{holdings:DDC_PROVENANCE.holdings}}),`Live BTC: ${btcP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:DDC_PROVENANCE.totalDebt,cash:DDC_PROVENANCE.cashReserves,holdings:DDC_PROVENANCE.holdings}}),`Debt: ${formatLargeNumber(d)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:DDC_PROVENANCE.totalDebt,cash:DDC_PROVENANCE.cashReserves,holdings:DDC_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:DDC_PROVENANCE.holdings,cash:DDC_PROVENANCE.cashReserves,debt:DDC_PROVENANCE.totalDebt}}),`After debt`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:DDC_PROVENANCE.holdings,shares:DDC_PROVENANCE.sharesOutstanding!,debt:DDC_PROVENANCE.totalDebt,cash:DDC_PROVENANCE.cashReserves}}),`${(sh/1e6).toFixed(1)}M shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [btcP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!DDC_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("DDC");

  return (<div className={className}>

{/* DATA WARNINGS */}
{company.dataWarnings && company.dataWarnings.length > 0 && (
<div className="mb-4 space-y-2">
{company.dataWarnings.map((w: any, i: number) => (
<div key={i} className={cn("rounded-lg px-4 py-3 text-sm flex items-start gap-2",
  w.severity === "warning" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800" :
  "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
)}>
<span>{w.severity === "warning" ? "⚠️" : "ℹ️"}</span>
<span>{w.message}</span>
</div>
))}
</div>
)}

{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of BTC exposure." ticker="ddc" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="Net debt as % of BTC holdings value." ticker="ddc" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="ddc" /></div>
<ProvenanceMetric label="BTC Holdings" data={DDC_PROVENANCE.holdings} format="number" subLabel="1,988 BTC (treasury.ddc.xyz)" tooltip="1,988 BTC as of Feb 11, 2026. Avg cost $85,661. From DDC treasury dashboard." ticker="ddc" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">BTC / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(4)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="DDC" asset="BTC" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={btcP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(DDC_PROVENANCE.sharesOutstanding)} sharesSource={st(DDC_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(DDC_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(DDC_PROVENANCE.totalDebt)} debtSource={st(DDC_PROVENANCE.totalDebt)} debtAsOf={sd(DDC_PROVENANCE.totalDebt)} cashSourceUrl={su(DDC_PROVENANCE.cashReserves)} cashSource={st(DDC_PROVENANCE.cashReserves)} cashAsOf={sd(DDC_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DDC_PROVENANCE.holdings)} holdingsSource={st(DDC_PROVENANCE.holdings)} holdingsAsOf={sd(DDC_PROVENANCE.holdings)} holdingsSearchTerm={ss(DDC_PROVENANCE.holdings)} debtSearchTerm={ss(DDC_PROVENANCE.totalDebt)} cashSearchTerm={ss(DDC_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(DDC_PROVENANCE.totalDebt)} cashSourceUrl={su(DDC_PROVENANCE.cashReserves)} holdingsSourceUrl={su(DDC_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(DDC_PROVENANCE.holdings)} cashSourceUrl={su(DDC_PROVENANCE.cashReserves)} debtSourceUrl={su(DDC_PROVENANCE.totalDebt)} preferredSourceUrl={su(DDC_PROVENANCE.preferredEquity)} sharesSourceUrl={su(DDC_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href={DDC_WEBSITE} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>IR Website</a>
<a href={DDC_TWITTER} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>@ddcbtc_</a>
<a href={DDC_TREASURY} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">₿ Treasury</a>
<a href={DDC_SEC_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📋 SEC</a>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* BTC Treasury Strategy */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">₿ BTC Treasury Strategy</h4>
<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">DDC Enterprise (DayDayCook) is a plant-based food company that pivoted to an explicit MSTR-style BTC treasury strategy in Feb 2025. Reports &ldquo;Bitcoin Yield&rdquo; metrics. NYSE American listed, Cayman incorporation, FPI.</p>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>1,988 BTC</strong> held as of Feb 11, 2026 (<a href={DDC_TREASURY} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">treasury dashboard</a>)</li>
<li>• <strong>Avg cost: $85,661/BTC</strong> — total cost basis ~$170M</li>
<li>• <strong>18 purchases</strong> since May 2025 — rapid accumulation</li>
<li>• Strategy began Feb 2025; first BTC acquired May 2025</li>
<li>• Dual-class shares: Class A (1 vote) + Class B (10 votes, CEO only)</li>
</ul>
</div>

{/* Debt & Capital Structure */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💰 Debt & Capital Structure</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>$27M Anson convertible @$13.65</strong> — senior secured, 0% interest (12% on default), matures Jul 2027. Secured by ALL BTC + cash collateral. (<a href={DDC_ANSON_EX102_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Exhibit 10.2</a>)</li>
<li>• <strong>⚠️ Toxic alternate conversion RENEGOTIATED</strong> (Sep 2025 Waiver): 88% of lowest VWAP in 20 trading days (was 94% of 10-day). At ~$2.60 → ~$2.29 alt conversion → ~11.8M shares.</li>
<li>• <strong>Warrant coverage DOUBLED to 70%</strong> (was 35%) due to covenant breaches Sep 2025</li>
<li>• <strong>$275M additional Anson capacity</strong> (undrawn)</li>
<li>• <strong>$200M ELOC</strong> at 98% of 3-day low VWAP (equity dilution facility, not debt)</li>
<li>• <strong>$32.8M Satoshi preferred</strong> — 16M convertible preferred shares, pending NYSE approval (<a href={DDC_6K_FEB6_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">6-K Feb 6</a>)</li>
<li>• <strong>$124M subscription</strong> at $10/share — deeply underwater at ~$2.60, likely dead</li>
</ul>
</div>

{/* Governance & Risk */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">⚠️ Governance & Risks</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>Going concern</strong> — flagged in FY2023 + FY2024 audits. Accumulated deficit $248M (RMB 1.81B).</li>
<li>• <strong>3 auditors in 30 days</strong> — KPMG → Marcum → Enrome. Marcum fired after requesting investigation of undisclosed related-party allegations.</li>
<li>• <strong>Covenant breach Sep 2025</strong> — Anson granted 56-day forbearance in exchange for worse terms (88% alt conversion, doubled warrant coverage).</li>
<li>• <strong>Put option risk</strong> — BTC subscription investors can put shares back at $18.50 if market cap &lt; $500M (currently exercisable).</li>
<li>• <strong>Tontec judgment</strong> — $584K with HK winding-up threat.</li>
<li>• <strong>Activist proxy fight</strong> — PRRN14A filings Jan/Feb 2026.</li>
<li>• <strong>Class B doubled</strong> — CEO Norma Chu's Class B shares went from 875K → 1.75M in 2025 by board resolution (~43% voting power).</li>
</ul>
</div>

{/* Food Business */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🍜 Legacy Food Business</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>DayDayCook brand</strong> — RTH/RTC plant-based meal products</li>
<li>• H1 2025 revenue: ~$15.6M (RMB 111.9M)</li>
<li>• H1 2025 gross margin: 33.4% (up from 25.9%)</li>
<li>• Operations primarily in mainland China + Hong Kong</li>
<li>• H1 2025 operating expenses: $3.19M (quarterly ~$1.6M)</li>
<li>• Food business partially offsets BTC strategy corporate costs</li>
<li>• <strong>CEO:</strong> Norma Ka Yin Chu — founder, Class B holder</li>
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
{chartMode==="mnav"&&<CompanyMNAVChart ticker="DDC" timeRange={mnavTR} onTimeRangeChange={mtrC} interval={mnavInt} onIntervalChange={setMnavInt} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="DDC" />}
</div>

{/* ADDITIONAL METRICS ROW */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📋</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Sheet</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
<ProvenanceMetric label="Shares" data={DDC_PROVENANCE.sharesOutstanding} format="number" subLabel="28.7M Class A + 1.75M Class B" tooltip="30,473,005 total economic shares (6-K Feb 6, 2026). Class B = CEO only, 10x voting." ticker="ddc" />
<ProvenanceMetric label="Total Debt" data={DDC_PROVENANCE.totalDebt} format="currency" subLabel="$27M Anson convertible" tooltip="$27M Anson Initial Notes @$13.65. Secured by all BTC. $275M additional undrawn." ticker="ddc" />
<ProvenanceMetric label="Cash" data={DDC_PROVENANCE.cashReserves} format="currency" subLabel="Jun 30, 2025 (stale)" tooltip="$6.75M cash (H1 2025 balance sheet). ⚠️ 7+ months stale — FPI = no 10-Q. Likely lower post-BTC purchases." ticker="ddc" />
<ProvenanceMetric label="Quarterly Burn" data={DDC_PROVENANCE.quarterlyBurn} format="currency" subLabel="Est. from H1 2025 opex" tooltip="~$2.6M/qtr operating cash burn. Food business gross profit partially offsets. Burn is estimated." ticker="ddc" />
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} BTC × $${btcP.toLocaleString()}`} tooltip="Live BTC holdings × current BTC price." ticker="ddc" />
</div>

{/* STALENESS + EVENTS */}
<StalenessNote dates={[company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf]} secCik={company.secCik} />
<ScheduledEvents ticker="DDC" />

{/* HOLDINGS HISTORY */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📜</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings History</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<HoldingsHistoryTable ticker="DDC" />

</div>);
}
