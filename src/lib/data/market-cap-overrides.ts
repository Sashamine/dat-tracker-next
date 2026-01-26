/**
 * Market Cap Overrides - Single Source of Truth (v2)
 * ===================================================
 *
 * FMP (Financial Modeling Prep) sometimes returns incorrect market caps:
 * - Non-USD stocks: Returns local currency as if it were USD
 * - OTC/illiquid stocks: Missing or stale data
 * - Recent IPOs/SPACs: Incorrect valuations
 *
 * This file is the single source of truth for market cap overrides.
 * Used by both /api/prices and /api/prices/stream routes.
 *
 * To update: Change values here, both routes will pick up the change.
 */

export const MARKET_CAP_OVERRIDES: Record<string, number> = {
  // === Major DAT Companies (use company-reported share counts) ===
  "MSTR": 55_500_000_000,     // $55.5B - Strategy (~320M shares per strategy.com, Jan 2026)

  // === ETH Treasury Companies ===
  "SBET": 2_363_000_000,      // $2.36B - SharpLink Gaming (fully diluted)
  "BMNR": 14_170_000_000,     // $14.17B - Bitmine (~430M shares × $31.20, Jan 2026)

  // === BTC Miners with significant debt ===
  // "HUT" removed - pivoted to AI/HPC, not a DAT company
  // "CORZ" removed - pivoted to AI/HPC infrastructure, not a DAT company
  // "BTDR" removed - primarily a miner/ASIC manufacturer, not a DAT company

  // === BTC Treasury Companies (FMP returns stale/incorrect data) ===
  "DJT": 3_900_000_000,       // $3.9B - Trump Media (Jan 2026, per Yahoo/Nasdaq)
  "NAKA": 1_500_000_000,      // $1.5B - Nakamoto Holdings (5K BTC, $410M convertible debt)
  "ASST": 850_000_000,        // $850M - Strive (per Yahoo Finance, FMP returns stale $665M)

  // === Non-USD Stocks (FMP returns local currency as USD) ===
  // Note: FMP returns JPY/HKD prices as if they were USD - must override market cap
  "3350.T": 4_000_000_000,    // ~$4.0B - Metaplanet (1.142B shares × ¥540 ÷ 155)
  "0434.HK": 315_000_000,     // $315M - Boyaa Interactive (Hong Kong, HKD)

  // === SPACs and Pre-merger Companies ===
  // XXI is DUAL-CLASS: 346.5M Class A + 304.8M Class B = 651.4M total shares
  "XXI": 6_120_000_000,       // $6.1B - 21 Capital (651M total shares × ~$9.40, Jan 2026)
  "CEPO": 3_500_000_000,      // $3.5B - BSTR Holdings (pre-merger SPAC)
  "XRPN": 1_000_000_000,      // $1B - Evernorth Holdings (SPAC merger)
  "ETHM": 230_000_000,        // $230M - Ether Machine (pending SPAC merger with Dynamix)

  // === SOL/Other Treasury Companies ===
  // "FWDI" removed - has sharesForMnav, calculated market cap is more accurate
  // "NXTT" removed - has sharesForMnav, calculated market cap is more accurate (~$28M not $600M)
  // "BNC" removed - has sharesForMnav, calculated market cap is more accurate (~$243M not $500M)

  // === Smaller/OTC Companies with incorrect FMP data ===
  "TRON": 434_000_000,        // $434M - Tron Inc (274M shares × ~$1.58, FMP stale pre-warrant)
  "SUIG": 150_000_000,        // $150M - SUI Group Holdings
  "AVX": 130_000_000,         // $130M - AVAX One Technology
  "FGNX": 110_000_000,        // $110M - FG Nexus
  "NA": 81_000_000,           // $81M - Nano Labs
  "CYPH": 65_000_000,         // $65M - Cypherpunk Technologies
  "LITS": 55_000_000,         // $55M - Lite Strategy
  "CWD": 15_000_000,          // $15M - Calamos (LINK treasury)
};

/**
 * Fallback stock data for illiquid/international stocks
 * Used when FMP has no data at all
 */
export const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number }> = {
  // International (price in local currency for display, marketCap in USD)
  "3350.T": { price: 548, marketCap: 4_010_000_000 },      // Metaplanet (JPY) - 1.142B shares × 548 JPY ÷ 156
  "0434.HK": { price: 1.50, marketCap: 500_000_000 },      // Boyaa Interactive (HKD)
  "ALTBG": { price: 0.77, marketCap: 175_000_000 },        // Capital B / Blockchain Group (EUR, Euronext Paris)
  "H100.ST": { price: 0.10, marketCap: 150_000_000 },      // H100 Group (SEK)

  // SPACs/Pre-merger (limited data availability)
  "ETHM": { price: 10.00, marketCap: 230_000_000 },        // Ether Machine (pending SPAC merger)

  // OTC/Illiquid
  "CEPO": { price: 10.50, marketCap: 3_500_000_000 },
  "XTAIF": { price: 0.75, marketCap: 20_000_000 },
  "IHLDF": { price: 0.10, marketCap: 10_000_000 },
  "LUXFF": { price: 0.05, marketCap: 3_860_000 },
  "NA": { price: 1.50, marketCap: 81_000_000 },
};
