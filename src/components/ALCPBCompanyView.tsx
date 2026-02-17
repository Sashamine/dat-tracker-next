// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { usePricesStream } from "@/lib/hooks/use-prices-stream";
import { ProvenanceMetric } from "./ProvenanceMetric";
import {
  ALCPB_PROVENANCE,
} from "@/lib/data/provenance/alcpb";
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

// OCA source URLs (inline to avoid cross-file coupling)
const OCA_T1_MAR2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-05-12-blockchain-group-announces-convertible-bond-issuance-eur";
const OCA_B02_MAY2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur";
const OCA_A03_JUN2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-06-12-blockchain-group-announces-equity-and-convertible-bond";
const OCA_A04_B04_A05_URL = "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o";

interface Props { company: Company; className?: string; }

export function ALCPBCompanyView({ company, className = "" }: Props) {
  const { data: prices } = usePricesStream();
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [chartMode, setChartMode] = useState<"price"|"mnav"|"hps">("price");
  const { data: history, isLoading: historyLoading } = useStockHistory("ALCPB", timeRange, interval);
  const [mnavTR, setMnavTR] = useState<TimeRange>("1y");
  const [mnavInt, setMnavInt] = useState<ChartInterval>(DEFAULT_INTERVAL["1y"]);
  const [exp, setExp] = useState<"mnav"|"leverage"|"equityNav"|null>(null);
  const tog = (c: "mnav"|"leverage"|"equityNav") => setExp(exp === c ? null : c);
  const btcP = prices?.crypto.BTC?.price || 0;
  const sd2 = prices?.stocks.ALCPB;
  const sp = sd2?.price || 0;
  const { marketCap: mc } = getMarketCapForMnavSync(company, sd2, prices?.forex);
  const es = useMemo(() => sp ? getEffectiveShares("ALCPB", company.sharesForMnav||0, sp) : null, [sp, company.sharesForMnav]);

  const M = useMemo(() => {
    if (!ALCPB_PROVENANCE.holdings||!ALCPB_PROVENANCE.totalDebt||!ALCPB_PROVENANCE.cashReserves) return null;
    const h=ALCPB_PROVENANCE.holdings.value, d=ALCPB_PROVENANCE.totalDebt.value, c=ALCPB_PROVENANCE.cashReserves.value;
    const pf=ALCPB_PROVENANCE.preferredEquity?.value||0, sh=ALCPB_PROVENANCE.sharesOutstanding?.value||company.sharesForMnav||0;
    const nav=h*btcP, nd=Math.max(0,d-c);
    const ev=mc+d+pf-c, mn=nav>0?ev/nav:null, lv=nav>0?nd/nav:0;
    const en=nav+c-d-pf, enps=sh>0?en/sh:0, hps=sh>0?h/sh:0;
    const navPv:ProvenanceValue<number>=pv(nav,derivedSource({derivation:"BTC*Price",formula:"h*p",inputs:{holdings:ALCPB_PROVENANCE.holdings}}),`Live BTC: ${btcP.toLocaleString()}`);
    const mnPv=mn!==null?pv(mn,derivedSource({derivation:"EV/CryptoNAV",formula:"ev/nav",inputs:{debt:ALCPB_PROVENANCE.totalDebt,cash:ALCPB_PROVENANCE.cashReserves,holdings:ALCPB_PROVENANCE.holdings}}),`Debt: ${formatLargeNumber(d)}`):null;
    const lvPv=pv(lv,derivedSource({derivation:"NetDebt/CryptoNAV",formula:"nd/nav",inputs:{debt:ALCPB_PROVENANCE.totalDebt,cash:ALCPB_PROVENANCE.cashReserves,holdings:ALCPB_PROVENANCE.holdings}}),`NetDebt: ${formatLargeNumber(nd)}`);
    const enPv=pv(en,derivedSource({derivation:"CryptoNAV+Cash-Debt-Pref",formula:"nav+c-d-pf",inputs:{holdings:ALCPB_PROVENANCE.holdings,cash:ALCPB_PROVENANCE.cashReserves,debt:ALCPB_PROVENANCE.totalDebt}}),`After debt`);
    const enpsPv=pv(enps,derivedSource({derivation:"EquityNAV/Shares",formula:"en/sh",inputs:{holdings:ALCPB_PROVENANCE.holdings,shares:ALCPB_PROVENANCE.sharesOutstanding!,debt:ALCPB_PROVENANCE.totalDebt,cash:ALCPB_PROVENANCE.cashReserves}}),`${(sh/1e6).toFixed(1)}M shares`);
    return {h,nav,navPv,mn,mnPv,lv,lvPv,en,enPv,enps,enpsPv,hps,nd,d,c,pf,sh};
  }, [btcP,mc,company.sharesForMnav,es]);

  const trC=(r:TimeRange)=>{setTimeRange(r);setInterval(DEFAULT_INTERVAL[r]);};
  const mtrC=(r:TimeRange)=>{setMnavTR(r);setMnavInt(DEFAULT_INTERVAL[r]);};
  if(!M||!ALCPB_PROVENANCE.holdings) return <div className="text-center py-8 text-gray-500">Loading provenance data...</div>;
  const intel=getCompanyIntel("ALCPB");

  return (<div className={className}>
{/* DATA WARNINGS */}
{company.dataWarnings && company.dataWarnings.length > 0 && (
<div className="mb-4 space-y-2">
{company.dataWarnings.map((w: any, i: number) => (
<div key={i} className={cn("px-4 py-3 rounded-lg text-sm flex items-start gap-2",
  w.severity === "warning" ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
  : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
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
{M.mnPv&&<div className={cn("cursor-pointer transition-all rounded-lg",exp==="mnav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("mnav")}><ProvenanceMetric label="mNAV" data={M.mnPv} format="mnav" subLabel={<span className="flex items-center gap-1">EV / Crypto NAV <span className="text-indigo-500">{exp==="mnav"?"▼":"▶"}</span></span>} tooltip="How much you pay per dollar of BTC exposure." ticker="alcpb" /></div>}
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="leverage"&&"ring-2 ring-amber-500")} onClick={()=>tog("leverage")}><ProvenanceMetric label="Leverage" data={M.lvPv} format="mnav" subLabel={<span className="flex items-center gap-1">Net Debt / Crypto NAV <span className="text-amber-500">{exp==="leverage"?"▼":"▶"}</span></span>} tooltip="Net debt as % of BTC holdings value." ticker="alcpb" /></div>
<div className={cn("cursor-pointer transition-all rounded-lg",exp==="equityNav"&&"ring-2 ring-indigo-500")} onClick={()=>tog("equityNav")}><ProvenanceMetric label="Equity NAV/Share" data={M.enpsPv} format="currency" subLabel={<span className="flex items-center gap-1">What each share is worth <span className="text-indigo-500">{exp==="equityNav"?"▼":"▶"}</span></span>} tooltip="Net assets per share after debt." ticker="alcpb" /></div>
<ProvenanceMetric label="BTC Holdings" data={ALCPB_PROVENANCE.holdings} format="number" subLabel="2,828 BTC total" tooltip="2,828 BTC per AMF filing Feb 9, 2026." ticker="alcpb" />
<div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4"><p className="text-sm text-gray-500 dark:text-gray-400">BTC / Share</p><p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{M.hps.toFixed(6)}</p><p className="text-xs text-gray-400">{M.h.toLocaleString()} / {(M.sh/1e6).toFixed(1)}M</p></div>
</div>

{/* EXPANDABLE CARDS */}
{exp==="mnav"&&<div className="mb-8"><MnavCalculationCard ticker="ALCPB" asset="BTC" marketCap={mc} totalDebt={M.d} preferredEquity={M.pf} cashReserves={M.c} holdings={M.h} cryptoPrice={btcP} holdingsValue={M.nav} mNAV={M.mn} sharesForMnav={M.sh} stockPrice={sp} hasDilutiveInstruments={!!es?.breakdown?.length} basicShares={es?.basic} itmDilutionShares={es?es.diluted-es.basic:undefined} itmDebtAdjustment={0} sharesSourceUrl={su(ALCPB_PROVENANCE.sharesOutstanding)} sharesSource={st(ALCPB_PROVENANCE.sharesOutstanding)} sharesAsOf={sd(ALCPB_PROVENANCE.sharesOutstanding)} debtSourceUrl={su(ALCPB_PROVENANCE.totalDebt)} debtSource={st(ALCPB_PROVENANCE.totalDebt)} debtAsOf={sd(ALCPB_PROVENANCE.totalDebt)} cashSourceUrl={su(ALCPB_PROVENANCE.cashReserves)} cashSource={st(ALCPB_PROVENANCE.cashReserves)} cashAsOf={sd(ALCPB_PROVENANCE.cashReserves)} holdingsSourceUrl={su(ALCPB_PROVENANCE.holdings)} holdingsSource={st(ALCPB_PROVENANCE.holdings)} holdingsAsOf={sd(ALCPB_PROVENANCE.holdings)} holdingsSearchTerm={ss(ALCPB_PROVENANCE.holdings)} debtSearchTerm={ss(ALCPB_PROVENANCE.totalDebt)} cashSearchTerm={ss(ALCPB_PROVENANCE.cashReserves)} /></div>}
{exp==="leverage"&&<div className="mb-8"><LeverageCalculationCard rawDebt={M.d} adjustedDebt={M.d} itmDebtAdjustment={0} cashReserves={M.c} cryptoNav={M.nav} leverage={M.lv} debtSourceUrl={su(ALCPB_PROVENANCE.totalDebt)} cashSourceUrl={su(ALCPB_PROVENANCE.cashReserves)} holdingsSourceUrl={su(ALCPB_PROVENANCE.holdings)} /></div>}
{exp==="equityNav"&&<div className="mb-8"><EquityNavPerShareCalculationCard cryptoNav={M.nav} cashReserves={M.c} totalDebt={M.d} preferredEquity={M.pf} sharesOutstanding={M.sh} equityNav={M.en} equityNavPerShare={M.enps} stockPrice={sp} holdingsSourceUrl={su(ALCPB_PROVENANCE.holdings)} cashSourceUrl={su(ALCPB_PROVENANCE.cashReserves)} debtSourceUrl={su(ALCPB_PROVENANCE.totalDebt)} preferredSourceUrl={su(ALCPB_PROVENANCE.preferredEquity)} sharesSourceUrl={su(ALCPB_PROVENANCE.sharesOutstanding)} /></div>}

{/* STRATEGY & OVERVIEW */}
<details className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-6 group">
<summary className="p-6 cursor-pointer flex items-center justify-between">
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy & Overview</h3>
<svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
</summary>
<div className="px-6 pb-6">
<div className="flex items-center gap-3 mb-6">
<a href="https://cptlb.com" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>Website</a>
<a href="https://x.com/CapitalBTC_" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>@CapitalBTC_</a>
<a href="https://live.euronext.com/en/product/equities/FR0011053636-ALXP" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">📋 Euronext</a>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* BTC Treasury Strategy */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">₿ BTC Treasury Strategy</h4>
<p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Capital B (formerly The Blockchain Group) is Europe&apos;s leading BTC treasury company, modeled after MicroStrategy. Listed on Euronext Growth Paris, it is the first company to adopt a pure Bitcoin treasury strategy on a European regulated exchange.</p>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>2,828 BTC</strong> held as of Feb 9, 2026 (<a href="https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078219_20260209.pdf" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">AMF filing</a>)</li>
<li>• <strong>EUR 300M ATM program</strong> — active equity issuance via TOBAM Bitcoin Alpha Fund</li>
<li>• <strong>BTC Yield</strong> KPI tracked: holdings per share growth over time</li>
<li>• Trades in EUR on Euronext Growth Paris (ISIN: FR0011053636)</li>
<li>• BTC treasury strategy initiated December 2024</li>
</ul>
</div>

{/* Debt & Capital Structure */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💰 Convertible Bond Structure (OCA)</h4>
<p className="text-sm text-gray-600 dark:text-gray-400 mb-2">10 OCA tranches totaling ~€154M ($160M) — all zero-coupon convertible bonds:</p>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>OCA Tranche 1 (€48.6M)</strong> — Fulgur, Adam Back, UTXO, TOBAM @ €0.544/share. <span className="text-green-600 font-medium">ITM</span> (<a href={OCA_T1_MAR2025_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">source</a>)</li>
<li>• <strong>OCA B-02 (€70.4M)</strong> — Fulgur, UTXO, Adam Back @ €0.707/share (<a href={OCA_B02_MAY2025_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">source</a>)</li>
<li>• <strong>OCA B-03 (€12.5M)</strong> — Moonlight Capital @ €3.809–4.95/share (<a href={OCA_B02_MAY2025_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">source</a>)</li>
<li>• <strong>OCA A-03/A-04/B-04 (€16M)</strong> — TOBAM + Adam Back @ €5.17–6.24/share (<a href={OCA_A03_JUN2025_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">source</a>)</li>
<li>• <strong>OCA A-05 (€6.5M)</strong> — TOBAM @ €3.66/share (<a href={OCA_A04_B04_A05_URL} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">source</a>)</li>
<li>• <strong>BSA 2025-01 warrants</strong> — 13.3M potential shares @ €0.544. <span className="text-amber-600 font-medium">Expires Apr 10, 2026</span></li>
</ul>
</div>

{/* Key People & Investors */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">👥 Key People & Investors</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>CEO:</strong> Alexandre Music</li>
<li>• <strong>Key investor:</strong> <a href="https://x.com/adam3us" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">Adam Back</a> (Blockstream CEO, Bitcoin OG)</li>
<li>• <strong>Fulgur Ventures</strong> — lead investor across multiple OCA tranches</li>
<li>• <strong>UTXO Management</strong> — OCA participant</li>
<li>• <strong>TOBAM</strong> — EUR 300M ATM program partner (Bitcoin Alpha Fund)</li>
<li>• <strong>Moonlight Capital</strong> — OCA B-03 participant</li>
</ul>
</div>

{/* Dilution & Data Notes */}
<div>
<h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">⚠️ Data Notes</h4>
<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
<li>• <strong>~47M dilutive overcount:</strong> Our instruments show ~210M potential shares vs company-reported ~163M dilutive. Likely ~47M OCA T1 shares already converted and in basic count. Conservative (overstates dilution).</li>
<li>• <strong>Fully diluted:</strong> ~390M shares (company-reported 389,888,020)</li>
<li>• <strong>No SEC/XBRL:</strong> French company under AMF regulation. Share counts from AMF filings (PDF, not machine-readable).</li>
<li>• <strong>Cash unknown:</strong> FY 2025 IFRS financials pending (expected Mar–Apr 2026). Cash set to $0.</li>
<li>• <strong>EUR→USD:</strong> Strikes and face values converted at ~1.04 EUR/USD (rate at time of issuance).</li>
<li>• <strong>Semi-annual reporting:</strong> French companies report H1 and FY only (no quarterly filings).</li>
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
{chartMode!=="hps"&&<div className="flex gap-1">
{(["1d","7d","1mo","1y","all"] as const).map(v=>{
const label=v==="1d"?"24H":v==="7d"?"7D":v==="1mo"?"1M":v==="1y"?"1Y":"ALL";
const active=chartMode==="mnav"?mnavTR:timeRange;
const handler=chartMode==="mnav"?mtrC:trC;
return <button key={v} onClick={()=>handler(v)} className={cn("px-3 py-1 text-sm rounded-md transition-colors",active===v?"bg-indigo-600 text-white":"bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300")}>{label}</button>;
})}
</div>}
</div>
{chartMode==="price"&&<StockChart data={history||[]} isLoading={historyLoading} timeRange={timeRange} onTimeRangeChange={trC} interval={interval} onIntervalChange={setInterval} />}
{chartMode==="mnav"&&<CompanyMNAVChart ticker="ALCPB" asset="BTC" currentMNAV={M.mn} currentStockPrice={sp} currentCryptoPrice={btcP} timeRange={mnavTR} onTimeRangeChange={mtrC} interval={mnavInt} onIntervalChange={setMnavInt} companyData={{ holdings: M.h, sharesForMnav: M.sh, totalDebt: M.d, preferredEquity: M.pf, cashReserves: M.c, restrictedCash: 0, asset: "BTC", currency: "EUR" }} />}
{chartMode==="hps"&&<HoldingsPerShareChart ticker="ALCPB" asset="BTC" currentHoldingsPerShare={M.hps} />}
</div>

{/* ADDITIONAL METRICS ROW */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📋</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance Sheet</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
<ProvenanceMetric label="Shares" data={ALCPB_PROVENANCE.sharesOutstanding} format="number" subLabel="Basic shares for mNAV" tooltip="227,468,631 shares as of Feb 9, 2026 (AMF filing). Active ATM — count may be stale." ticker="alcpb" />
<ProvenanceMetric label="Total Debt" data={ALCPB_PROVENANCE.totalDebt} format="currency" subLabel="All OCA convertible bonds" tooltip="$160.2M across 10 OCA tranches. Zero-coupon. OCA T1 ($50.5M) is ITM and dynamically subtracted." ticker="alcpb" />
<ProvenanceMetric label="Cash" data={ALCPB_PROVENANCE.cashReserves} format="currency" subLabel="Pending FY 2025 IFRS" tooltip="$0 — cash position unknown. FY 2025 financials expected Mar-Apr 2026." ticker="alcpb" />
<ProvenanceMetric label="Quarterly Burn" data={ALCPB_PROVENANCE.quarterlyBurn} format="currency" subLabel="Estimated from H1 2025" tooltip="~$800K/quarter estimated from H1 2025 IFRS (~€0.72M/quarter). May be stale." ticker="alcpb" />
<ProvenanceMetric label="Crypto NAV" data={M.navPv} format="currency" subLabel={`${M.h.toLocaleString()} BTC × $${btcP.toLocaleString()}`} tooltip="Live BTC holdings × current BTC price." ticker="alcpb" />
</div>

{/* STALENESS + EVENTS */}
<StalenessNote dates={[company.holdingsLastUpdated, company.debtAsOf, company.cashAsOf, company.sharesAsOf]} />
<ScheduledEvents ticker="ALCPB" />

{/* HOLDINGS HISTORY */}
<div className="mb-4 flex items-center gap-2"><span className="text-lg">📜</span><h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holdings History</h2><div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" /></div>
<HoldingsHistoryTable ticker="ALCPB" />

</div>);
}
