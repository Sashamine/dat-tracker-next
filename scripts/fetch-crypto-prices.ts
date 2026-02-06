/**
 * Fetch historical crypto prices from CryptoCompare
 * Stores them in data/crypto-prices.json for use by mNAV generator
 */

import * as fs from "fs";
import * as path from "path";

// CryptoCompare symbols
const CRYPTO_SYMBOLS = [
  "BTC", "ETH", "SOL", "TAO", "LTC", "ZEC", "LINK", 
  "SUI", "AVAX", "DOGE", "TRX", "XRP", "BNB", "HBAR", "ADA"
];

interface PriceData {
  [date: string]: {
    [asset: string]: number;
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchDailyPrices(symbol: string, days: number): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol}&tsym=USD&limit=${days}`;
  
  console.log(`  Fetching ${symbol}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    Error: ${response.status}`);
      return prices;
    }
    
    const data = await response.json();
    
    if (data.Response === "Error") {
      console.log(`    Error: ${data.Message}`);
      return prices;
    }
    
    for (const day of data.Data?.Data || []) {
      const date = new Date(day.time * 1000).toISOString().split("T")[0];
      if (day.close > 0) {
        prices.set(date, day.close);
      }
    }
    
    console.log(`    Got ${prices.size} daily prices`);
  } catch (e) {
    console.log(`    Error: ${e}`);
  }
  
  return prices;
}

async function main() {
  console.log("Fetching historical crypto prices from CryptoCompare...\n");
  
  // Fetch ~2 years of data (730 days)
  const days = 730;
  
  const allPrices: PriceData = {};
  
  // Fetch each coin
  for (const symbol of CRYPTO_SYMBOLS) {
    const prices = await fetchDailyPrices(symbol, days);
    
    for (const [date, price] of prices) {
      if (!allPrices[date]) {
        allPrices[date] = {};
      }
      allPrices[date][symbol] = price;
    }
    
    // Small delay to be nice to the API
    await delay(500);
  }
  
  // Sort by date
  const sortedDates = Object.keys(allPrices).sort();
  const sortedPrices: PriceData = {};
  for (const date of sortedDates) {
    sortedPrices[date] = allPrices[date];
  }
  
  // Write to file
  const outputPath = path.join(__dirname, "../data/crypto-prices.json");
  fs.writeFileSync(outputPath, JSON.stringify(sortedPrices, null, 2));
  
  console.log(`\nWrote ${sortedDates.length} days of prices to ${outputPath}`);
  console.log(`First date: ${sortedDates[0]}`);
  console.log(`Last date: ${sortedDates[sortedDates.length - 1]}`);
  
  // Show sample
  const lastDate = sortedDates[sortedDates.length - 1];
  console.log(`\nSample (${lastDate}):`);
  console.log(sortedPrices[lastDate]);
}

main().catch(console.error);
