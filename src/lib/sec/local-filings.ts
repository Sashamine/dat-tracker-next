/**
 * Local SEC Filing Storage
 * 
 * Utilities for accessing locally-stored SEC filing content.
 * Filings are stored in data/sec-content/{ticker}/{accession}.txt
 */

import * as fs from "fs";
import * as path from "path";

const CONTENT_DIR = path.join(process.cwd(), "data", "sec-content");
const METADATA_DIR = path.join(process.cwd(), "src", "lib", "data", "sec-filings");

export interface LocalFiling {
  ticker: string;
  accession: string;
  content: string;
  size: number;
  path: string;
}

export interface FilingMetadata {
  ticker: string;
  cik: string;
  asset?: string;
  companyName: string;
  filings: Array<{
    accessionNumber: string;
    formType: string;
    filedDate: string;
    periodDate?: string;
    url: string;
    items?: string[];
    description?: string;
  }>;
  fetchedAt: string;
}

/**
 * Check if local content exists for a filing
 */
export function hasLocalContent(ticker: string, accession: string): boolean {
  const filepath = path.join(CONTENT_DIR, ticker.toLowerCase(), `${accession}.txt`);
  return fs.existsSync(filepath);
}

/**
 * Read local filing content
 */
export function readLocalFiling(ticker: string, accession: string): LocalFiling | null {
  const filepath = path.join(CONTENT_DIR, ticker.toLowerCase(), `${accession}.txt`);
  
  try {
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    const content = fs.readFileSync(filepath, "utf-8");
    return {
      ticker: ticker.toUpperCase(),
      accession,
      content,
      size: content.length,
      path: filepath,
    };
  } catch (e) {
    console.error(`[Local Filings] Error reading ${filepath}:`, e);
    return null;
  }
}

/**
 * Get all local filings for a ticker
 */
export function getLocalFilings(ticker: string): string[] {
  const dir = path.join(CONTENT_DIR, ticker.toLowerCase());
  
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }
    
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(".txt"))
      .map(f => f.replace(".txt", ""));
  } catch (e) {
    console.error(`[Local Filings] Error listing ${dir}:`, e);
    return [];
  }
}

/**
 * Load filing metadata for a ticker
 */
export function loadFilingMetadata(ticker: string): FilingMetadata | null {
  const filepath = path.join(METADATA_DIR, `${ticker.toLowerCase()}.json`);
  
  try {
    if (!fs.existsSync(filepath)) {
      return null;
    }
    
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch (e) {
    console.error(`[Local Filings] Error loading metadata ${filepath}:`, e);
    return null;
  }
}

/**
 * Get all tickers with local metadata
 */
export function getAllTickers(): string[] {
  try {
    return fs.readdirSync(METADATA_DIR)
      .filter(f => f.endsWith(".json"))
      .map(f => f.replace(".json", "").toUpperCase());
  } catch (e) {
    console.error(`[Local Filings] Error listing metadata:`, e);
    return [];
  }
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  tickers: number;
  totalFilings: number;
  localContent: number;
  missingContent: number;
  totalSizeMB: number;
  byTicker: Array<{
    ticker: string;
    metadata: number;
    local: number;
    missing: number;
    sizeMB: number;
  }>;
} {
  const tickers = getAllTickers();
  let totalFilings = 0;
  let localContent = 0;
  let missingContent = 0;
  let totalSizeBytes = 0;
  const byTicker: Array<{
    ticker: string;
    metadata: number;
    local: number;
    missing: number;
    sizeMB: number;
  }> = [];
  
  for (const ticker of tickers) {
    const metadata = loadFilingMetadata(ticker);
    const localFilings = getLocalFilings(ticker);
    const metadataCount = metadata?.filings.length || 0;
    const localCount = localFilings.length;
    
    // Calculate size
    let sizeMB = 0;
    const dir = path.join(CONTENT_DIR, ticker.toLowerCase());
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const stat = fs.statSync(path.join(dir, file));
        sizeMB += stat.size;
        totalSizeBytes += stat.size;
      }
    }
    
    totalFilings += metadataCount;
    localContent += localCount;
    missingContent += Math.max(0, metadataCount - localCount);
    
    byTicker.push({
      ticker,
      metadata: metadataCount,
      local: localCount,
      missing: Math.max(0, metadataCount - localCount),
      sizeMB: sizeMB / (1024 * 1024),
    });
  }
  
  return {
    tickers: tickers.length,
    totalFilings,
    localContent,
    missingContent,
    totalSizeMB: totalSizeBytes / (1024 * 1024),
    byTicker,
  };
}

/**
 * Find filings missing local content
 */
export function findMissingContent(ticker?: string): Array<{
  ticker: string;
  accession: string;
  formType: string;
  filedDate: string;
  url: string;
}> {
  const missing: Array<{
    ticker: string;
    accession: string;
    formType: string;
    filedDate: string;
    url: string;
  }> = [];
  
  const tickers = ticker ? [ticker.toUpperCase()] : getAllTickers();
  
  for (const t of tickers) {
    const metadata = loadFilingMetadata(t);
    if (!metadata) continue;
    
    for (const filing of metadata.filings) {
      if (!hasLocalContent(t, filing.accessionNumber)) {
        missing.push({
          ticker: t,
          accession: filing.accessionNumber,
          formType: filing.formType,
          filedDate: filing.filedDate,
          url: filing.url,
        });
      }
    }
  }
  
  return missing;
}

/**
 * Clean/parse SEC submission text to extract readable content
 */
export function parseSubmissionText(content: string): {
  mainDocument: string;
  exhibits: Array<{ name: string; content: string }>;
} {
  const mainDocument: string[] = [];
  const exhibits: Array<{ name: string; content: string }> = [];
  
  // SEC full submission format has documents separated by <DOCUMENT> tags
  const documentMatches = content.matchAll(/<DOCUMENT>([\s\S]*?)<\/DOCUMENT>/gi);
  
  for (const match of documentMatches) {
    const docContent = match[1];
    
    // Extract document type
    const typeMatch = docContent.match(/<TYPE>([^\n<]+)/i);
    const filenameMatch = docContent.match(/<FILENAME>([^\n<]+)/i);
    const type = typeMatch?.[1]?.trim() || "";
    const filename = filenameMatch?.[1]?.trim() || "";
    
    // Extract text content (between <TEXT> tags)
    const textMatch = docContent.match(/<TEXT>([\s\S]*?)<\/TEXT>/i);
    const textContent = textMatch?.[1] || "";
    
    // Clean HTML/XML
    const cleanedText = textContent
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    
    if (type.match(/^(8-K|10-K|10-Q|S-3|424B|DEF 14A)/i)) {
      mainDocument.push(cleanedText);
    } else if (type.match(/^EX-/i) || filename.match(/ex\d+/i)) {
      exhibits.push({
        name: filename || type,
        content: cleanedText,
      });
    }
  }
  
  return {
    mainDocument: mainDocument.join("\n\n"),
    exhibits,
  };
}
