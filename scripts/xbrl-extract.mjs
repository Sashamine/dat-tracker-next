#!/usr/bin/env node
/**
 * xbrl-extract.mjs — Extract key financial fields from SEC XBRL API
 * Usage: node scripts/xbrl-extract.mjs <CIK> [--period YYYY-MM-DD] [--filing 10-Q]
 * Returns only the values needed for provenance files
 */

const args = process.argv.slice(2);
const cik = args[0];
if (!cik) { console.error("Usage: node scripts/xbrl-extract.mjs <CIK> [--period YYYY-MM-DD] [--filing 10-Q]"); process.exit(1); }

const periodIdx = args.indexOf("--period");
const filingIdx = args.indexOf("--filing");
const period = periodIdx >= 0 ? args[periodIdx + 1] : null;
const filing = filingIdx >= 0 ? args[filingIdx + 1] : null;

const paddedCIK = cik.padStart(10, "0");
const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCIK}.json`;

const tags = [
  // Balance Sheet (instant)
  ["us-gaap", "Assets", "Total Assets"],
  ["us-gaap", "AssetsCurrent", "Current Assets"],
  ["us-gaap", "CashAndCashEquivalentsAtCarryingValue", "Cash (unrestricted)"],
  ["us-gaap", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "Cash (incl restricted)"],
  ["us-gaap", "Liabilities", "Total Liabilities"],
  ["us-gaap", "LiabilitiesCurrent", "Current Liabilities"],
  ["us-gaap", "LongTermDebt", "Long-Term Debt"],
  ["us-gaap", "LongTermDebtNoncurrent", "LT Debt (Noncurrent)"],
  ["us-gaap", "ConvertibleNotesPayable", "Convertible Notes"],
  ["us-gaap", "StockholdersEquity", "Stockholders Equity"],
  // Crypto
  ["us-gaap", "CryptoAssetFairValueCurrent", "Crypto FV (Current)"],
  ["us-gaap", "CryptoAssetFairValueNoncurrent", "Crypto FV (Noncurrent)"],
  ["us-gaap", "CryptoAssetNumberOfUnits", "Crypto Units"],
  // Income (duration)
  ["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax", "Revenue"],
  ["us-gaap", "Revenues", "Revenues (alt)"],
  ["us-gaap", "ProfitLoss", "Profit/Loss"],
  ["us-gaap", "NetIncomeLoss", "Net Income/Loss"],
  ["us-gaap", "OperatingIncomeLoss", "Operating Income/Loss"],
  // Cash Flow (duration)
  ["us-gaap", "NetCashProvidedByUsedInOperatingActivities", "Operating CF"],
  ["us-gaap", "NetCashProvidedByUsedInFinancingActivities", "Financing CF"],
  // Burn
  ["us-gaap", "GeneralAndAdministrativeExpense", "G&A Expense"],
  ["us-gaap", "OperatingExpenses", "Operating Expenses"],
  // Shares
  ["us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding", "Diluted Shares (wtd avg)"],
  ["us-gaap", "CommonStockSharesOutstanding", "Common Shares Outstanding"],
  ["dei", "EntityCommonStockSharesOutstanding", "Shares (cover page)"],
];

const fmt = (val, unit) => {
  if (unit === "USD") return "$" + val.toLocaleString("en-US");
  return val.toLocaleString("en-US");
};

async function main() {
  const res = await fetch(url, { headers: { "User-Agent": "DATCAP/1.0 admin@datcap.io" } });
  if (!res.ok) { console.error(`HTTP ${res.status}`); process.exit(1); }
  const json = await res.json();

  console.log(`\n=== ${json.entityName} (CIK ${cik}) ===\n`);

  for (const [ns, tag, label] of tags) {
    const facts = json.facts?.[ns]?.[tag];
    if (!facts) continue;

    const unitKey = Object.keys(facts.units)[0];
    let entries = facts.units[unitKey];

    if (filing) entries = entries.filter(e => e.form === filing);
    if (period) entries = entries.filter(e => e.end === period);

    if (entries.length === 0) continue;

    // Sort by filed date desc, take latest few
    entries.sort((a, b) => b.filed.localeCompare(a.filed));
    entries = entries.slice(0, 5);

    console.log(`--- ${label} (${ns}:${tag}) [${unitKey}] ---`);
    for (const e of entries) {
      const val = fmt(e.val, unitKey);
      const per = e.start ? `${e.start} to ${e.end}` : `as of ${e.end}`;
      console.log(`  ${val} | ${per} | ${e.form} filed ${e.filed} | accn: ${e.accn}`);
    }
    console.log("");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
