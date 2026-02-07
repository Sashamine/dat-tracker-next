/**
 * Filing Extraction Pipeline
 * 
 * Processes SEC filings to extract metric values with full provenance.
 * Stores results in event tables for history + current value lookup.
 */

import { query } from "@/lib/db";
import { MSTR_CONFIG, type CompanyExtractionConfig, getExtractionRule, extractFromText } from "./mstr";

// R2 bucket for cached filings
const R2_BASE_URL = "https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev";
const R2_PREFIXES = ["new-uploads", "batch1", "batch2", "batch3", "batch4", "batch5", "batch6"];

/**
 * Fetch filing text from R2 cache (tries all prefixes)
 */
async function fetchFilingFromR2(ticker: string, accession: string): Promise<string | null> {
  for (const prefix of R2_PREFIXES) {
    const url = `${R2_BASE_URL}/${prefix}/${ticker.toLowerCase()}/${accession}.txt`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Try next prefix
    }
  }
  return null;
}

// Registry of all company configs
const EXTRACTION_CONFIGS: Record<string, CompanyExtractionConfig> = {
  "MSTR": MSTR_CONFIG,
  // Add more companies here as configs are created
};

export interface ExtractedMetric {
  metric: string;
  value: number;
  accession: string;
  filingType: string;
  quote: string;
  anchor: string;
  xbrlFact?: string;
  periodEnd?: string;
  confidence: number;
}

export interface ExtractionResult {
  ticker: string;
  accession: string;
  filingType: string;
  filedAt: string;
  metrics: ExtractedMetric[];
  errors: string[];
}

/**
 * Extract metrics from a filing using company-specific rules
 */
export async function extractFromFiling(
  ticker: string,
  accession: string,
  filingType: "8-K" | "10-Q" | "10-K",
  filedAt: string,
  content: {
    text?: string;       // Full text of filing (for 8-K text extraction)
    xbrl?: XBRLFact[];   // XBRL facts (for 10-Q/10-K)
  }
): Promise<ExtractionResult> {
  const config = EXTRACTION_CONFIGS[ticker.toUpperCase()];
  if (!config) {
    return {
      ticker,
      accession,
      filingType,
      filedAt,
      metrics: [],
      errors: [`No extraction config for ${ticker}`]
    };
  }
  
  const metrics: ExtractedMetric[] = [];
  const errors: string[] = [];
  
  // Process each metric type
  for (const [metric, rules] of Object.entries(config.rules)) {
    const rule = rules[filingType];
    if (!rule) continue;
    
    try {
      let extracted: ExtractedMetric | null = null;
      
      // Try XBRL extraction first
      if (rule.xbrl && content.xbrl) {
        const fact = content.xbrl.find(f => 
          f.fact.includes(rule.xbrl!.fact.replace("us-gaap:", "").replace("mstr:", ""))
        );
        
        if (fact) {
          extracted = {
            metric,
            value: fact.value,
            accession,
            filingType,
            quote: `${fact.fact}: ${fact.value}`,
            anchor: fact.fact,
            xbrlFact: fact.fact,
            periodEnd: fact.periodEnd,
            confidence: rule.confidence
          };
        }
      }
      
      // Fall back to text extraction
      if (!extracted && rule.text && content.text) {
        const textResult = extractFromText(content.text, rule);
        if (textResult) {
          extracted = {
            metric,
            value: textResult.value,
            accession,
            filingType,
            quote: textResult.quote,
            anchor: textResult.anchor,
            confidence: rule.confidence
          };
        }
      }
      
      if (extracted) {
        metrics.push(extracted);
      }
    } catch (err) {
      errors.push(`Failed to extract ${metric}: ${err}`);
    }
  }
  
  return {
    ticker,
    accession,
    filingType,
    filedAt,
    metrics,
    errors
  };
}

/**
 * Store extracted metrics in event tables
 */
export async function storeExtractedMetrics(
  ticker: string,
  result: ExtractionResult
): Promise<{ stored: number; errors: string[] }> {
  const errors: string[] = [];
  let stored = 0;
  
  // Get company ID
  const companyRows = await query(
    "SELECT id FROM companies WHERE ticker = $1",
    [ticker.toUpperCase()]
  );
  
  if (companyRows.length === 0) {
    return { stored: 0, errors: [`Company not found: ${ticker}`] };
  }
  
  const companyId = companyRows[0].id;
  const eventTime = result.filedAt;
  
  for (const metric of result.metrics) {
    try {
      switch (metric.metric) {
        case "holdings":
          await query(`
            INSERT INTO holdings_events 
              (company_id, holdings, source_type, accession, filing_type, quote, anchor, confidence, event_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING
          `, [
            companyId, 
            metric.value, 
            metric.filingType.toLowerCase(),
            metric.accession,
            metric.filingType,
            metric.quote,
            metric.anchor,
            metric.confidence,
            eventTime
          ]);
          stored++;
          break;
          
        case "debt":
          await query(`
            INSERT INTO debt_events 
              (company_id, total_debt, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING
          `, [
            companyId,
            metric.value,
            metric.accession,
            metric.filingType,
            metric.quote,
            metric.anchor,
            metric.xbrlFact,
            metric.periodEnd,
            metric.confidence,
            eventTime
          ]);
          stored++;
          break;
          
        case "preferred":
          await query(`
            INSERT INTO preferred_events 
              (company_id, preferred_equity, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING
          `, [
            companyId,
            metric.value,
            metric.accession,
            metric.filingType,
            metric.quote,
            metric.anchor,
            metric.xbrlFact,
            metric.periodEnd,
            metric.confidence,
            eventTime
          ]);
          stored++;
          break;
          
        case "shares":
          await query(`
            INSERT INTO shares_events 
              (company_id, shares_outstanding, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING
          `, [
            companyId,
            metric.value,
            metric.accession,
            metric.filingType,
            metric.quote,
            metric.anchor,
            metric.xbrlFact,
            metric.periodEnd,
            metric.confidence,
            eventTime
          ]);
          stored++;
          break;
          
        case "cash":
          await query(`
            INSERT INTO cash_events 
              (company_id, cash_reserves, accession, filing_type, quote, anchor, xbrl_fact, period_end, confidence, event_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING
          `, [
            companyId,
            metric.value,
            metric.accession,
            metric.filingType,
            metric.quote,
            metric.anchor,
            metric.xbrlFact,
            metric.periodEnd,
            metric.confidence,
            eventTime
          ]);
          stored++;
          break;
          
        case "totalCost":
        case "avgCost":
          // Store cost basis
          const existingCost = await query(`
            SELECT id, total_cost, avg_cost_per_btc FROM cost_basis_events 
            WHERE company_id = $1 AND accession = $2
          `, [companyId, metric.accession]);
          
          if (existingCost.length > 0) {
            // Update existing record
            const update = metric.metric === "totalCost" 
              ? { total_cost: metric.value }
              : { avg_cost_per_btc: metric.value };
            
            await query(`
              UPDATE cost_basis_events 
              SET ${metric.metric === "totalCost" ? "total_cost" : "avg_cost_per_btc"} = $1,
                  quote = COALESCE(quote, '') || E'\\n' || $2
              WHERE id = $3
            `, [metric.value, metric.quote, existingCost[0].id]);
          } else {
            await query(`
              INSERT INTO cost_basis_events 
                (company_id, total_cost, avg_cost_per_btc, accession, filing_type, quote, anchor, confidence, event_time)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              companyId,
              metric.metric === "totalCost" ? metric.value : null,
              metric.metric === "avgCost" ? metric.value : null,
              metric.accession,
              metric.filingType,
              metric.quote,
              metric.anchor,
              metric.confidence,
              eventTime
            ]);
          }
          stored++;
          break;
      }
    } catch (err) {
      errors.push(`Failed to store ${metric.metric}: ${err}`);
    }
  }
  
  return { stored, errors };
}

// Type for XBRL facts from API
interface XBRLFact {
  fact: string;
  value: number;
  unit: string;
  periodEnd: string;
  periodStart?: string;
}

/**
 * Process a new filing end-to-end
 * 
 * Called when SEC monitor detects new filing:
 * 1. Fetch filing content (text + XBRL)
 * 2. Extract metrics using company config
 * 3. Store in event tables with provenance
 */
export async function processFiling(
  ticker: string,
  accession: string,
  filingType: "8-K" | "10-Q" | "10-K",
  filedAt: string
): Promise<{ success: boolean; stored: number; errors: string[] }> {
  const config = EXTRACTION_CONFIGS[ticker.toUpperCase()];
  if (!config) {
    return { success: false, stored: 0, errors: [`No extraction config for ${ticker}`] };
  }
  
  try {
    // Fetch content based on filing type
    let text: string | undefined;
    let xbrl: XBRLFact[] | undefined;
    
    if (filingType === "8-K") {
      // Fetch full text for 8-K - try R2 cache first
      text = await fetchFilingFromR2(ticker, accession) || undefined;
      
      // Fall back to SEC if not in R2
      if (!text) {
        const textRes = await fetch(
          `https://www.sec.gov/Archives/edgar/data/${config.cik}/${accession.replace(/-/g, "")}`,
          { headers: { "User-Agent": "DAT-Tracker research@dat-tracker.com" } }
        );
        text = await textRes.text();
      }
    } else {
      // Fetch XBRL for 10-Q/10-K
      const xbrlRes = await fetch(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${config.cik.padStart(10, "0")}.json`,
        { headers: { "User-Agent": "DAT-Tracker research@dat-tracker.com" } }
      );
      const xbrlData = await xbrlRes.json();
      
      // Flatten XBRL facts for this accession
      xbrl = [];
      for (const [namespace, facts] of Object.entries(xbrlData.facts)) {
        for (const [factName, factData] of Object.entries(facts as Record<string, any>)) {
          const units = factData.units || {};
          for (const [unit, values] of Object.entries(units)) {
            for (const v of (values as any[])) {
              if (v.accn === accession) {
                xbrl.push({
                  fact: `${namespace}:${factName}`,
                  value: v.val,
                  unit,
                  periodEnd: v.end,
                  periodStart: v.start
                });
              }
            }
          }
        }
      }
    }
    
    // Extract metrics
    const result = await extractFromFiling(
      ticker,
      accession,
      filingType,
      filedAt,
      { text, xbrl }
    );
    
    // Store results
    const { stored, errors } = await storeExtractedMetrics(ticker, result);
    
    return {
      success: errors.length === 0,
      stored,
      errors: [...result.errors, ...errors]
    };
  } catch (err) {
    return {
      success: false,
      stored: 0,
      errors: [`Processing failed: ${err}`]
    };
  }
}
