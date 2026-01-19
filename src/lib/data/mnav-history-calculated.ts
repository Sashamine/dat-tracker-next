// Auto-generated historical mNAV data
// Generated: 2026-01-19T16:57:53.618Z
// DO NOT EDIT - regenerate with: npx tsx scripts/generate-mnav-history.ts

export interface HistoricalMNAVCompany {
  ticker: string;
  asset: string;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
}

export interface HistoricalMNAVSnapshot {
  date: string;
  median: number;
  average: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
  companies: HistoricalMNAVCompany[];
}

export const MNAV_HISTORY: HistoricalMNAVSnapshot[] = [
  {
    "date": "2025-12-31",
    "median": 1.5534614326170681,
    "average": 3.957335283135289,
    "count": 15,
    "btcPrice": 87156.56266080117,
    "ethPrice": 2934.215601758931,
    "companies": [
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.058,
        "marketCap": 11712000,
        "enterpriseValue": 11712000,
        "cryptoNav": 200460094
      },
      {
        "ticker": "BTDR",
        "asset": "BTC",
        "mnav": 12.569,
        "marketCap": 2387000084,
        "enterpriseValue": 2387000084,
        "cryptoNav": 189914150
      },
      {
        "ticker": "DJT",
        "asset": "BTC",
        "mnav": 3.561,
        "marketCap": 3582449913,
        "enterpriseValue": 3582449913,
        "cryptoNav": 1005961046
      },
      {
        "ticker": "XXI",
        "asset": "BTC",
        "mnav": 1.553,
        "marketCap": 5891550124,
        "enterpriseValue": 5891550124,
        "cryptoNav": 3792530668
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 3.561,
        "marketCap": 1582400026,
        "enterpriseValue": 1582400026,
        "cryptoNav": 444324156
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 21.111,
        "marketCap": 130080002,
        "enterpriseValue": 130080002,
        "cryptoNav": 6161853
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 5.712,
        "marketCap": 636899983,
        "enterpriseValue": 636899983,
        "cryptoNav": 111500193
      },
      {
        "ticker": "BMNR",
        "asset": "ETH",
        "mnav": 0.977,
        "marketCap": 11780999708,
        "enterpriseValue": 11780999708,
        "cryptoNav": 12061166586
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 2.135,
        "marketCap": 251099997,
        "enterpriseValue": 251099997,
        "cryptoNav": 117626835
      },
      {
        "ticker": "DFDV",
        "asset": "SOL",
        "mnav": 0.586,
        "marketCap": 151799998,
        "enterpriseValue": 151799998,
        "cryptoNav": 259247230
      },
      {
        "ticker": "FWDI",
        "asset": "SOL",
        "mnav": 0.309,
        "marketCap": 263199997,
        "enterpriseValue": 263199997,
        "cryptoNav": 852012697
      },
      {
        "ticker": "UPXI",
        "asset": "SOL",
        "mnav": 0.419,
        "marketCap": 108500000,
        "enterpriseValue": 108500000,
        "cryptoNav": 259247230
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 1.044,
        "marketCap": 163749993,
        "enterpriseValue": 163749993,
        "cryptoNav": 156897146
      },
      {
        "ticker": "CWD",
        "asset": "LINK",
        "mnav": 5.19,
        "marketCap": 35874999,
        "enterpriseValue": 35874999,
        "cryptoNav": 6912851
      },
      {
        "ticker": "CEPO",
        "asset": "BTC",
        "mnav": 0.576,
        "marketCap": 1507999945,
        "enterpriseValue": 1507999945,
        "cryptoNav": 2616527168
      }
    ]
  }
];
