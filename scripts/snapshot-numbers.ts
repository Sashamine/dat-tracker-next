#!/usr/bin/env tsx

import fs from "node:fs";
import path from "node:path";

import { allCompanies } from "../src/lib/data/companies";
import { EARNINGS_DATA } from "../src/lib/data/earnings-data";
import { dilutiveInstruments, getEffectiveShares } from "../src/lib/data/dilutive-instruments";
import { calculateMNAVExtended, calculateHoldingsPerShare, calculateNAVPerShare } from "../src/lib/calculations";
import { getMarketCapForMnavSync } from "../src/lib/utils/market-cap";

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sortDeep(value: Json): Json {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (isPlainObject(value)) {
    const out: Record<string, Json> = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortDeep((value as any)[k]);
    }
    return out;
  }
  return value;
}

function safeNumber(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function buildDeterministicPrices() {
  // Deterministic, no network.
  // Chosen so that:
  // - crypto prices are non-zero (mNAV can be computed)
  // - stock prices are high enough to put most strikes ITM, exercising dilution paths
  // - forex rates fixed
  const crypto: Record<string, { price: number }> = {
    BTC: { price: 100_000 },
    ETH: { price: 3_000 },
    SOL: { price: 200 },
    HYPE: { price: 20 },
    BNB: { price: 600 },
    TAO: { price: 500 },
    LINK: { price: 20 },
    TRX: { price: 0.10 },
    XRP: { price: 0.60 },
    ZEC: { price: 25 },
    LTC: { price: 80 },
    SUI: { price: 2 },
    DOGE: { price: 0.15 },
    AVAX: { price: 35 },
    ADA: { price: 0.50 },
    HBAR: { price: 0.10 },
  };

  // Use large stock price to light up dilution logic.
  // marketCap is ignored when sharesForMnav+price exist (market cap is computed).
  const stocks: Record<string, any> = {};
  for (const c of allCompanies) {
    stocks[c.ticker] = { price: 1000, marketCap: 0 };
  }

  const forex = {
    JPY: 0.0067,
    HKD: 0.128,
    SEK: 0.095,
    EUR: 1.09,
    AUD: 0.66,
    CAD: 0.74,
    GBP: 1.27,
  };

  return { crypto, stocks, forex };
}

function main() {
  const prices = buildDeterministicPrices();

  const companiesByTicker = [...allCompanies]
    .slice()
    .sort((a, b) => a.ticker.localeCompare(b.ticker))
    .reduce<Record<string, any>>((acc, c) => {
      // Determine market cap inputs as the app would for mNAV
      const stockData = prices.stocks[c.ticker];
      const mc = getMarketCapForMnavSync(c, stockData, prices.forex);
      const cryptoPrice = prices.crypto[c.asset]?.price ?? 0;

      const effectiveShares = (c.sharesForMnav && c.sharesForMnav > 0)
        ? getEffectiveShares(c.ticker, c.sharesForMnav, stockData?.price ?? 0)
        : null;

      const mnavExtended = calculateMNAVExtended(
        mc.marketCap,
        c.holdings,
        cryptoPrice,
        (c.cashReserves ?? 0) + (mc.inTheMoneyWarrantProceeds ?? 0),
        c.otherInvestments ?? 0,
        Math.max(0, (c.totalDebt ?? 0) - (mc.inTheMoneyDebtValue ?? 0)),
        c.preferredEquity ?? 0,
        (c.restrictedCash ?? 0) + (mc.inTheMoneyWarrantProceeds ?? 0),
        0
      );

      const hpsBasic = c.sharesForMnav
        ? safeNumber(calculateHoldingsPerShare(c.holdings, c.sharesForMnav) ?? null)
        : null;

      const navPerShareBasic = c.sharesForMnav
        ? safeNumber(
            calculateNAVPerShare(
              c.holdings,
              cryptoPrice,
              c.sharesForMnav,
              c.cashReserves ?? 0,
              c.otherInvestments ?? 0,
              c.totalDebt ?? 0,
              c.preferredEquity ?? 0
            )
          )
        : null;

      acc[c.ticker] = {
        id: c.id,
        asset: c.asset,
        tier: c.tier,

        // Core raw inputs
        holdings: c.holdings,
        sharesForMnav: c.sharesForMnav ?? null,
        cashReserves: c.cashReserves ?? null,
        restrictedCash: c.restrictedCash ?? null,
        otherInvestments: c.otherInvestments ?? null,
        totalDebt: c.totalDebt ?? null,
        preferredEquity: c.preferredEquity ?? null,
        quarterlyBurnUsd: c.quarterlyBurnUsd ?? null,
        stakingPct: c.stakingPct ?? null,
        stakingApy: c.stakingApy ?? null,
        capitalRaisedAtm: c.capitalRaisedAtm ?? null,
        capitalRaisedPipe: c.capitalRaisedPipe ?? null,
        capitalRaisedConverts: c.capitalRaisedConverts ?? null,

        // Deterministic derived metrics (using fixed prices)
        inputsForDeterministicMnav: {
          cryptoPrice,
          stockPrice: stockData?.price ?? null,
          marketCapForMnav: mc.marketCap,
          marketCapSource: mc.source,
          dilutionApplied: mc.dilutionApplied,
          inTheMoneyDebtValue: mc.inTheMoneyDebtValue,
          inTheMoneyWarrantProceeds: mc.inTheMoneyWarrantProceeds,
          effectiveShares: effectiveShares
            ? {
                basic: effectiveShares.basic,
                diluted: effectiveShares.diluted,
                inTheMoneyDebtValue: effectiveShares.inTheMoneyDebtValue,
                inTheMoneyWarrantProceeds: effectiveShares.inTheMoneyWarrantProceeds,
              }
            : null,
        },

        deterministicMnav: mnavExtended ? mnavExtended.mNAV : null,
        deterministicMnavBreakdown: mnavExtended
          ? {
              cryptoNav: mnavExtended.cryptoNav,
              totalNav: mnavExtended.totalNav,
              enterpriseValue: mnavExtended.enterpriseValue,
              otherInvestmentsMaterial: mnavExtended.otherInvestmentsMaterial,
              otherInvestmentsRatio: mnavExtended.otherInvestmentsRatio,
            }
          : null,

        holdingsPerShareBasic: hpsBasic,
        navPerShareBasic: navPerShareBasic,
      };
      return acc;
    }, {});

  const earningsByTicker: Record<string, any> = {};
  for (const rec of [...EARNINGS_DATA].slice().sort((a, b) => (a.ticker + a.fiscalYear + a.fiscalQuarter).localeCompare(b.ticker + b.fiscalYear + b.fiscalQuarter))) {
    const k = rec.ticker;
    if (!earningsByTicker[k]) earningsByTicker[k] = [];
    earningsByTicker[k].push({
      ticker: rec.ticker,
      fiscalYear: rec.fiscalYear,
      fiscalQuarter: rec.fiscalQuarter,
      calendarYear: (rec as any).calendarYear ?? null,
      calendarQuarter: (rec as any).calendarQuarter ?? null,
      earningsDate: (rec as any).earningsDate ?? null,
      earningsTime: (rec as any).earningsTime ?? null,
      status: (rec as any).status ?? null,

      // numerical outputs
      epsActual: (rec as any).epsActual ?? null,
      epsEstimate: (rec as any).epsEstimate ?? null,
      revenueActual: (rec as any).revenueActual ?? null,
      revenueEstimate: (rec as any).revenueEstimate ?? null,
      netIncome: (rec as any).netIncome ?? null,
      holdingsAtQuarterEnd: (rec as any).holdingsAtQuarterEnd ?? null,
      sharesAtQuarterEnd: (rec as any).sharesAtQuarterEnd ?? null,
      holdingsPerShare: (rec as any).holdingsPerShare ?? null,
    });
  }

  const snapshot: Json = sortDeep({
    meta: {
      // NOTE: no timestamps here; snapshot must be byte-for-byte deterministic.
      node: process.version,
      repo: "dat-tracker-next",
      prices: {
        crypto: prices.crypto,
        stockPriceDefault: 1000,
        forex: prices.forex,
      },
    },

    companies: companiesByTicker,

    dilutiveInstruments: Object.keys(dilutiveInstruments)
      .sort()
      .reduce<Record<string, Json>>((acc, t) => {
        acc[t] = dilutiveInstruments[t].map((i) => ({
          type: i.type,
          strikePrice: i.strikePrice,
          potentialShares: i.potentialShares,
          faceValue: i.faceValue ?? null,
          issuedDate: i.issuedDate ?? null,
          expiration: i.expiration ?? null,
        }));
        return acc;
      }, {}),

    earnings: earningsByTicker,
  });

  const outPath = path.join(process.cwd(), "snapshots", "numerical-snapshot.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote snapshot: ${outPath}`);
}

main();
