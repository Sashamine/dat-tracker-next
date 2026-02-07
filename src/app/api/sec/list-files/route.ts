import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const files: Record<string, string[]> = {};
  const secDir = path.join(process.cwd(), "public", "sec");
  
  if (!fs.existsSync(secDir)) {
    return NextResponse.json({ files: {}, error: "SEC directory not found" });
  }
  
  try {
    // List all ticker directories
    const tickers = fs.readdirSync(secDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    for (const ticker of tickers) {
      const tickerDir = path.join(secDir, ticker);
      const tickerFiles: string[] = [];
      
      // List all type directories (8k, 10k, 10q, 6k)
      const types = fs.readdirSync(tickerDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      
      for (const type of types) {
        const typeDir = path.join(tickerDir, type);
        const htmlFiles = fs.readdirSync(typeDir)
          .filter(f => f.endsWith(".html"))
          .map(f => `/sec/${ticker}/${type}/${f}`);
        
        tickerFiles.push(...htmlFiles);
      }
      
      if (tickerFiles.length > 0) {
        files[ticker] = tickerFiles;
      }
    }
    
    return NextResponse.json({ 
      files,
      stats: {
        tickers: Object.keys(files).length,
        totalFiles: Object.values(files).flat().length,
      }
    });
  } catch (error) {
    console.error("Error listing SEC files:", error);
    return NextResponse.json({ files: {}, error: String(error) });
  }
}
