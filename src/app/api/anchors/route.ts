import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface AnchorEntry {
  ticker: string;
  filingType: string;
  filename: string;
  path: string;
  holdings: string | null;
  context: string;
  date: string;
}

async function findAnchors(dir: string, ticker: string): Promise<AnchorEntry[]> {
  const entries: AnchorEntry[] = [];
  
  try {
    const subdirs = await fs.readdir(dir);
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(dir, subdir);
      const stat = await fs.stat(subdirPath);
      
      if (!stat.isDirectory()) continue;
      
      const files = await fs.readdir(subdirPath);
      
      for (const file of files) {
        if (!file.endsWith(".html")) continue;
        
        const filePath = path.join(subdirPath, file);
        const content = await fs.readFile(filePath, "utf-8");
        
        if (!content.includes('id="dat-btc-holdings"')) continue;
        
        // Extract holdings number near the anchor
        const anchorMatch = content.match(/id="dat-btc-holdings"[^>]*>([^<]*)/);
        let holdings: string | null = null;
        let context = "";
        
        // Look for BTC holdings pattern near anchor
        const anchorIndex = content.indexOf('id="dat-btc-holdings"');
        if (anchorIndex !== -1) {
          // Get surrounding context (6000 chars after anchor - weekly 8-Ks have tables further down)
          const start = anchorIndex;
          const end = Math.min(content.length, anchorIndex + 6000);
          const surrounding = content.slice(start, end);
          
          // Clean HTML tags for context display
          const cleanText = surrounding
            .replace(/<[^>]+>/g, " ")
            .replace(/&[#\w]+;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          
          context = cleanText.slice(0, 150);
          
          // Find BTC holdings - prioritize TOTAL/AGGREGATE holdings over purchased amounts
          // Look for patterns that indicate total holdings, not period purchases
          const holdingsPatterns = [
            // "holds/held approximately XXX,XXX bitcoin" - total holdings
            /(?:holds?|held)\s+(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
            // "aggregate holdings of XXX,XXX" 
            /aggregate\s+(?:holdings?\s+)?(?:of\s+)?(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
            // "total of XXX,XXX bitcoin"
            /total\s+(?:of\s+)?(?:approximately\s+)?(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)/i,
            // "XXX,XXX bitcoins held" (passive)
            /(\d{1,3}(?:,\d{3})+)\s*(?:bitcoin|BTC)s?\s+held/i,
            // For 10-Qs: look in tables - "Approximate number of bitcoins held" followed by number
            /(?:number of bitcoins? held|bitcoins? held)[^\d]{0,50}(\d{1,3}(?:,\d{3})+)/i,
          ];
          
          for (const pattern of holdingsPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
              const num = parseInt(match[1].replace(/,/g, ""));
              // Only accept if it looks like a real holdings number (> 10000 for MSTR)
              if (num > 10000) {
                holdings = match[1];
                break;
              }
            }
          }
          
          // Fallback for weekly 8-Ks with "Aggregate" column
          // The total holdings appears after "Aggregate" in the table
          if (!holdings) {
            // Look for number after "Aggregate" (common pattern in weekly 8-Ks)
            const aggMatch = cleanText.match(/Aggregate[^\d]{0,200}(\d{3},\d{3})/i);
            if (aggMatch) {
              const num = parseInt(aggMatch[1].replace(/,/g, ""));
              if (num > 100000) {
                holdings = aggMatch[1];
              }
            }
          }
          
          // Final fallback: look for "As of [date]" followed by large number
          if (!holdings) {
            const asOfMatch = cleanText.match(/As of [A-Za-z]+ \d+, \d{4}[^\d]{0,100}(\d{3},\d{3})/i);
            if (asOfMatch) {
              const num = parseInt(asOfMatch[1].replace(/,/g, ""));
              if (num > 100000) {
                holdings = asOfMatch[1];
              }
            }
          }
        }
        
        // Parse date from filename
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : "";
        
        // Determine filing type from path
        const filingType = subdir.toUpperCase();
        
        entries.push({
          ticker,
          filingType,
          filename: file,
          path: `/sec/${ticker}/${subdir}/${file}`,
          holdings,
          context,
          date,
        });
      }
    }
  } catch (err) {
    console.error(`Error scanning ${dir}:`, err);
  }
  
  return entries;
}

export async function GET() {
  const secDir = path.join(process.cwd(), "public", "sec");
  const allAnchors: AnchorEntry[] = [];
  
  try {
    const tickers = await fs.readdir(secDir);
    
    for (const ticker of tickers) {
      const tickerPath = path.join(secDir, ticker);
      const stat = await fs.stat(tickerPath);
      
      if (!stat.isDirectory()) continue;
      
      const anchors = await findAnchors(tickerPath, ticker);
      allAnchors.push(...anchors);
    }
    
    // Sort by date descending
    allAnchors.sort((a, b) => b.date.localeCompare(a.date));
    
    return NextResponse.json({ anchors: allAnchors });
  } catch (err) {
    console.error("Error scanning for anchors:", err);
    return NextResponse.json({ anchors: [], error: String(err) }, { status: 500 });
  }
}
