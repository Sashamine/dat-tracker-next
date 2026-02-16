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
  "MSTR": 58_000_000_000,     // $58B - Strategy (~364M shares × ~$159, Jan 2026) - uses sharesForMnav for dynamic calc

  // === ETH Treasury Companies ===
  "SBET": 2_363_000_000,      // $2.36B - Sharplink, Inc. (fully diluted)
  "BMNR": 14_170_000_000,     // $14.17B - Bitmine (~430M shares × $31.20, Jan 2026)

  // === BTC Miners with significant debt ===
  // "HUT" removed - pivoted to AI/HPC, not a DAT company
  // "CORZ" removed - pivoted to AI/HPC infrastructure, not a DAT company
  // "BTDR" removed - primarily a miner/ASIC manufacturer, not a DAT company

  // === BTC Treasury Companies (FMP returns stale/incorrect data) ===
  "SWC": 171_000_000,         // ~$171M - Smarter Web Company (LSE UK), based on ~GBP 136M market cap from company analytics (Feb 2026)
  "DJT": 3_900_000_000,       // $3.9B - Trump Media (Jan 2026, per Yahoo/Nasdaq)
  "NAKA": 1_500_000_000,      // $1.5B - Nakamoto Inc. (5K+ BTC, $210M Kraken loan)
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
  // "CYPH" removed - has sharesForMnav (137.4M), calculated market cap is more accurate
  "LITS": 55_000_000,         // $55M - Lite Strategy
  // "CWD" removed - has sharesForMnav (6.9M), calculated market cap is more accurate
};

/**
 * Fallback stock data for illiquid/international stocks
 * Used when FMP has no data at all
 */
export const FALLBACK_STOCKS: Record<string, { price: number; marketCap: number }> = {
  // International (price in local currency for display, marketCap in USD)
  "3350.T": { price: 548, marketCap: 4_010_000_000 },      // Metaplanet (JPY) - 1.142B shares × 548 JPY ÷ 156
  "3189.T": { price: 245, marketCap: 63_000_000 },         // ANAP Holdings (JPY) - 39.95M shares × ¥245 ÷ 156 = $63M
  "3825.T": { price: 255, marketCap: 244_000_000 },        // Remixpoint (JPY) - 149M shares × ¥255 ÷ 156 = $244M
  "0434.HK": { price: 1.50, marketCap: 315_000_000 },      // Boyaa Interactive (HKD) - 768M shares × ~HK$3.2 ÷ 7.8
  "ALCPB": { price: 0.60, marketCap: 143_000_000 },         // Capital B / Blockchain Group (EUR, Euronext Paris) - 227.5M shares × €0.60 × 1.05 ≈ $143M
  "H100.ST": { price: 1.93, marketCap: 62_000_000 },       // H100 Group (SEK price, USD market cap)
  "DCC.AX": { price: 0.038, marketCap: 39_600_000 },       // DigitalX (AUD) - 1.49B shares × A$0.038 ÷ 1.60 = ~$35M (dashboard: $39.6M)
  "NDA.V": { price: 0.065, marketCap: 13_000_000 },        // Neptune Digital (CAD) - ~200M shares × C$0.065
  "DMGI.V": { price: 0.015, marketCap: 5_000_000 },        // DMG Blockchain (CAD) - estimated

  // SPACs/Pre-merger (limited data availability)
  "ETHM": { price: 10.00, marketCap: 230_000_000 },        // Ether Machine (pending SPAC merger)

  // UK/AQUIS (FMP has bad data for TSWCF)
  "SWC": { price: 0.43, marketCap: 171_000_000 },  // Smarter Web Company - GBP 0.34 ~= $0.43 USD, ~396.6M fully diluted shares

  // OTC/Illiquid
  "CEPO": { price: 10.50, marketCap: 3_500_000_000 },
  "TAOX": { price: 3.39, marketCap: 23_700_000 },   // Updated Feb 5, 2026 - MarketWatch (7M shares × $3.39)
  "XTAIF": { price: 0.50, marketCap: 18_900_000 },  // Updated Jan 26, 2026 - TMX Money XTAO.U
  "IHLDF": { price: 0.10, marketCap: 10_000_000 },
  "LUXFF": { price: 0.05, marketCap: 1_580_000 },  // 31.55M shares × ~$0.05 USD (Jan 2026 SEDAR+ verified)
  "NA": { price: 1.50, marketCap: 81_000_000 },
};
