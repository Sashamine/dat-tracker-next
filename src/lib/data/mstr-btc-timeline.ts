/**
 * MSTR BTC Acquisition Timeline
 * 
 * Auto-generated from SEC 8-K filings (Aug 2020 - Feb 2026)
 * Source: data/sec/mstr/btc-events-clean.json
 * Generated: 2026-02-03
 * 
 * Each event includes filing reference for verification.
 * Use with mNAV chart to show treasury input events.
 */

export interface BTCAcquisitionEvent {
  date: string;                    // YYYY-MM-DD filing date
  btcAcquired: number;             // BTC purchased in this event
  avgPriceUsd: number | null;      // Average price per BTC
  cumulativeHoldings: number;      // Running total after this event
  filingAccession: string;         // SEC accession suffix (6 digits)
}

export const MSTR_BTC_TIMELINE: BTCAcquisitionEvent[] = [
  { date: "2020-08-11", btcAcquired: 21454, avgPriceUsd: null, cumulativeHoldings: 21454, filingAccession: "215604" },
  { date: "2020-09-15", btcAcquired: 21454, avgPriceUsd: null, cumulativeHoldings: 42908, filingAccession: "245835" },
  { date: "2022-04-05", btcAcquired: 4167, avgPriceUsd: 45714, cumulativeHoldings: 47075, filingAccession: "095632" },
  { date: "2022-06-29", btcAcquired: 480, avgPriceUsd: 20817, cumulativeHoldings: 47555, filingAccession: "184423" },
  { date: "2022-09-20", btcAcquired: 301, avgPriceUsd: 19851, cumulativeHoldings: 47856, filingAccession: "247427" },
  { date: "2022-12-28", btcAcquired: 2395, avgPriceUsd: 17871, cumulativeHoldings: 50251, filingAccession: "313098" },
  { date: "2023-03-27", btcAcquired: 6455, avgPriceUsd: 23238, cumulativeHoldings: 56706, filingAccession: "079839" },
  { date: "2023-04-05", btcAcquired: 1045, avgPriceUsd: 28016, cumulativeHoldings: 57751, filingAccession: "091616" },
  { date: "2023-06-28", btcAcquired: 12333, avgPriceUsd: 28136, cumulativeHoldings: 70084, filingAccession: "176793" },
  { date: "2023-09-25", btcAcquired: 5445, avgPriceUsd: 27053, cumulativeHoldings: 75529, filingAccession: "240932" },
  { date: "2023-11-30", btcAcquired: 16130, avgPriceUsd: 36785, cumulativeHoldings: 91659, filingAccession: "285756" },
  { date: "2023-12-27", btcAcquired: 14620, avgPriceUsd: 42110, cumulativeHoldings: 106279, filingAccession: "303488" },
  { date: "2024-02-26", btcAcquired: 3000, avgPriceUsd: 51813, cumulativeHoldings: 109279, filingAccession: "045396" },
  { date: "2024-03-11", btcAcquired: 12000, avgPriceUsd: 68477, cumulativeHoldings: 121279, filingAccession: "064331" },
  { date: "2024-03-19", btcAcquired: 9245, avgPriceUsd: 67382, cumulativeHoldings: 130524, filingAccession: "070801" },
  { date: "2024-06-20", btcAcquired: 11931, avgPriceUsd: 65883, cumulativeHoldings: 142455, filingAccession: "164014" },
  { date: "2024-09-13", btcAcquired: 18300, avgPriceUsd: 60408, cumulativeHoldings: 160755, filingAccession: "218462" },
  { date: "2024-09-20", btcAcquired: 7420, avgPriceUsd: 61750, cumulativeHoldings: 168175, filingAccession: "222498" },
  { date: "2024-11-12", btcAcquired: 27200, avgPriceUsd: 74463, cumulativeHoldings: 195375, filingAccession: "255184" },
  { date: "2024-11-18", btcAcquired: 51780, avgPriceUsd: 88627, cumulativeHoldings: 247155, filingAccession: "260452" },
  { date: "2024-11-25", btcAcquired: 55500, avgPriceUsd: 97862, cumulativeHoldings: 302655, filingAccession: "264733" },
  { date: "2024-12-02", btcAcquired: 15400, avgPriceUsd: 95976, cumulativeHoldings: 318055, filingAccession: "268429" },
  { date: "2024-12-09", btcAcquired: 21550, avgPriceUsd: 98783, cumulativeHoldings: 339605, filingAccession: "272923" },
  { date: "2024-12-16", btcAcquired: 15350, avgPriceUsd: 100386, cumulativeHoldings: 354955, filingAccession: "279044" },
  { date: "2024-12-23", btcAcquired: 5262, avgPriceUsd: 106662, cumulativeHoldings: 360217, filingAccession: "283686" },
  { date: "2024-12-30", btcAcquired: 2138, avgPriceUsd: 97837, cumulativeHoldings: 362355, filingAccession: "286217" },
  { date: "2025-01-06", btcAcquired: 1070, avgPriceUsd: 94004, cumulativeHoldings: 363425, filingAccession: "001854" },
  { date: "2025-01-13", btcAcquired: 2530, avgPriceUsd: 95972, cumulativeHoldings: 365955, filingAccession: "005000" },
  { date: "2025-01-21", btcAcquired: 11000, avgPriceUsd: 101191, cumulativeHoldings: 376955, filingAccession: "009102" },
  { date: "2025-01-27", btcAcquired: 10107, avgPriceUsd: 105596, cumulativeHoldings: 387062, filingAccession: "012671" },
  { date: "2025-02-10", btcAcquired: 7633, avgPriceUsd: 97255, cumulativeHoldings: 394695, filingAccession: "023183" },
  { date: "2025-02-24", btcAcquired: 20356, avgPriceUsd: 97514, cumulativeHoldings: 415051, filingAccession: "025233" },
  { date: "2025-03-17", btcAcquired: 130, avgPriceUsd: 82981, cumulativeHoldings: 415181, filingAccession: "039835" },
  { date: "2025-03-24", btcAcquired: 6911, avgPriceUsd: 84529, cumulativeHoldings: 422092, filingAccession: "043494" },
  { date: "2025-06-09", btcAcquired: 1045, avgPriceUsd: 105426, cumulativeHoldings: 423137, filingAccession: "083448" },
  { date: "2025-06-16", btcAcquired: 10100, avgPriceUsd: 104080, cumulativeHoldings: 433237, filingAccession: "086545" },
  { date: "2025-06-23", btcAcquired: 245, avgPriceUsd: 105856, cumulativeHoldings: 433482, filingAccession: "088711" },
  { date: "2025-06-30", btcAcquired: 4980, avgPriceUsd: 106801, cumulativeHoldings: 438462, filingAccession: "091211" },
  { date: "2025-07-14", btcAcquired: 4225, avgPriceUsd: 111827, cumulativeHoldings: 442687, filingAccession: "095461" },
  { date: "2025-07-21", btcAcquired: 6220, avgPriceUsd: 118940, cumulativeHoldings: 448907, filingAccession: "097081" },
  { date: "2025-08-04", btcAcquired: 21021, avgPriceUsd: 117256, cumulativeHoldings: 469928, filingAccession: "101634" },
  { date: "2025-08-11", btcAcquired: 155, avgPriceUsd: 116401, cumulativeHoldings: 470083, filingAccession: "106241" },
  { date: "2025-08-18", btcAcquired: 430, avgPriceUsd: 119666, cumulativeHoldings: 470513, filingAccession: "109566" },
  { date: "2025-08-25", btcAcquired: 3081, avgPriceUsd: 115829, cumulativeHoldings: 473594, filingAccession: "111093" },
  { date: "2025-09-02", btcAcquired: 4048, avgPriceUsd: 110981, cumulativeHoldings: 477642, filingAccession: "000008" },
  { date: "2025-09-08", btcAcquired: 1955, avgPriceUsd: 111196, cumulativeHoldings: 479597, filingAccession: "113360" },
  { date: "2025-09-15", btcAcquired: 525, avgPriceUsd: 114562, cumulativeHoldings: 480122, filingAccession: "202827" },
  { date: "2025-09-22", btcAcquired: 850, avgPriceUsd: 117344, cumulativeHoldings: 480972, filingAccession: "210048" },
  { date: "2025-09-29", btcAcquired: 196, avgPriceUsd: 113048, cumulativeHoldings: 481168, filingAccession: "221772" },
  { date: "2025-10-20", btcAcquired: 168, avgPriceUsd: 112051, cumulativeHoldings: 481336, filingAccession: "243049" },
  { date: "2025-10-27", btcAcquired: 390, avgPriceUsd: 111117, cumulativeHoldings: 481726, filingAccession: "250751" },
  { date: "2025-11-03", btcAcquired: 397, avgPriceUsd: 114771, cumulativeHoldings: 482123, filingAccession: "261714" },
  { date: "2025-11-10", btcAcquired: 487, avgPriceUsd: 102557, cumulativeHoldings: 482610, filingAccession: "273310" },
  { date: "2025-11-17", btcAcquired: 8178, avgPriceUsd: 102171, cumulativeHoldings: 490788, filingAccession: "283991" },
  { date: "2025-12-01", btcAcquired: 130, avgPriceUsd: 89960, cumulativeHoldings: 490918, filingAccession: "303157" },
  { date: "2025-12-08", btcAcquired: 10624, avgPriceUsd: 90615, cumulativeHoldings: 501542, filingAccession: "310607" },
  { date: "2025-12-15", btcAcquired: 10645, avgPriceUsd: 92098, cumulativeHoldings: 512187, filingAccession: "318468" },
  { date: "2025-12-29", btcAcquired: 1229, avgPriceUsd: 88568, cumulativeHoldings: 513416, filingAccession: "332296" },
  { date: "2026-01-05", btcAcquired: 3, avgPriceUsd: 88210, cumulativeHoldings: 513419, filingAccession: "001550" },
  { date: "2026-01-12", btcAcquired: 13627, avgPriceUsd: 91519, cumulativeHoldings: 527046, filingAccession: "009811" },
  { date: "2026-01-20", btcAcquired: 22305, avgPriceUsd: 95284, cumulativeHoldings: 549351, filingAccession: "016002" },
  { date: "2026-01-26", btcAcquired: 2932, avgPriceUsd: 90061, cumulativeHoldings: 552283, filingAccession: "021726" },
  { date: "2026-02-02", btcAcquired: 855, avgPriceUsd: 87974, cumulativeHoldings: 553138, filingAccession: "032731" },
];

// Helper to get SEC filing URL
export function getFilingUrl(accession: string): string {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=&owner=include&count=40`;
}

// Stats
export const TIMELINE_STATS = {
  totalEvents: 63,
  totalBtcAcquired: 553138,
  dateRange: { start: "2020-08-11", end: "2026-02-02" },
  lastUpdated: "2026-02-03"
};
