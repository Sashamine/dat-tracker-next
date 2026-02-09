import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { MSTR_HOLDINGS_VERIFIED, getByAccession } from "@/lib/data/mstr-holdings-verified";

interface VerificationResult {
  ticker: string;
  date: string;
  filingType: string;
  filename: string;
  secHoldings: number | null;
  ourHoldings: number | null;
  status: "match" | "mismatch" | "missing-sec" | "missing-ours" | "unverified";
  diff: number | null;
  diffPct: number | null;
  path: string;
}

// Build lookup from our verified data by accession number
const holdingsLookup = new Map<string, number>();
for (const entry of MSTR_HOLDINGS_VERIFIED) {
  if (entry.accession) {
    holdingsLookup.set(entry.accession, entry.holdings);
  }
}

// Extract holdings from HTML content
function extractHoldings(content: string): number | null {
  const anchorIndex = content.indexOf('id="dat-btc-holdings"');
  if (anchorIndex === -1) return null;
  
  const chunk = content.slice(anchorIndex, Math.min(content.length, anchorIndex + 6000));
  const cleanText = chunk
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#\w]+;/g, " ")
    .replace(/\s+/g, " ");
  
  // Patterns for total holdings
  const patterns = [
    /(?:holds?|held)\s+(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
    /aggregate\s+(?:holdings?\s+)?(?:of\s+)?(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
    /total\s+(?:of\s+)?(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
    /(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)s?\s+held/i,
    /(?:number of bitcoins? held|bitcoins? held)[^\d]{0,50}(\d{1,3}(?:,\d{3})+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""));
      if (num > 10000) return num;
    }
  }
  
  // Fallback: look for "Aggregate" followed by number
  const aggMatch = cleanText.match(/Aggregate[^\d]{0,200}(\d{3},\d{3})/i);
  if (aggMatch) {
    const num = parseInt(aggMatch[1].replace(/,/g, ""));
    if (num > 100000) return num;
  }
  
  // Final fallback: largest number in 400k-800k range (likely MSTR holdings 2024-2026)
  if (cleanText.toLowerCase().includes('bitcoin')) {
    const allNums = cleanText.match(/\d{3},\d{3}/g) || [];
    const parsed = allNums
      .map(n => parseInt(n.replace(/,/g, "")))
      .filter(n => n > 100000 && n < 900000);
    if (parsed.length > 0) {
      return Math.max(...parsed);
    }
  }
  
  return null;
}

async function scanFilings(dir: string, ticker: string): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  try {
    const subdirs = await fs.readdir(dir);
    
    for (const subdir of subdirs) {
      if (subdir !== "8k" && subdir !== "10k" && subdir !== "10q") continue;
      
      const subdirPath = path.join(dir, subdir);
      const stat = await fs.stat(subdirPath);
      if (!stat.isDirectory()) continue;
      
      const files = await fs.readdir(subdirPath);
      
      for (const file of files) {
        if (!file.endsWith(".html")) continue;
        
        const filePath = path.join(subdirPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        
        if (!content.includes('id="dat-btc-holdings"')) continue;
        
        // Extract accession from filename
        const accMatch = file.match(/(\d{6})\.html$/);
        const accession = accMatch ? accMatch[1] : null;
        
        // Extract date from filename
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : "";
        
        // Extract holdings from SEC filing
        const secHoldings = extractHoldings(content);
        
        // Look up our data
        const ourHoldings = accession ? holdingsLookup.get(accession) || null : null;
        
        // Determine status
        let status: VerificationResult["status"];
        let diff: number | null = null;
        let diffPct: number | null = null;
        
        if (secHoldings && ourHoldings) {
          diff = secHoldings - ourHoldings;
          diffPct = ourHoldings ? (diff / ourHoldings) * 100 : null;
          // Allow 1% tolerance for rounding differences
          status = Math.abs(diffPct || 0) < 1 ? "match" : "mismatch";
        } else if (!secHoldings && ourHoldings) {
          status = "missing-sec";
        } else if (secHoldings && !ourHoldings) {
          status = "missing-ours";
        } else {
          status = "unverified";
        }
        
        results.push({
          ticker,
          date,
          filingType: subdir.toUpperCase(),
          filename: file,
          secHoldings,
          ourHoldings,
          status,
          diff,
          diffPct,
          path: `/sec/${ticker}/${subdir}/${file}`,
        });
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err);
  }
  
  return results;
}

export async function GET() {
  const secDir = path.join(process.cwd(), "public", "sec");
  const allResults: VerificationResult[] = [];
  
  try {
    const tickers = await fs.readdir(secDir);
    
    for (const ticker of tickers) {
      const tickerPath = path.join(secDir, ticker);
      const stat = await fs.stat(tickerPath);
      if (!stat.isDirectory()) continue;
      
      const results = await scanFilings(tickerPath, ticker);
      allResults.push(...results);
    }
    
    // Sort by date descending
    allResults.sort((a, b) => b.date.localeCompare(a.date));
    
    // Calculate stats
    const stats = {
      total: allResults.length,
      matched: allResults.filter(r => r.status === "match").length,
      mismatched: allResults.filter(r => r.status === "mismatch").length,
      missing: allResults.filter(r => r.status === "missing-sec" || r.status === "missing-ours").length,
    };
    
    return NextResponse.json({ results: allResults, stats });
  } catch (err) {
    console.error("Verification error:", err);
    return NextResponse.json({ results: [], stats: {}, error: String(err) }, { status: 500 });
  }
}
