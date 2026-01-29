/**
 * HKEX PDF Extractor
 *
 * Uses LLM to extract structured data from HKEX filing PDFs.
 * These filings are not structured (unlike SEC XBRL), so we need
 * to parse the text and extract key metrics.
 *
 * Key data points to extract:
 * - BTC/crypto holdings (units)
 * - Average cost basis (USD or HKD)
 * - Shares outstanding
 * - Revenue (HKD)
 * - Net income (HKD)
 * - Fair value of digital assets (HKD)
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedHKEXData {
  // Core treasury metrics
  btcHoldings?: number;
  btcAvgCost?: number;        // USD per BTC
  ethHoldings?: number;
  ethAvgCost?: number;        // USD per ETH
  
  // Share data
  sharesOutstanding?: number;
  sharesAsOf?: string;        // Date string
  
  // Financials (HKD unless noted)
  revenue?: number;
  netIncome?: number;
  digitalAssetsFairValue?: number;
  fairValueGainLoss?: number;
  cashAndEquivalents?: number;
  totalDebt?: number;
  
  // Metadata
  periodEnd?: string;         // e.g., "2025-06-30"
  filingType?: 'interim' | 'annual' | 'quarterly';
  
  // Raw extraction confidence
  confidence: 'high' | 'medium' | 'low';
  extractionNotes?: string;
}

const EXTRACTION_PROMPT = `You are a financial data extraction assistant. Extract structured data from this HKEX (Hong Kong Stock Exchange) filing.

Focus on these key metrics for a Bitcoin/crypto treasury company:

1. **BTC Holdings**: Number of Bitcoin held (look for "BTC", "Bitcoin", "units of BTC")
2. **BTC Average Cost**: Average purchase price per BTC (usually in USD)
3. **ETH Holdings**: Number of Ether held (if any)
4. **Shares Outstanding**: Total issued shares (look for "issued shares", "shares outstanding")
5. **Revenue**: Total revenue for the period (in HKD)
6. **Net Income**: Profit/loss for the period (in HKD)
7. **Digital Assets Fair Value**: Fair value of crypto holdings (in HKD)
8. **Fair Value Gain/Loss**: Change in fair value of digital assets
9. **Period End Date**: The reporting period end date (e.g., June 30, 2025)

Return a JSON object with these fields. Use null for any field you cannot find.
Include an "extractionNotes" field explaining any assumptions or uncertainties.
Set "confidence" to "high", "medium", or "low" based on clarity of the data.

IMPORTANT: 
- All monetary values should be numbers (no commas or currency symbols)
- BTC/ETH holdings should be the exact number of units
- Cost basis is typically in USD
- Revenue/income are typically in HKD for HK companies
- Look for tables with "BTC Yield" or "Digital Assets" sections

Return ONLY valid JSON, no markdown or explanation.`;

/**
 * Extract text content from PDF using pdf-parse or similar
 * For now, we'll accept pre-extracted text
 */
export async function extractDataFromText(
  text: string,
  options?: {
    stockCode?: string;
    filingDate?: string;
    apiKey?: string;
  }
): Promise<ExtractedHKEXData> {
  const apiKey = options?.apiKey || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY required for PDF extraction');
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n--- FILING TEXT ---\n\n${text.slice(0, 50000)}`, // Limit to ~50k chars
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedHKEXData;
    
    // Ensure confidence field exists
    if (!extracted.confidence) {
      extracted.confidence = 'medium';
    }

    return extracted;
  } catch (error) {
    console.error('LLM extraction failed:', error);
    return {
      confidence: 'low',
      extractionNotes: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Fetch PDF and extract text (requires pdf-parse package)
 * This is a placeholder - actual implementation needs pdf-parse
 */
export async function fetchAndExtractPdf(
  url: string,
  options?: {
    apiKey?: string;
  }
): Promise<{ text: string; data: ExtractedHKEXData } | null> {
  try {
    // Fetch PDF
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DATTracker/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status}`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // Try to use pdf-parse if available
    // Note: Install pdf-parse for local PDF extraction: npm install pdf-parse
    let text: string;
    try {
      // Dynamic import to avoid build issues if not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(Buffer.from(buffer));
      text = pdfData.text;
    } catch (e) {
      // pdf-parse not available - return null or use alternative
      console.warn('pdf-parse not available. Install with: npm install pdf-parse');
      console.warn('Alternatively, provide pre-extracted text to extractDataFromText()');
      return null;
    }

    // Extract data using LLM
    const data = await extractDataFromText(text, options);

    return { text, data };
  } catch (error) {
    console.error('PDF fetch/extract failed:', error);
    return null;
  }
}

/**
 * Extract data from a known Boyaa filing
 * Uses the filing URL and returns structured data
 */
export async function extractBoyaaFiling(
  filingUrl: string,
  options?: { apiKey?: string }
): Promise<ExtractedHKEXData | null> {
  const result = await fetchAndExtractPdf(filingUrl, options);
  if (!result) return null;
  
  return result.data;
}

/**
 * Batch extract from multiple filings
 */
export async function batchExtract(
  urls: string[],
  options?: { apiKey?: string; delayMs?: number }
): Promise<Map<string, ExtractedHKEXData>> {
  const results = new Map<string, ExtractedHKEXData>();
  const delay = options?.delayMs || 1000;

  for (const url of urls) {
    try {
      const data = await extractBoyaaFiling(url, options);
      if (data) {
        results.set(url, data);
      }
    } catch (error) {
      console.error(`Failed to extract ${url}:`, error);
    }
    
    // Rate limiting
    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return results;
}

export default {
  extractDataFromText,
  fetchAndExtractPdf,
  extractBoyaaFiling,
  batchExtract,
};
