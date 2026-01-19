/**
 * Market Cap Overrides - Single Source of Truth
 * ==============================================
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
  // === ETH Treasury Companies ===
  "SBET": 2_363_000_000,      // $2.36B - SharpLink Gaming (fully diluted)
  "BMNR": 14_170_000_000,     // $14.17B - Bitmine (~430M shares × $31.20, Jan 2026)

  // === BTC Miners with significant debt ===
  "HUT": 6_770_000_000,       // $6.77B - Hut 8 Mining (13,696 BTC reserve, $350M debt)
  "CORZ": 5_300_000_000,      // $5.3B - Core Scientific ($1.2B debt, emerged from bankruptcy)
  "BTDR": 2_300_000_000,      // $2.3B - Bitdeer ($730M convertible notes)

  // === Non-USD Stocks (FMP returns local currency as USD) ===
  "3350.T": 3_500_000_000,    // $3.5B - Metaplanet (Japan, JPY)
  "0434.HK": 315_000_000,     // $315M - Boyaa Interactive (Hong Kong, HKD)

  // === SPACs and Pre-merger Companies ===
  "XXI": 4_000_000_000,       // $4B - 21 Capital (SPAC merger valuation)
  "CEPO": 3_500_000_000,      // $3.5B - BSTR Holdings (pre-merger SPAC)
  "XRPN": 1_000_000_000,      // $1B - Evernorth Holdings (SPAC merger)
  "ETHM": 230_000_000,        // $230M - Ether Machine (pending SPAC merger with Dynamix)

  // === SOL/Other Treasury Companies ===
  "FWDI": 1_600_000_000,      // $1.6B - Forward Industries (SOL treasury, PIPE raise)
  "NXTT": 600_000_000,        // $600M - NextTech/WeTrade
  "BNC": 500_000_000,         // $500M - Banyan (BNB treasury, PIPE raise)

  // === Smaller/OTC Companies with incorrect FMP data ===
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
  "3350.T": { price: 7500, marketCap: 3_500_000_000 },     // Metaplanet (JPY)
  "0434.HK": { price: 1.50, marketCap: 500_000_000 },      // Boyaa Interactive (HKD)
  "ALTBG": { price: 0.50, marketCap: 200_000_000 },        // Blockchain Group (EUR)
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
