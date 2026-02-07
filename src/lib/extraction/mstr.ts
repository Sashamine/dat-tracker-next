/**
 * MSTR Extraction Configuration
 * 
 * Defines how to extract provenance data from MSTR SEC filings.
 * Each metric has XBRL facts (for 10-Q/10-K) and text patterns (for 8-K).
 */

export interface ExtractionRule {
  // XBRL extraction (for structured filings)
  xbrl?: {
    fact: string;           // us-gaap:LongTermDebt
    periodType: "instant" | "duration";
    unit?: string;          // USD, shares
  };
  
  // Text extraction (for 8-K prose)
  text?: {
    anchor: string;         // Search term to find section
    pattern: RegExp;        // Pattern to extract value
    transform?: (match: string) => number;  // Convert to number
  };
  
  // Confidence level for this extraction method
  confidence: number;
}

export interface CompanyExtractionConfig {
  ticker: string;
  cik: string;
  
  // Extraction rules by metric and filing type
  rules: {
    [metric: string]: {
      "10-Q"?: ExtractionRule;
      "10-K"?: ExtractionRule;
      "8-K"?: ExtractionRule;
    };
  };
}

// Value parsers
const parseBillions = (s: string) => parseFloat(s.replace(/[,$]/g, "")) * 1_000_000_000;
const parseMillions = (s: string) => parseFloat(s.replace(/[,$]/g, "")) * 1_000_000;
const parseNumber = (s: string) => parseInt(s.replace(/[,$]/g, ""), 10);
const parseDollars = (s: string) => parseFloat(s.replace(/[,$]/g, ""));

export const MSTR_CONFIG: CompanyExtractionConfig = {
  ticker: "MSTR",
  cik: "1050446",
  
  rules: {
    // =========================================================================
    // BTC HOLDINGS
    // =========================================================================
    holdings: {
      "10-Q": {
        xbrl: {
          fact: "mstr:DigitalAssetsBitcoin",
          periodType: "instant",
          unit: "BTC"
        },
        confidence: 1.0
      },
      "8-K": {
        text: {
          anchor: "Aggregate BTC Holdings",
          pattern: /Aggregate BTC Holdings[^\d]*(\d{1,3}(?:,\d{3})*)/i,
          transform: parseNumber
        },
        confidence: 1.0
      }
    },
    
    // =========================================================================
    // TOTAL COST BASIS
    // =========================================================================
    totalCost: {
      "8-K": {
        text: {
          anchor: "Aggregate Purchase Price",
          pattern: /Aggregate Purchase Price[^\d]*\$?([\d.]+)\s*billion/i,
          transform: parseBillions
        },
        confidence: 1.0
      }
    },
    
    // =========================================================================
    // AVERAGE COST BASIS
    // =========================================================================
    avgCost: {
      "8-K": {
        text: {
          anchor: "Average Purchase Price",
          pattern: /Average Purchase Price[^\d]*\$?([\d,]+)/i,
          transform: parseDollars
        },
        confidence: 1.0
      }
    },
    
    // =========================================================================
    // TOTAL DEBT
    // =========================================================================
    debt: {
      "10-Q": {
        xbrl: {
          fact: "us-gaap:LongTermDebt",
          periodType: "instant",
          unit: "USD"
        },
        confidence: 1.0
      },
      "10-K": {
        xbrl: {
          fact: "us-gaap:LongTermDebt",
          periodType: "instant",
          unit: "USD"
        },
        confidence: 1.0
      }
    },
    
    // =========================================================================
    // PREFERRED EQUITY
    // =========================================================================
    preferred: {
      "10-Q": {
        xbrl: {
          fact: "us-gaap:ProceedsFromIssuanceOfPreferredStockAndPreferenceStock",
          periodType: "duration",
          unit: "USD"
        },
        confidence: 1.0
      },
      "8-K": {
        text: {
          // STRK/STRF issuances announced in 8-K
          anchor: "preferred stock",
          pattern: /(?:STRK|STRF|perpetual preferred)[^\d]*\$?([\d.]+)\s*(?:billion|million)/i,
          transform: (s) => s.includes("billion") ? parseBillions(s) : parseMillions(s)
        },
        confidence: 0.9
      }
    },
    
    // =========================================================================
    // SHARES OUTSTANDING
    // =========================================================================
    shares: {
      "10-Q": {
        xbrl: {
          fact: "us-gaap:WeightedAverageNumberOfSharesOutstandingBasic",
          periodType: "duration",
          unit: "shares"
        },
        confidence: 1.0
      },
      "8-K": {
        text: {
          // ATM issuance announcements
          anchor: "shares of Class A common stock",
          pattern: /(?:sold|issued)[^\d]*([\d,]+)\s*shares/i,
          transform: parseNumber
        },
        confidence: 0.8  // Lower because 8-K shows issuances, not total
      }
    },
    
    // =========================================================================
    // CASH / USD RESERVES
    // =========================================================================
    cash: {
      "10-Q": {
        xbrl: {
          fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
          periodType: "instant",
          unit: "USD"
        },
        confidence: 1.0
      },
      "8-K": {
        text: {
          anchor: "USD Reserve",
          pattern: /USD Reserve[^\d]*\$?([\d.]+)\s*billion/i,
          transform: parseBillions
        },
        confidence: 0.9
      }
    }
  }
};

/**
 * Get extraction rule for a specific metric and filing type
 */
export function getExtractionRule(
  config: CompanyExtractionConfig,
  metric: string,
  filingType: "8-K" | "10-Q" | "10-K"
): ExtractionRule | null {
  return config.rules[metric]?.[filingType] || null;
}

/**
 * Extract value from text using extraction rule
 */
export function extractFromText(
  text: string,
  rule: ExtractionRule
): { value: number; quote: string; anchor: string } | null {
  if (!rule.text) return null;
  
  const match = text.match(rule.text.pattern);
  if (!match) return null;
  
  const rawValue = match[1];
  const value = rule.text.transform ? rule.text.transform(rawValue) : parseFloat(rawValue);
  
  // Extract quote context (surrounding text)
  const matchIndex = match.index || 0;
  const quoteStart = Math.max(0, matchIndex - 20);
  const quoteEnd = Math.min(text.length, matchIndex + match[0].length + 20);
  const quote = text.slice(quoteStart, quoteEnd).trim();
  
  return {
    value,
    quote,
    anchor: rule.text.anchor
  };
}
