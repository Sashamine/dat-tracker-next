// Auto-generated historical mNAV data
// Generated: 2026-01-19T17:49:22.116Z
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
    "date": "2023-12-31",
    "median": 10.157273889027909,
    "average": 8.73483851651522,
    "count": 5,
    "btcPrice": 42265,
    "ethPrice": 2282,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 1.08,
        "marketCap": 8634624201,
        "enterpriseValue": 8634624201,
        "cryptoNav": 7994424750
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 11.423,
        "marketCap": 7302806029,
        "enterpriseValue": 7302806029,
        "cryptoNav": 639300390
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 3.278,
        "marketCap": 1273970015,
        "enterpriseValue": 1273970015,
        "cryptoNav": 388626675
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 10.157,
        "marketCap": 25265000,
        "enterpriseValue": 25265000,
        "cryptoNav": 2487380
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 17.736,
        "marketCap": 697950003,
        "enterpriseValue": 697950003,
        "cryptoNav": 39353090
      }
    ]
  },
  {
    "date": "2024-03-31",
    "median": 5.9001589040767195,
    "average": 6.706374935674071,
    "count": 7,
    "btcPrice": 71333,
    "ethPrice": 3611,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 2.07,
        "marketCap": 31629814182,
        "enterpriseValue": 31629814182,
        "cryptoNav": 15282809918
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 5.9,
        "marketCap": 7420465375,
        "enterpriseValue": 7420465375,
        "cryptoNav": 1257672123
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 6.672,
        "marketCap": 4040668724,
        "enterpriseValue": 4040668724,
        "cryptoNav": 605617170
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 12.045,
        "marketCap": 5663069756,
        "enterpriseValue": 5663069756,
        "cryptoNav": 470155803
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 17.745,
        "marketCap": 1511399975,
        "enterpriseValue": 1511399975,
        "cryptoNav": 85171602
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 1.704,
        "marketCap": 1106207996,
        "enterpriseValue": 1106207996,
        "cryptoNav": 649272966
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 0.809,
        "marketCap": 1314000034,
        "enterpriseValue": 1314000034,
        "cryptoNav": 1624950000
      }
    ]
  },
  {
    "date": "2024-06-30",
    "median": 5.201209945949282,
    "average": 5.798888497119486,
    "count": 14,
    "btcPrice": 62678,
    "ethPrice": 3464,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 1.733,
        "marketCap": 24603170476,
        "enterpriseValue": 24603170476,
        "cryptoNav": 14196567000
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 6.112,
        "marketCap": 7082480136,
        "enterpriseValue": 7082480136,
        "cryptoNav": 1158790864
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 5.512,
        "marketCap": 3224592121,
        "enterpriseValue": 3224592121,
        "cryptoNav": 585036452
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 9.01,
        "marketCap": 4545749946,
        "enterpriseValue": 4545749946,
        "cryptoNav": 504495222
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 8.458,
        "marketCap": 1102199972,
        "enterpriseValue": 1102199972,
        "cryptoNav": 130307562
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.258,
        "marketCap": 13411521,
        "enterpriseValue": 13411521,
        "cryptoNav": 51897384
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 2.759,
        "marketCap": 1573949976,
        "enterpriseValue": 1573949976,
        "cryptoNav": 570495156
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 8.137,
        "marketCap": 1070999966,
        "enterpriseValue": 1070999966,
        "cryptoNav": 131623800
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 4.773,
        "marketCap": 22321394,
        "enterpriseValue": 22321394,
        "cryptoNav": 4676400
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 7.018,
        "marketCap": 556500012,
        "enterpriseValue": 556500012,
        "cryptoNav": 79290960
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 0.294,
        "marketCap": 590399984,
        "enterpriseValue": 590399984,
        "cryptoNav": 2009120000
      },
      {
        "ticker": "GAME",
        "asset": "ETH",
        "mnav": 4.891,
        "marketCap": 144000006,
        "enterpriseValue": 144000006,
        "cryptoNav": 29444000
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 20.214,
        "marketCap": 1540500050,
        "enterpriseValue": 1540500050,
        "cryptoNav": 76208000
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 2.014,
        "marketCap": 24480001,
        "enterpriseValue": 24480001,
        "cryptoNav": 12155000
      }
    ]
  },
  {
    "date": "2024-09-30",
    "median": 3.7913263933561145,
    "average": 6.305486083070635,
    "count": 15,
    "btcPrice": 63497,
    "ethPrice": 2659,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 2.077,
        "marketCap": 33259723204,
        "enterpriseValue": 33259723204,
        "cryptoNav": 16015213340
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 3.791,
        "marketCap": 6439015327,
        "enterpriseValue": 6439015327,
        "cryptoNav": 1698354259
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 4.21,
        "marketCap": 2787248829,
        "enterpriseValue": 2787248829,
        "cryptoNav": 662083219
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 5.241,
        "marketCap": 2895400047,
        "enterpriseValue": 2895400047,
        "cryptoNav": 552487397
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 6.548,
        "marketCap": 1095599978,
        "enterpriseValue": 1095599978,
        "cryptoNav": 167314595
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.141,
        "marketCap": 9446114,
        "enterpriseValue": 9446114,
        "cryptoNav": 67179826
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 2.29,
        "marketCap": 1324080025,
        "enterpriseValue": 1324080025,
        "cryptoNav": 578203682
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 3.268,
        "marketCap": 663974994,
        "enterpriseValue": 663974994,
        "cryptoNav": 203190400
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 0.417,
        "marketCap": 799200010,
        "enterpriseValue": 799200010,
        "cryptoNav": 1914480000
      },
      {
        "ticker": "GAME",
        "asset": "ETH",
        "mnav": 2.928,
        "marketCap": 93440002,
        "enterpriseValue": 93440002,
        "cryptoNav": 31908000
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 22.212,
        "marketCap": 1890000000,
        "enterpriseValue": 1890000000,
        "cryptoNav": 85088000
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 3.356,
        "marketCap": 75295998,
        "enterpriseValue": 75295998,
        "cryptoNav": 22436000
      },
      {
        "ticker": "TAOX",
        "asset": "TAO",
        "mnav": 4.11,
        "marketCap": 54360000,
        "enterpriseValue": 54360000,
        "cryptoNav": 13225000
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 27.193,
        "marketCap": 236439994,
        "enterpriseValue": 236439994,
        "cryptoNav": 8695000
      },
      {
        "ticker": "AVX",
        "asset": "AVAX",
        "mnav": 6.8,
        "marketCap": 1009800034,
        "enterpriseValue": 1009800034,
        "cryptoNav": 148500000
      }
    ]
  },
  {
    "date": "2024-11-21",
    "median": 1.788225213619256,
    "average": 1.788225213619256,
    "count": 2,
    "btcPrice": 98000,
    "ethPrice": 3350,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 3.212,
        "marketCap": 104242597046,
        "enterpriseValue": 104242597046,
        "cryptoNav": 32457600000
      },
      {
        "ticker": "NAKA",
        "asset": "BTC",
        "mnav": 0.365,
        "marketCap": 100100003,
        "enterpriseValue": 100100003,
        "cryptoNav": 274400000
      }
    ]
  },
  {
    "date": "2024-12-31",
    "median": 2.473201341494847,
    "average": 5.73025768676775,
    "count": 23,
    "btcPrice": 93429,
    "ethPrice": 3334,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 1.872,
        "marketCap": 78054612198,
        "enterpriseValue": 78054612198,
        "cryptoNav": 41706705600
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 1.773,
        "marketCap": 7434700394,
        "enterpriseValue": 7434700394,
        "cryptoNav": 4194308097
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 2.473,
        "marketCap": 4095000000,
        "enterpriseValue": 4095000000,
        "cryptoNav": 1655748738
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 2.912,
        "marketCap": 2872020069,
        "enterpriseValue": 2872020069,
        "cryptoNav": 986236524
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 9.595,
        "marketCap": 2934880051,
        "enterpriseValue": 2934880051,
        "cryptoNav": 305886546
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.02,
        "marketCap": 4414384,
        "enterpriseValue": 4414384,
        "cryptoNav": 216848709
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 2.603,
        "marketCap": 2473650026,
        "enterpriseValue": 2473650026,
        "cryptoNav": 950266359
      },
      {
        "ticker": "NAKA",
        "asset": "BTC",
        "mnav": 0.426,
        "marketCap": 165000007,
        "enterpriseValue": 165000007,
        "cryptoNav": 387730350
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 1.053,
        "marketCap": 423150022,
        "enterpriseValue": 423150022,
        "cryptoNav": 401744700
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 9.534,
        "marketCap": 50219953,
        "enterpriseValue": 50219953,
        "cryptoNav": 5267720
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 6.002,
        "marketCap": 547305057,
        "enterpriseValue": 547305057,
        "cryptoNav": 91184900
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 0.279,
        "marketCap": 799679985,
        "enterpriseValue": 799679985,
        "cryptoNav": 2867240000
      },
      {
        "ticker": "ETHM",
        "asset": "ETH",
        "mnav": 0.325,
        "marketCap": 539000010,
        "enterpriseValue": 539000010,
        "cryptoNav": 1656998000
      },
      {
        "ticker": "GAME",
        "asset": "ETH",
        "mnav": 2.128,
        "marketCap": 110699999,
        "enterpriseValue": 110699999,
        "cryptoNav": 52010400
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 11.734,
        "marketCap": 1564799957,
        "enterpriseValue": 1564799957,
        "cryptoNav": 133360000
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 29.333,
        "marketCap": 1047800055,
        "enterpriseValue": 1047800055,
        "cryptoNav": 35721000
      },
      {
        "ticker": "TAOX",
        "asset": "TAO",
        "mnav": 3.918,
        "marketCap": 74205998,
        "enterpriseValue": 74205998,
        "cryptoNav": 18942000
      },
      {
        "ticker": "LITS",
        "asset": "LTC",
        "mnav": 1.107,
        "marketCap": 82075002,
        "enterpriseValue": 82075002,
        "cryptoNav": 74160000
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 15.915,
        "marketCap": 286160007,
        "enterpriseValue": 286160007,
        "cryptoNav": 17980000
      },
      {
        "ticker": "SUIG",
        "asset": "SUI",
        "mnav": 0.209,
        "marketCap": 68250002,
        "enterpriseValue": 68250002,
        "cryptoNav": 326820000
      },
      {
        "ticker": "AVX",
        "asset": "AVAX",
        "mnav": 1.609,
        "marketCap": 614879974,
        "enterpriseValue": 614879974,
        "cryptoNav": 382200000
      },
      {
        "ticker": "HYPD",
        "asset": "HYPE",
        "mnav": 5.424,
        "marketCap": 162719999,
        "enterpriseValue": 162719999,
        "cryptoNav": 30000000
      },
      {
        "ticker": "LUXFF",
        "asset": "LTC",
        "mnav": 21.553,
        "marketCap": 26640000,
        "enterpriseValue": 26640000,
        "cryptoNav": 1236000
      }
    ]
  },
  {
    "date": "2025-03-31",
    "median": 1.807912281522849,
    "average": 8.53547994366517,
    "count": 12,
    "btcPrice": 82549,
    "ethPrice": 1822,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 1.83,
        "marketCap": 83624241113,
        "enterpriseValue": 83624241113,
        "cryptoNav": 45695411695
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 1.337,
        "marketCap": 5117500000,
        "enterpriseValue": 5117500000,
        "cryptoNav": 3828292424
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 1.786,
        "marketCap": 2833759954,
        "enterpriseValue": 2833759954,
        "cryptoNav": 1586839427
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 8.788,
        "marketCap": 2430240057,
        "enterpriseValue": 2430240057,
        "cryptoNav": 276539150
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.025,
        "marketCap": 6434457,
        "enterpriseValue": 6434457,
        "cryptoNav": 254416018
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 1.618,
        "marketCap": 1371159986,
        "enterpriseValue": 1371159986,
        "cryptoNav": 847282936
      },
      {
        "ticker": "CORZ",
        "asset": "BTC",
        "mnav": 30.701,
        "marketCap": 2476079922,
        "enterpriseValue": 2476079922,
        "cryptoNav": 80650373
      },
      {
        "ticker": "BTDR",
        "asset": "BTC",
        "mnav": 18.969,
        "marketCap": 1810149984,
        "enterpriseValue": 1810149984,
        "cryptoNav": 95426644
      },
      {
        "ticker": "NAKA",
        "asset": "BTC",
        "mnav": 0.506,
        "marketCap": 225400002,
        "enterpriseValue": 225400002,
        "cryptoNav": 445599502
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 0.454,
        "marketCap": 191250005,
        "enterpriseValue": 191250005,
        "cryptoNav": 420834802
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 7.679,
        "marketCap": 419717355,
        "enterpriseValue": 419717355,
        "cryptoNav": 54660000
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 28.732,
        "marketCap": 894000006,
        "enterpriseValue": 894000006,
        "cryptoNav": 31115000
      }
    ]
  },
  {
    "date": "2025-06-30",
    "median": 2.7361631227376035,
    "average": 7.730284162322322,
    "count": 31,
    "btcPrice": 109368,
    "ethPrice": 2517,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 1.954,
        "marketCap": 124001598170,
        "enterpriseValue": 124001598170,
        "cryptoNav": 63460782000
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 1.315,
        "marketCap": 7181440140,
        "enterpriseValue": 7181440140,
        "cryptoNav": 5463040968
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 2.702,
        "marketCap": 4542600077,
        "enterpriseValue": 4542600077,
        "cryptoNav": 1680986160
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 2.736,
        "marketCap": 3441359917,
        "enterpriseValue": 3441359917,
        "cryptoNav": 1257732000
      },
      {
        "ticker": "KULR",
        "asset": "BTC",
        "mnav": 2.913,
        "marketCap": 293103916,
        "enterpriseValue": 293103916,
        "cryptoNav": 100618560
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.244,
        "marketCap": 55517599,
        "enterpriseValue": 55517599,
        "cryptoNav": 227922912
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 1.913,
        "marketCap": 2232000046,
        "enterpriseValue": 2232000046,
        "cryptoNav": 1166628456
      },
      {
        "ticker": "CORZ",
        "asset": "BTC",
        "mnav": 33.985,
        "marketCap": 5991569893,
        "enterpriseValue": 5991569893,
        "cryptoNav": 176301216
      },
      {
        "ticker": "BTDR",
        "asset": "BTC",
        "mnav": 14.536,
        "marketCap": 2387839905,
        "enterpriseValue": 2387839905,
        "cryptoNav": 164270736
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 23.077,
        "marketCap": 105716114,
        "enterpriseValue": 105716114,
        "cryptoNav": 4580940
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 8.74,
        "marketCap": 703937680,
        "enterpriseValue": 703937680,
        "cryptoNav": 80544000
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 1.1,
        "marketCap": 1439850044,
        "enterpriseValue": 1439850044,
        "cryptoNav": 1308840000
      },
      {
        "ticker": "ETHM",
        "asset": "ETH",
        "mnav": 0.427,
        "marketCap": 591599989,
        "enterpriseValue": 591599989,
        "cryptoNav": 1384350000
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 11.725,
        "marketCap": 1328000000,
        "enterpriseValue": 1328000000,
        "cryptoNav": 113265000
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 23.837,
        "marketCap": 1278399997,
        "enterpriseValue": 1278399997,
        "cryptoNav": 53630000
      },
      {
        "ticker": "DFDV",
        "asset": "SOL",
        "mnav": 3.032,
        "marketCap": 385920010,
        "enterpriseValue": 385920010,
        "cryptoNav": 127274716
      },
      {
        "ticker": "HSDT",
        "asset": "SOL",
        "mnav": 1.195,
        "marketCap": 455000019,
        "enterpriseValue": 455000019,
        "cryptoNav": 380600000
      },
      {
        "ticker": "UPXI",
        "asset": "SOL",
        "mnav": 0.656,
        "marketCap": 83440001,
        "enterpriseValue": 83440001,
        "cryptoNav": 127274716
      },
      {
        "ticker": "TAOX",
        "asset": "TAO",
        "mnav": 9.219,
        "marketCap": 204099998,
        "enterpriseValue": 204099998,
        "cryptoNav": 22140000
      },
      {
        "ticker": "LITS",
        "asset": "LTC",
        "mnav": 0.944,
        "marketCap": 85956001,
        "enterpriseValue": 85956001,
        "cryptoNav": 91042000
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 2.7,
        "marketCap": 30293999,
        "enterpriseValue": 30293999,
        "cryptoNav": 11220000
      },
      {
        "ticker": "SUIG",
        "asset": "SUI",
        "mnav": 0.185,
        "marketCap": 76860002,
        "enterpriseValue": 76860002,
        "cryptoNav": 414720000
      },
      {
        "ticker": "AVX",
        "asset": "AVAX",
        "mnav": 0.614,
        "marketCap": 245699999,
        "enterpriseValue": 245699999,
        "cryptoNav": 400200000
      },
      {
        "ticker": "TBH",
        "asset": "DOGE",
        "mnav": 0.271,
        "marketCap": 44196001,
        "enterpriseValue": 44196001,
        "cryptoNav": 162790000
      },
      {
        "ticker": "HYPD",
        "asset": "HYPE",
        "mnav": 4.333,
        "marketCap": 228360003,
        "enterpriseValue": 228360003,
        "cryptoNav": 52700000
      },
      {
        "ticker": "TRON",
        "asset": "TRX",
        "mnav": 4.945,
        "marketCap": 503750000,
        "enterpriseValue": 503750000,
        "cryptoNav": 101862020
      },
      {
        "ticker": "XRPN",
        "asset": "XRP",
        "mnav": 0.592,
        "marketCap": 683400013,
        "enterpriseValue": 683400013,
        "cryptoNav": 1154120000
      },
      {
        "ticker": "BNC",
        "asset": "BNB",
        "mnav": 4.649,
        "marketCap": 451889992,
        "enterpriseValue": 451889992,
        "cryptoNav": 97200000
      },
      {
        "ticker": "NA",
        "asset": "BNB",
        "mnav": 24.346,
        "marketCap": 788799977,
        "enterpriseValue": 788799977,
        "cryptoNav": 32400000
      },
      {
        "ticker": "TWAV",
        "asset": "TAO",
        "mnav": 13.646,
        "marketCap": 44760000,
        "enterpriseValue": 44760000,
        "cryptoNav": 3280000
      },
      {
        "ticker": "LUXFF",
        "asset": "LTC",
        "mnav": 37.106,
        "marketCap": 60000002,
        "enterpriseValue": 60000002,
        "cryptoNav": 1617000
      }
    ]
  },
  {
    "date": "2025-09-30",
    "median": 2.6089898494902757,
    "average": 7.652478398982195,
    "count": 42,
    "btcPrice": 64021,
    "ethPrice": 2547,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 2.509,
        "marketCap": 102949608035,
        "enterpriseValue": 102949608035,
        "cryptoNav": 41025168968
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 2.593,
        "marketCap": 8772625728,
        "enterpriseValue": 8772625728,
        "cryptoNav": 3383509850
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 7.147,
        "marketCap": 7974900677,
        "enterpriseValue": 7974900677,
        "cryptoNav": 1115822009
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 6,
        "marketCap": 4725091164,
        "enterpriseValue": 4725091164,
        "cryptoNav": 787458300
      },
      {
        "ticker": "KULR",
        "asset": "BTC",
        "mnav": 2.509,
        "marketCap": 192746043,
        "enterpriseValue": 192746043,
        "cryptoNav": 76825200
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 18.236,
        "marketCap": 4582479882,
        "enterpriseValue": 4582479882,
        "cryptoNav": 251282425
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.265,
        "marketCap": 34867758,
        "enterpriseValue": 34867758,
        "cryptoNav": 131755218
      },
      {
        "ticker": "HUT",
        "asset": "BTC",
        "mnav": 4.839,
        "marketCap": 4242727349,
        "enterpriseValue": 4242727349,
        "cryptoNav": 876831616
      },
      {
        "ticker": "CORZ",
        "asset": "BTC",
        "mnav": 45.542,
        "marketCap": 6169479973,
        "enterpriseValue": 6169479973,
        "cryptoNav": 135468436
      },
      {
        "ticker": "BTDR",
        "asset": "BTC",
        "mnav": 27.8,
        "marketCap": 3611212089,
        "enterpriseValue": 3611212089,
        "cryptoNav": 129898609
      },
      {
        "ticker": "DJT",
        "asset": "BTC",
        "mnav": 4.93,
        "marketCap": 4734759982,
        "enterpriseValue": 4734759982,
        "cryptoNav": 960315000
      },
      {
        "ticker": "XXI",
        "asset": "BTC",
        "mnav": 4.513,
        "marketCap": 12570000458,
        "enterpriseValue": 12570000458,
        "cryptoNav": 2785553710
      },
      {
        "ticker": "NAKA",
        "asset": "BTC",
        "mnav": 1.427,
        "marketCap": 526499981,
        "enterpriseValue": 526499981,
        "cryptoNav": 369081065
      },
      {
        "ticker": "NXTT",
        "asset": "BTC",
        "mnav": 5.729,
        "marketCap": 2237339993,
        "enterpriseValue": 2237339993,
        "cryptoNav": 390528100
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 45.078,
        "marketCap": 223888193,
        "enterpriseValue": 223888193,
        "cryptoNav": 4966650
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 11.455,
        "marketCap": 1035759475,
        "enterpriseValue": 1035759475,
        "cryptoNav": 90418500
      },
      {
        "ticker": "BMNR",
        "asset": "ETH",
        "mnav": 2.625,
        "marketCap": 13837200317,
        "enterpriseValue": 13837200317,
        "cryptoNav": 5270871321
      },
      {
        "ticker": "SBET",
        "asset": "ETH",
        "mnav": 1.416,
        "marketCap": 3106800041,
        "enterpriseValue": 3106800041,
        "cryptoNav": 2193606297
      },
      {
        "ticker": "ETHM",
        "asset": "ETH",
        "mnav": 0.418,
        "marketCap": 627600002,
        "enterpriseValue": 627600002,
        "cryptoNav": 1502730000
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 4.07,
        "marketCap": 526240002,
        "enterpriseValue": 526240002,
        "cryptoNav": 129311190
      },
      {
        "ticker": "STKE",
        "asset": "SOL",
        "mnav": 8.642,
        "marketCap": 556600018,
        "enterpriseValue": 556600018,
        "cryptoNav": 64403532
      },
      {
        "ticker": "DFDV",
        "asset": "SOL",
        "mnav": 1.516,
        "marketCap": 452760002,
        "enterpriseValue": 452760002,
        "cryptoNav": 298726012
      },
      {
        "ticker": "FWDI",
        "asset": "SOL",
        "mnav": 0.917,
        "marketCap": 927850008,
        "enterpriseValue": 927850008,
        "cryptoNav": 1011506888
      },
      {
        "ticker": "HSDT",
        "asset": "SOL",
        "mnav": 2.017,
        "marketCap": 835779991,
        "enterpriseValue": 835779991,
        "cryptoNav": 414400000
      },
      {
        "ticker": "UPXI",
        "asset": "SOL",
        "mnav": 1.108,
        "marketCap": 330954802,
        "enterpriseValue": 330954802,
        "cryptoNav": 298726012
      },
      {
        "ticker": "TAOX",
        "asset": "TAO",
        "mnav": 7.9,
        "marketCap": 175840006,
        "enterpriseValue": 175840006,
        "cryptoNav": 22258000
      },
      {
        "ticker": "XTAIF",
        "asset": "TAO",
        "mnav": 0.832,
        "marketCap": 19425000,
        "enterpriseValue": 19425000,
        "cryptoNav": 23335000
      },
      {
        "ticker": "LITS",
        "asset": "LTC",
        "mnav": 1.215,
        "marketCap": 90564092,
        "enterpriseValue": 90564092,
        "cryptoNav": 74550000
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 3.733,
        "marketCap": 37800002,
        "enterpriseValue": 37800002,
        "cryptoNav": 10125000
      },
      {
        "ticker": "CWD",
        "asset": "LINK",
        "mnav": 17.505,
        "marketCap": 105600004,
        "enterpriseValue": 105600004,
        "cryptoNav": 6032453
      },
      {
        "ticker": "SUIG",
        "asset": "SUI",
        "mnav": 0.904,
        "marketCap": 193919998,
        "enterpriseValue": 193919998,
        "cryptoNav": 214500000
      },
      {
        "ticker": "AVX",
        "asset": "AVAX",
        "mnav": 0.325,
        "marketCap": 128800001,
        "enterpriseValue": 128800001,
        "cryptoNav": 396000000
      },
      {
        "ticker": "ZONE",
        "asset": "DOGE",
        "mnav": 1.334,
        "marketCap": 106079998,
        "enterpriseValue": 106079998,
        "cryptoNav": 79508806
      },
      {
        "ticker": "TBH",
        "asset": "DOGE",
        "mnav": 1.118,
        "marketCap": 98580002,
        "enterpriseValue": 98580002,
        "cryptoNav": 88140000
      },
      {
        "ticker": "HYPD",
        "asset": "HYPE",
        "mnav": 5.805,
        "marketCap": 255999994,
        "enterpriseValue": 255999994,
        "cryptoNav": 44100000
      },
      {
        "ticker": "TRON",
        "asset": "TRX",
        "mnav": 1.611,
        "marketCap": 176799994,
        "enterpriseValue": 176799994,
        "cryptoNav": 109770705
      },
      {
        "ticker": "XRPN",
        "asset": "XRP",
        "mnav": 2.559,
        "marketCap": 785250020,
        "enterpriseValue": 785250020,
        "cryptoNav": 306800000
      },
      {
        "ticker": "BNC",
        "asset": "BNB",
        "mnav": 2.438,
        "marketCap": 436149991,
        "enterpriseValue": 436149991,
        "cryptoNav": 178880000
      },
      {
        "ticker": "NA",
        "asset": "BNB",
        "mnav": 9.819,
        "marketCap": 493999982,
        "enterpriseValue": 493999982,
        "cryptoNav": 50310000
      },
      {
        "ticker": "TWAV",
        "asset": "TAO",
        "mnav": 7.214,
        "marketCap": 38849999,
        "enterpriseValue": 38849999,
        "cryptoNav": 5385000
      },
      {
        "ticker": "LUXFF",
        "asset": "LTC",
        "mnav": 41.502,
        "marketCap": 53039999,
        "enterpriseValue": 53039999,
        "cryptoNav": 1278000
      },
      {
        "ticker": "IHLDF",
        "asset": "HBAR",
        "mnav": 2.286,
        "marketCap": 4400000,
        "enterpriseValue": 4400000,
        "cryptoNav": 1925000
      }
    ]
  },
  {
    "date": "2025-12-31",
    "median": 2.339001064912961,
    "average": 4.028974266477087,
    "count": 26,
    "btcPrice": 93000,
    "ethPrice": 3300,
    "companies": [
      {
        "ticker": "MSTR",
        "asset": "BTC",
        "mnav": 0.778,
        "marketCap": 51351300201,
        "enterpriseValue": 51351300201,
        "cryptoNav": 66030000000
      },
      {
        "ticker": "MARA",
        "asset": "BTC",
        "mnav": 0.866,
        "marketCap": 4525049963,
        "enterpriseValue": 4525049963,
        "cryptoNav": 5226600000
      },
      {
        "ticker": "RIOT",
        "asset": "BTC",
        "mnav": 2.862,
        "marketCap": 5270499921,
        "enterpriseValue": 5270499921,
        "cryptoNav": 1841400000
      },
      {
        "ticker": "CLSK",
        "asset": "BTC",
        "mnav": 2.78,
        "marketCap": 3386500025,
        "enterpriseValue": 3386500025,
        "cryptoNav": 1218207000
      },
      {
        "ticker": "KULR",
        "asset": "BTC",
        "mnav": 1.086,
        "marketCap": 146399998,
        "enterpriseValue": 146399998,
        "cryptoNav": 134850000
      },
      {
        "ticker": "0434.HK",
        "asset": "BTC",
        "mnav": 5.927,
        "marketCap": 2397750033,
        "enterpriseValue": 2397750033,
        "cryptoNav": 404550000
      },
      {
        "ticker": "ASST",
        "asset": "BTC",
        "mnav": 0.055,
        "marketCap": 11712000,
        "enterpriseValue": 11712000,
        "cryptoNav": 213900000
      },
      {
        "ticker": "BTDR",
        "asset": "BTC",
        "mnav": 11.779,
        "marketCap": 2387000084,
        "enterpriseValue": 2387000084,
        "cryptoNav": 202647000
      },
      {
        "ticker": "DJT",
        "asset": "BTC",
        "mnav": 3.337,
        "marketCap": 3582449913,
        "enterpriseValue": 3582449913,
        "cryptoNav": 1073406000
      },
      {
        "ticker": "XXI",
        "asset": "BTC",
        "mnav": 1.456,
        "marketCap": 5891550124,
        "enterpriseValue": 5891550124,
        "cryptoNav": 4046802000
      },
      {
        "ticker": "ABTC",
        "asset": "BTC",
        "mnav": 3.338,
        "marketCap": 1582400026,
        "enterpriseValue": 1582400026,
        "cryptoNav": 474114000
      },
      {
        "ticker": "BTCS",
        "asset": "ETH",
        "mnav": 18.771,
        "marketCap": 130080002,
        "enterpriseValue": 130080002,
        "cryptoNav": 6930000
      },
      {
        "ticker": "BTBT",
        "asset": "ETH",
        "mnav": 5.079,
        "marketCap": 636899983,
        "enterpriseValue": 636899983,
        "cryptoNav": 125400000
      },
      {
        "ticker": "BMNR",
        "asset": "ETH",
        "mnav": 0.869,
        "marketCap": 11780999708,
        "enterpriseValue": 11780999708,
        "cryptoNav": 13564732500
      },
      {
        "ticker": "FGNX",
        "asset": "ETH",
        "mnav": 1.898,
        "marketCap": 251099997,
        "enterpriseValue": 251099997,
        "cryptoNav": 132290400
      },
      {
        "ticker": "DFDV",
        "asset": "SOL",
        "mnav": 0.36,
        "marketCap": 151799998,
        "enterpriseValue": 151799998,
        "cryptoNav": 421200000
      },
      {
        "ticker": "FWDI",
        "asset": "SOL",
        "mnav": 0.19,
        "marketCap": 263199997,
        "enterpriseValue": 263199997,
        "cryptoNav": 1384268400
      },
      {
        "ticker": "UPXI",
        "asset": "SOL",
        "mnav": 0.258,
        "marketCap": 108500000,
        "enterpriseValue": 108500000,
        "cryptoNav": 421200000
      },
      {
        "ticker": "CYPH",
        "asset": "ZEC",
        "mnav": 9.733,
        "marketCap": 163749993,
        "enterpriseValue": 163749993,
        "cryptoNav": 16823654
      },
      {
        "ticker": "CWD",
        "asset": "LINK",
        "mnav": 2.899,
        "marketCap": 35874999,
        "enterpriseValue": 35874999,
        "cryptoNav": 12375770
      },
      {
        "ticker": "BNC",
        "asset": "BNB",
        "mnav": 1.19,
        "marketCap": 422500000,
        "enterpriseValue": 422500000,
        "cryptoNav": 355000000
      },
      {
        "ticker": "NA",
        "asset": "BNB",
        "mnav": 3.458,
        "marketCap": 319199996,
        "enterpriseValue": 319199996,
        "cryptoNav": 92300000
      },
      {
        "ticker": "CEPO",
        "asset": "BTC",
        "mnav": 0.54,
        "marketCap": 1507999945,
        "enterpriseValue": 1507999945,
        "cryptoNav": 2791953000
      },
      {
        "ticker": "TWAV",
        "asset": "TAO",
        "mnav": 3.11,
        "marketCap": 32760001,
        "enterpriseValue": 32760001,
        "cryptoNav": 10532640
      },
      {
        "ticker": "LUXFF",
        "asset": "LTC",
        "mnav": 21.838,
        "marketCap": 46052602,
        "enterpriseValue": 46052602,
        "cryptoNav": 2108820
      },
      {
        "ticker": "IHLDF",
        "asset": "HBAR",
        "mnav": 0.297,
        "marketCap": 4277000,
        "enterpriseValue": 4277000,
        "cryptoNav": 14400000
      }
    ]
  }
];
