// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  UPXI_PROVENANCE,
  UPXI_CIK,
} from "@/lib/data/provenance/upxi";
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

export function UPXICompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("UPXI", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const solP = prices?.crypto.SOL?.price || 0;
  const sd2 = prices?.stocks.UPXI;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("UPXI", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!UPXI_PROVENANCE.holdings||!UPXI_PROVENANCE.totalDebt||!UPXI_PROVENANCE.cashReserves) return null;
    const h=UPXI_PROVENANCE.holdings.value, d=UPXI_PROVENANCE.totalDebt.value, c=UPXI_PROVENANCE.cashReserves.value;
    const pf=UPXI_PROVENANCE.preferredEquity?.value||0, sh=UPXI_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*solP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"SOL*Price",formula:"h*p",inputs:{holdings:UPXI_PROVENANCE.holdings}}),`Live SOL: ${solP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:UPXI_PROVENANCE.totalDebt,cash:UPXI_PROVENANCE.cashReserves,holdings:UPXI_PROVENANCE.holdings}}),`Debt: ${formatLargeNumber(d)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:UPXI_PROVENANCE.totalDebt,cash:UPXI_PROVENANCE.cashReserves,holdings:UPXI_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:UPXI_PROVENANCE.holdings,cash:UPXI_PROVENANCE.cashReserves,debt:UPXI_PROVENANCE.totalDebt}}),`After debt`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:UPXI_PROVENANCE.holdings,shares:UPXI_PROVENANCE.sharesOutstanding!,debt:UPXI_PROVENANCE.totalDebt,cash:UPXI_PROVENANCE.cashReserves}}),`${(sh/1e6).toFixed(1)}M shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [solP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!UPXI_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("UPXI");

  return (<div className={className}>
{/* KEY METRICS */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📊</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Key Metrics</h2><span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded ml-auto">Click any value for source</span><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of SOL exposure." ticker="upxi" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="Net debt as % of SOL holdings value." ticker="upxi" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="upxi" /></div>
<ProvenanceMetric label="SOL Holdings" data={UPXI_PROVENANCE.holdings} format="number" subLabel="1.32M liquid + 851K locked" tooltip="2,174,583 SOL (Jan 5, 2026). 95% staked. Locked valued at 14% discount." ticker="upxi" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">SOL / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(4)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="UPXI" asset="SOL" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={solP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(UPXI_PROVENANCE.sharesOutstanding)} sharesSource={st(UPXI_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(UPXI_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(UPXI_PROVENANCE.totalDebt)} debtSource={st(UPXI_PROVENANCE.totalDebt)} debtAsOf={sd(UPXI_PROVENANCE.totalDebt)} cashSourceUrl={su(UPXI_PROVENANCE.cashReserves)} cashSource={st(UPXI_PROVENANCE.cashReserves)} cashAsOf={sd(UPXI_PROVENANCE.cashReserves)} holdingsSourceUrl={su(UPXI_PROVENANCE.holdings)} holdingsSource={st(UPXI_PROVENANCE.holdings)} holdingsAsOf={sd(UPXI_PROVENANCE.holdings)} holdingsSearchTerm={ss(UPXI_PROVENANCE.holdings)} debtSearchTerm={ss(UPXI_PROVENANCE.totalDebt)} cashSearchTerm={ss(UPXI_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(UPXI_PROVENANCE.totalDebt)} cashSourceUrl={su(UPXI_PROVENANCE.cashReserves)} holdingsSourceUrl={su(UPXI_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(UPXI_PROVENANCE.holdings)} cashSourceUrl={su(UPXI_PROVENANCE.cashReserves)} debtSourceUrl={su(UPXI_PROVENANCE.totalDebt)} preferredSourceUrl={su(UPXI_PROVENANCE.preferredEquity)} sharesSourceUrl={su(UPXI_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://www.upexi.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://x.com/upexitreasury" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>@upexitreasury</a>
<a href="https://ir.upexi.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📈 IR</a>
<a href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${UPXI_CIK}&type=&dateb=&owner=include&count=40`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📋 SEC</a>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* SOL Treasury Strategy */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">☀️ SOL Treasury Strategy</h4>
<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Upexi is a leading Solana-focused digital asset treasury company. Three value drivers: (1) intelligent capital issuance, (2) staking yield (~8% APY), (3) discounted locked token purchases (14% discount to spot).</p>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>95% staked</strong> — native staking across multiple validators (<a href="https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">10-Q Note 5</a>)</li>
<li>• <strong>1.32M liquid + 851K locked</strong> SOL as of Dec 31, 2025</li>
<li>• <strong>Locked SOL unlock schedule:</strong> 434K by Jun 2026, 390K by Jun 2027, 27K by Jun 2028</li>
<li>• Custodians: <strong>BitGo</strong> (primary, $250M insurance) + <strong>Coinbase</strong> (secondary)</li>
<li>• SOL strategy began April 2025 (pre-pivot: consumer brands company)</li>
</ul>
</div>

{/* Debt & Capital Structure */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💰 Debt & Capital Structure</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>$150M convertible @$4.25</strong> — 2% interest, matures Jul 2027. Cannot repay in cash — converts or returns SOL. (<a href="https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">10-Q Note 10</a>)</li>
<li>• <strong>$36M Hivemind @$2.39</strong> — 1% interest, matures Jan 2028. For 265.5K locked SOL. First-priority security interest. (<a href="https://www.sec.gov/Archives/edgar/data/1775194/000147793226000207/upxi_8k.htm" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">8-K Jan 2026</a>)</li>
<li>• <strong>$62.7M BitGo credit facility</strong> — 11.5% interest, 1-year renewable, collateralized by SOL at 260%</li>
<li>• <strong>$5.9M other notes</strong> — Cygnet subsidiary + promissory</li>
<li>• <strong>$50M buyback</strong> authorized Nov 2025 — $800K executed (416K shares at $1.94 avg)</li>
</ul>
</div>

{/* Consumer Brands */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">🏪 Consumer Brands Business</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• Product revenue: <strong>$2.9M/quarter</strong> (Q2 FY2026, down 27% YoY)</li>
<li>• Brands: LuckyTail, MW Products, Steam Wholesale (HAVZ)</li>
<li>• <strong>Exiting hemp/CBD manufacturing</strong> (shutdown by Feb 15, 2026)</li>
<li>• Staking revenue: <strong>$5.1M/quarter</strong> (65,720 SOL earned in 6 months)</li>
<li>• Management focus shifting to digital asset strategy</li>
</ul>
</div>

{/* Key People & Advisors */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">👥 Key People</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>CEO:</strong> Allan Marshall — holds 150K Series A preferred (10x voting)</li>
<li>• <strong>CFO:</strong> Andrew J. Norstrud</li>
<li>• <strong>CSO:</strong> Brian Rudick (<a href="https://x.com/thetinyant" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">@thetinyant</a>)</li>
<li>• <strong>Advisory:</strong> Arthur Hayes (Maelstrom / BitMEX co-founder)</li>
<li>• <strong>Former Asset Manager:</strong> GSR Strategies (terminated Dec 2025, in arbitration)</li>
<li>• <strong>Hivemind Capital Partners</strong> — Matt Zhang (Founder), $36M convertible investor</li>
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
{chartMode==="mnav"&&<CompanyMNAVChart ticker="UPXI" timeRange={mnavTR} onTimeRangeChange={mtrC} interval={mnavInt} onIntervalChange={setMnavInt} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="UPXI" />}
</div>

{/* ADDITIONAL METRICS ROW */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📋</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Sheet</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
<ProvenanceMetric label="Shares" data={UPXI_PROVENANCE.sharesOutstanding} format="number" subLabel="Basic shares for mNAV" tooltip="69,760,581 shares as of Feb 9, 2026 (10-Q cover). Includes Feb 2026 offering." ticker="upxi" />
<ProvenanceMetric label="Total Debt" data={UPXI_PROVENANCE.totalDebt} format="currency" subLabel="$150M+$36M convert+$63M BitGo" tooltip="$150M convert @$4.25 + $36M Hivemind @$2.39 + $62.7M BitGo credit + $5.9M other" ticker="upxi" />
<ProvenanceMetric label="Cash" data={UPXI_PROVENANCE.cashReserves} format="currency" subLabel="Operating capital" tooltip="$1.6M cash (Dec 31, 2025). Classified as operating — not excess." ticker="upxi" />
<ProvenanceMetric label="Quarterly Burn" data={UPXI_PROVENANCE.quarterlyBurn} format="currency" subLabel="Operating cash outflow" tooltip="$6.2M/quarter based on 6-month operating cash flow. Includes digital asset strategy costs." ticker="upxi" />
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} SOL × $${solP.toLocaleString()}`} tooltip="Live SOL holdings × current SOL price." ticker="upxi" />
</div>

{/* STALENESS + EVENTS */}
<StalenessNote dates={[company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf]} secCik={company.secCik} />
<ScheduledEvents ticker="UPXI" />

{/* HOLDINGS HISTORY */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📜</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings History</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<HoldingsHistoryTable ticker="UPXI" />

</div>);
}
