/**
 * Backfill Historical Stock Prices
 * 
 * Fetches historical stock prices for all holdings snapshots and updates holdings-history.ts
 * 
 * Usage: FMP_API_KEY=xxx npx tsx scripts/backfill-stock-prices.ts
 * 
 * Options:
 *   --dry-run    Output review file without writing to holdings-history.ts
 *   --ticker=X   Only process specific ticker
 */

import * as fs from "fs";
import * as path from "path";

const FMP_API_KEY = process.env.FMP_API_KEY;
if (!FMP_API_KEY) {
  console.error("ERROR: FMP_API_KEY environment variable required");
  process.exit(1);
}

// Rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Ticker mappings for FMP
const FMP_TICKER_MAP: Record<string, string> = {
  "3350.T": "3350.T",      // Metaplanet (Tokyo)
  "0434.HK": "0434.HK",    // Boyaa (Hong Kong)
  "H100.ST": "HOGPF",      // H100 Group - use OTC ticker
  "ALTBG": "ALTBG.PA",     // Blockchain Group (Paris)
  "DCC.AX": "DCC.AX",      // DigitalX (Australia)
  "SWC": "TSWCF",          // Smarter Web (OTC)
  "ETHM": "ETHM",          // Ethereum Capital (Toronto)
};

// Currency for international tickers
const TICKER_CURRENCY: Record<string, string> = {
  "3350.T": "JPY",
  "0434.HK": "HKD",
  "H100.ST": "SEK",
  "ALTBG": "EUR",
  "DCC.AX": "AUD",
  "SWC": "GBP",
  "ETHM": "CAD",
};

// Cache for forex rates
const forexCache: Map<string, number> = new Map();

interface PriceResult {
  ticker: string;
  date: string;
  price: number | null;
  priceUSD: number | null;
  currency: string;
  forexRate: number | null;
  source: string;
  error?: string;
}

// Fetch historical forex rate from FMP
async function getForexRate(currency: string, date: string): Promise<number | null> {
  if (currency === "USD") return 1;
  
  const cacheKey = `${currency}-${date}`;
  if (forexCache.has(cacheKey)) {
    return forexCache.get(cacheKey)!;
  }
  
  try {
    // FMP historical forex endpoint
    const pair = `USD${currency}`;
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${pair}?from=${date}&to=${date}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.historical || data.historical.length === 0) {
      // Try nearby dates
      const nearbyUrl = `https://financialmodelingprep.com/api/v3/historical-price-full/${pair}?from=${getDateOffset(date, -7)}&to=${getDateOffset(date, 7)}&apikey=${FMP_API_KEY}`;
      const nearbyResponse = await fetch(nearbyUrl);
      if (!nearbyResponse.ok) return null;
      
      const nearbyData = await nearbyResponse.json();
      if (!nearbyData.historical || nearbyData.historical.length === 0) return null;
      
      // Find closest date
      const targetTime = new Date(date).getTime();
      let closest = nearbyData.historical[0];
      let minDiff = Math.abs(new Date(closest.date).getTime() - targetTime);
      
      for (const h of nearbyData.historical) {
        const diff = Math.abs(new Date(h.date).getTime() - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closest = h;
        }
      }
      
      const rate = closest.close;
      forexCache.set(cacheKey, rate);
      return rate;
    }
    
    const rate = data.historical[0].close;
    forexCache.set(cacheKey, rate);
    return rate;
  } catch (error) {
    console.error(`  Forex error for ${currency}/${date}:`, error);
    return null;
  }
}

function getDateOffset(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Fetch historical stock price from FMP
async function fetchFMPPrice(ticker: string, date: string): Promise<{ price: number; date: string } | null> {
  const fmpTicker = FMP_TICKER_MAP[ticker] || ticker;
  
  try {
    // Get price for date range around target
    const fromDate = getDateOffset(date, -7);
    const toDate = getDateOffset(date, 7);
    
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${fmpTicker}?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  FMP error for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (!data.historical || data.historical.length === 0) {
      return null;
    }
    
    // Find closest date
    const targetTime = new Date(date).getTime();
    let closest = data.historical[0];
    let minDiff = Math.abs(new Date(closest.date).getTime() - targetTime);
    
    for (const h of data.historical) {
      const diff = Math.abs(new Date(h.date).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = h;
      }
    }
    
    // Reject if more than 5 days off
    if (minDiff > 5 * 24 * 60 * 60 * 1000) {
      console.error(`  FMP: No price within 5 days of ${date} for ${ticker}`);
      return null;
    }
    
    return { price: closest.close, date: closest.date };
  } catch (error) {
    console.error(`  FMP fetch error for ${ticker}:`, error);
    return null;
  }
}

// Fetch from Yahoo as backup/validation
async function fetchYahooPrice(ticker: string, date: string): Promise<number | null> {
  try {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 7);

    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result?.indicators?.quote?.[0]?.close) return null;

    const closes = result.indicators.quote[0].close;
    const timestamps = result.timestamp;

    const targetTs = targetDate.getTime() / 1000;
    let closestIdx = 0;
    let minDiff = Infinity;

    for (let i = 0; i < timestamps.length; i++) {
      const diff = Math.abs(timestamps[i] - targetTs);
      if (diff < minDiff && closes[i] != null) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    return closes[closestIdx] || null;
  } catch {
    return null;
  }
}

// Parse holdings-history.ts to extract snapshot dates
function parseHoldingsHistory(): Map<string, string[]> {
  const filePath = path.join(__dirname, "../src/lib/data/holdings-history.ts");
  const content = fs.readFileSync(filePath, "utf-8");
  
  const tickerDates = new Map<string, string[]>();
  
  // Match each *_HISTORY array
  const historyRegex = /const (\w+)_HISTORY: HoldingsSnapshot\[\] = \[([\s\S]*?)\];/g;
  let match;
  
  while ((match = historyRegex.exec(content)) !== null) {
    const varName = match[1];
    const arrayContent = match[2];
    
    // Extract dates and check for existing stockPrice
    const entryRegex = /\{\s*date:\s*"([^"]+)"[^}]*?(stockPrice:\s*[\d.]+)?[^}]*\}/g;
    let entryMatch;
    const dates: string[] = [];
    
    while ((entryMatch = entryRegex.exec(arrayContent)) !== null) {
      const date = entryMatch[1];
      const hasPrice = !!entryMatch[2];
      
      if (!hasPrice) {
        dates.push(date);
      }
    }
    
    if (dates.length > 0) {
      // Map variable name to ticker
      const ticker = varNameToTicker(varName);
      tickerDates.set(ticker, dates);
    }
  }
  
  return tickerDates;
}

function varNameToTicker(varName: string): string {
  const map: Record<string, string> = {
    "METAPLANET": "3350.T",
    "BOYAA": "0434.HK",
    "H100": "H100.ST",
  };
  return map[varName] || varName;
}

// Main function
async function backfillPrices() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const tickerFilter = args.find(a => a.startsWith("--ticker="))?.split("=")[1];
  const phase1Only = args.includes("--phase1");
  
  // Phase 1 tickers (highest priority)
  const PHASE1_TICKERS = ["MSTR", "MARA", "RIOT", "CLSK", "3350.T", "METAPLANET"];
  
  console.log("Backfilling Historical Stock Prices");
  console.log("===================================");
  console.log(`Mode: ${dryRun ? "DRY RUN (review only)" : "LIVE (will update files)"}`);
  console.log(`Started: ${new Date().toISOString()}`);
  if (tickerFilter) console.log(`Filter: ${tickerFilter} only`);
  if (phase1Only) console.log(`Phase 1 only: ${PHASE1_TICKERS.join(", ")}`);
  console.log("");
  
  const tickerDates = parseHoldingsHistory();
  
  // Load existing progress if any
  const progressPath = path.join(__dirname, "../stock-prices-progress.json");
  let results: PriceResult[] = [];
  const completed = new Set<string>();
  
  if (fs.existsSync(progressPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(progressPath, "utf-8"));
      results = existing.results || [];
      for (const r of results) {
        completed.add(`${r.ticker}:${r.date}`);
      }
      console.log(`Resuming: Found ${results.length} existing results\n`);
    } catch (e) {
      console.log("Starting fresh (couldn't parse progress file)\n");
    }
  }
  
  let totalSnapshots = 0;
  let totalRemaining = 0;
  for (const [ticker, dates] of tickerDates) {
    if (tickerFilter && ticker !== tickerFilter) continue;
    if (phase1Only && !PHASE1_TICKERS.includes(ticker)) continue;
    totalSnapshots += dates.length;
    for (const date of dates) {
      if (!completed.has(`${ticker}:${date}`)) totalRemaining++;
    }
  }
  
  console.log(`Found ${totalSnapshots} total snapshots, ${totalRemaining} remaining\n`);
  
  let processed = 0;
  
  for (const [ticker, dates] of tickerDates) {
    if (tickerFilter && ticker !== tickerFilter) continue;
    if (phase1Only && !PHASE1_TICKERS.includes(ticker)) continue;
    
    const remainingDates = dates.filter(d => !completed.has(`${ticker}:${d}`));
    if (remainingDates.length === 0) {
      console.log(`\n${ticker}: Already complete, skipping`);
      continue;
    }
    
    console.log(`\n${ticker} (${remainingDates.length} dates remaining):`);
    const currency = TICKER_CURRENCY[ticker] || "USD";
    
    for (const date of remainingDates) {
      processed++;
      process.stdout.write(`  [${processed}/${totalRemaining}] ${date}... `);
      
      // Try Yahoo first for US stocks, FMP for international
      let price: number | null = null;
      let source = "none";
      
      if (currency === "USD" && !ticker.includes(".")) {
        // US stock - use Yahoo
        price = await fetchYahooPrice(ticker, date);
        await delay(300);
        source = "yahoo";
      }
      
      if (price === null) {
        // Try FMP
        const fmpResult = await fetchFMPPrice(ticker, date);
        await delay(300);
        if (fmpResult) {
          price = fmpResult.price;
          source = "fmp";
        }
      }
      
      if (price === null) {
        console.log("❌ No data");
        results.push({
          ticker,
          date,
          price: null,
          priceUSD: null,
          currency,
          forexRate: null,
          source: "none",
          error: "No data from Yahoo or FMP",
        });
        continue;
      }
      
      const fmpResult = { price, date };
      
      let priceUSD = fmpResult.price;
      let forexRate: number | null = null;
      
      // Convert to USD if needed
      if (currency !== "USD") {
        forexRate = await getForexRate(currency, date);
        await delay(200);
        
        if (forexRate) {
          priceUSD = fmpResult.price / forexRate;
        } else {
          console.log(`⚠️ ${fmpResult.price} ${currency} (no forex rate)`);
          results.push({
            ticker,
            date,
            price: fmpResult.price,
            priceUSD: null,
            currency,
            forexRate: null,
            source: "fmp",
            error: "No forex rate",
          });
          continue;
        }
      }
      
      // Validate against Yahoo for US stocks
      let validated = true;
      if (currency === "USD" && !ticker.includes(".")) {
        const yahooPrice = await fetchYahooPrice(ticker, date);
        await delay(200);
        
        if (yahooPrice) {
          const diff = Math.abs(priceUSD - yahooPrice) / yahooPrice;
          if (diff > 0.05) {
            console.log(`⚠️ $${priceUSD.toFixed(2)} (Yahoo: $${yahooPrice.toFixed(2)}, ${(diff * 100).toFixed(1)}% diff)`);
            validated = false;
          }
        }
      }
      
      if (validated) {
        console.log(`✅ $${priceUSD.toFixed(2)}${currency !== "USD" ? ` (${fmpResult.price.toFixed(2)} ${currency})` : ""}`);
      }
      
      results.push({
        ticker,
        date,
        price: fmpResult.price,
        priceUSD: Math.round(priceUSD * 100) / 100,
        currency,
        forexRate,
        source,
      });
    }
    
    // Save progress after each ticker
    fs.writeFileSync(progressPath, JSON.stringify({ 
      lastUpdated: new Date().toISOString(),
      results 
    }, null, 2));
    console.log(`  💾 Progress saved (${results.length} total)`);
  }
  
  // Generate review file
  const reviewPath = path.join(__dirname, "../stock-prices-review.json");
  fs.writeFileSync(reviewPath, JSON.stringify(results, null, 2));
  console.log(`\n\nReview file written to: ${reviewPath}`);
  
  // Summary
  const successful = results.filter(r => r.priceUSD !== null);
  const failed = results.filter(r => r.priceUSD === null);
  const warnings = results.filter(r => r.error);
  
  console.log(`\nSummary:`);
  console.log(`  ✅ Successful: ${successful.length}`);
  console.log(`  ❌ Failed: ${failed.length}`);
  console.log(`  ⚠️ Warnings: ${warnings.length}`);
  
  if (!dryRun && successful.length > 0) {
    console.log(`\nUpdating holdings-history.ts...`);
    updateHoldingsHistory(successful);
    console.log("Done!");
  } else if (dryRun) {
    console.log(`\nDry run complete. Review ${reviewPath} and run without --dry-run to apply.`);
  }
}

function updateHoldingsHistory(results: PriceResult[]) {
  const filePath = path.join(__dirname, "../src/lib/data/holdings-history.ts");
  let content = fs.readFileSync(filePath, "utf-8");
  
  for (const result of results) {
    if (result.priceUSD === null) continue;
    
    // Find the entry and add stockPrice
    // Match: { date: "YYYY-MM-DD", ... } without stockPrice
    const datePattern = new RegExp(
      `(\\{\\s*date:\\s*"${result.date}"[^}]*?)(,?\\s*source:)`,
      "g"
    );
    
    content = content.replace(datePattern, (match, prefix, suffix) => {
      if (match.includes("stockPrice:")) return match; // Already has price
      return `${prefix}, stockPrice: ${result.priceUSD}${suffix}`;
    });
  }
  
  fs.writeFileSync(filePath, content);
}

backfillPrices().catch(console.error);
