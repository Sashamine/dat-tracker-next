/**
 * LLM-based Holdings Extractor
 * Uses Claude or Grok to extract holdings numbers from text
 */

import { ExtractionResult, ExtractionContext } from './types';
import { chunkFilingText, isLikelyRelevant } from './text-chunker';

export type LLMProvider = 'anthropic' | 'grok';

interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

// Default models per provider
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-3-5-sonnet-20241022',
  grok: 'grok-beta',
};

/**
 * Smart chunk text using the text-chunker module
 * Extracts relevant sections instead of blind truncation
 */
function smartChunkText(text: string, context: ExtractionContext): string {
  const result = chunkFilingText(text, {
    itemCodes: context.itemCodes,
    maxSize: 8000,
  });
  
  // Log chunking method for debugging
  if (result.method !== 'truncated') {
    console.log(`[LLM Extractor] Used ${result.method} chunking${result.sections ? ` (Items: ${result.sections.join(', ')})` : ''}`);
  }
  
  return result.text;
}

/**
 * Build the extraction prompt
 */
function buildExtractionPrompt(text: string, context: ExtractionContext): string {
  // Build share extraction instructions based on whether company is dual-class
  let shareInstructions = '';
  if (context.isDualClass && context.shareClasses && context.shareClasses.length > 0) {
    const classNames = context.shareClasses.join(' and ');
    shareInstructions = `
IMPORTANT - DUAL-CLASS SHARES:
This company has multiple share classes (${classNames}). You MUST extract BOTH:
- ${context.shareClasses[0]} shares outstanding
- ${context.shareClasses[1] || 'Other class'} shares outstanding
- Calculate total shares = sum of all classes

Look for phrases like:
- "X shares of Class A common stock"
- "X shares of Class B common stock"
- "Class A shares outstanding: X"
- "Non-voting shares: X" (often Class A)
- "Voting shares: X" (often Class B)`;
  } else {
    shareInstructions = `
For shares outstanding, look for:
- "shares outstanding"
- "common stock outstanding"
- "shares of common stock"`;
  }

  const currentSharesInfo = context.currentSharesOutstanding
    ? `Current known shares outstanding: ${context.currentSharesOutstanding.toLocaleString()}`
    : '';

  // Build filing context based on form type and item codes
  let filingContext = '';
  if (context.formType || context.itemCodes?.length) {
    const formDesc = context.formType ? `Form: ${context.formType}` : '';
    
    // Item code specific guidance
    let itemGuidance = '';
    if (context.itemCodes?.length) {
      const items = context.itemCodes;
      if (items.some(i => ['7.01', '8.01'].includes(i))) {
        itemGuidance += '\n- This is likely a crypto holdings announcement. Focus on extracting total holdings.';
      }
      if (items.includes('3.02')) {
        itemGuidance += '\n- This filing reports equity sales. Focus on share count changes and new shares outstanding.';
      }
      if (items.some(i => ['1.01', '2.03'].includes(i))) {
        itemGuidance += '\n- This filing involves material agreements/debt. Look for convertible notes, credit facilities, and their terms.';
      }
      if (items.includes('2.01')) {
        itemGuidance += '\n- This filing reports asset acquisition/disposition. Look for crypto purchases or sales.';
      }
      if (items.includes('2.02')) {
        itemGuidance += '\n- This is a results announcement. Look for holdings updates in earnings context.';
      }
    }
    
    // Foreign filer guidance with section header patterns
    if (context.formType === '40-F') {
      itemGuidance += `
- This is a Canadian company annual report (40-F). Look for shares outstanding in the financial statements section.
- Key sections to find: "Consolidated Balance Sheet", "Share Capital", "Stockholders Equity"`;
    } else if (context.formType === '6-K') {
      itemGuidance += `
- This is a foreign company interim report (6-K). May contain holdings updates or material events.
- Look for these section headers to guide extraction:
  * "Treasury" / "Holdings Update" / "Digital Asset Holdings" → crypto holdings numbers
  * "Corporate Highlights" / "Business Update" → may contain acquisition announcements
  * "Capital" / "Financing" / "Equity" → share count changes, ATM activity
  * "Debt" / "Credit Facility" → debt restructuring, convertible notes
  * "Validator" / "Mining" / "Operations" → operational metrics (staking, mining output)
- Canadian companies often report in CAD - note the currency and conversion rates mentioned`;
    } else if (context.formType === '20-F') {
      itemGuidance += `
- This is a foreign company annual report (20-F). Similar to 10-K.
- Look for shares outstanding in "Item 9. The Offer and Listing" or financial statements.`;
    }
    
    if (formDesc || itemGuidance) {
      filingContext = `
FILING CONTEXT:
${formDesc}${context.itemCodes?.length ? ` | Items: ${context.itemCodes.join(', ')}` : ''}
${itemGuidance}
`;
    }
  }

  return `You are analyzing a financial document or announcement for ${context.companyName} (${context.ticker}).
${filingContext}

This company holds ${context.asset} as a treasury asset. Their current known holdings are ${context.currentHoldings.toLocaleString()} ${context.asset}.
${currentSharesInfo}

Extract the following information from the text below:

1. TOTAL HOLDINGS: Look for explicit statements of total/current holdings
2. TRANSACTIONS: If no total is stated, look for purchases or sales that we can use to calculate the new total
   - For a PURCHASE: new total = current (${context.currentHoldings.toLocaleString()}) + purchase amount
   - For a SALE: new total = current (${context.currentHoldings.toLocaleString()}) - sale amount
${shareInstructions}

Only extract values you are confident about based on the text. Do NOT make up numbers.

TEXT TO ANALYZE:
---
${smartChunkText(text, context)}
---

Respond in valid JSON format only, with no markdown formatting:
{
  "holdings": <TOTAL number after any transactions, or null if cannot determine>,
  "transactionType": <"purchase" | "sale" | null if no transaction mentioned>,
  "transactionAmount": <number of ${context.asset} bought or sold, or null>,
  "holdingsExplicitlyStated": <true if total holdings was directly stated in text, false if calculated from transaction>,
  "sharesOutstanding": <TOTAL number or null if not found>,
  "classAShares": <number or null - for dual-class companies only>,
  "classBShares": <number or null - for dual-class companies only>,
  "costBasis": <number or null if not found>,
  "extractedDate": "<YYYY-MM-DD or null if not found>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation of how you extracted/calculated these values>",
  "rawNumbers": ["<list of all relevant numbers found in text>"]
}

Important guidelines:
- If total holdings is explicitly stated, use that directly
- If only a transaction is mentioned, CALCULATE the new total: current ${context.currentHoldings.toLocaleString()} +/- transaction
- Set holdings to null ONLY if you cannot determine total AND cannot identify a clear transaction
- For dual-class companies: sharesOutstanding should be the SUM of all share classes
- Confidence should reflect how certain you are about the holdings value
- Lower confidence for calculated values vs explicitly stated values
- Include brief reasoning explaining your extraction logic`;
}

/**
 * Call Claude API
 */
async function callClaude(
  prompt: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || '';

  return parseExtractionResponse(content);
}

/**
 * Call Grok API
 */
async function callGrok(
  prompt: string,
  apiKey: string,
  model: string
): Promise<ExtractionResult> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for more deterministic extraction
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Grok API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || '';

  return parseExtractionResponse(content);
}

/**
 * Parse the LLM response into ExtractionResult
 */
function parseExtractionResponse(content: string): ExtractionResult {
  try {
    // Clean the response - remove markdown code blocks if present
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    // For dual-class companies, calculate total if not provided but classes are
    let totalShares = parsed.sharesOutstanding ?? null;
    const classA = parsed.classAShares ?? null;
    const classB = parsed.classBShares ?? null;

    if (totalShares === null && classA !== null && classB !== null) {
      totalShares = classA + classB;
    }

    return {
      holdings: parsed.holdings ?? null,
      sharesOutstanding: totalShares,
      classAShares: classA,
      classBShares: classB,
      costBasis: parsed.costBasis ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
      extractedDate: parsed.extractedDate || null,
      rawNumbers: Array.isArray(parsed.rawNumbers) ? parsed.rawNumbers : [],
      transactionType: parsed.transactionType ?? null,
      transactionAmount: parsed.transactionAmount ?? null,
      holdingsExplicitlyStated: parsed.holdingsExplicitlyStated ?? true,
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', content);
    return {
      holdings: null,
      sharesOutstanding: null,
      classAShares: null,
      classBShares: null,
      costBasis: null,
      confidence: 0,
      reasoning: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
      extractedDate: null,
      rawNumbers: [],
      transactionType: null,
      transactionAmount: null,
      holdingsExplicitlyStated: false,
    };
  }
}

/**
 * Extract holdings from text using LLM
 */
export async function extractHoldingsFromText(
  text: string,
  context: ExtractionContext,
  config: LLMConfig
): Promise<ExtractionResult> {
  if (!text || text.trim().length < 50) {
    return {
      holdings: null,
      sharesOutstanding: null,
      classAShares: null,
      classBShares: null,
      costBasis: null,
      confidence: 0,
      reasoning: 'Text too short for extraction',
      extractedDate: null,
      rawNumbers: [],
      transactionType: null,
      transactionAmount: null,
      holdingsExplicitlyStated: false,
    };
  }

  // Early relevance check - skip LLM if text clearly doesn't contain crypto info
  if (!isLikelyRelevant(text)) {
    console.log(`[LLM Extractor] Skipping ${context.ticker} - text not relevant (no crypto keywords + numbers)`);
    return {
      holdings: null,
      sharesOutstanding: null,
      classAShares: null,
      classBShares: null,
      costBasis: null,
      confidence: 0,
      reasoning: 'Text does not appear to contain crypto holdings information',
      extractedDate: null,
      rawNumbers: [],
      transactionType: null,
      transactionAmount: null,
      holdingsExplicitlyStated: false,
    };
  }

  const model = config.model || DEFAULT_MODELS[config.provider];
  const prompt = buildExtractionPrompt(text, context);

  try {
    switch (config.provider) {
      case 'anthropic':
        return await callClaude(prompt, config.apiKey, model);
      case 'grok':
        return await callGrok(prompt, config.apiKey, model);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  } catch (error) {
    console.error('LLM extraction error:', error);
    return {
      holdings: null,
      sharesOutstanding: null,
      classAShares: null,
      classBShares: null,
      costBasis: null,
      confidence: 0,
      reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      extractedDate: null,
      rawNumbers: [],
      transactionType: null,
      transactionAmount: null,
      holdingsExplicitlyStated: false,
    };
  }
}

/**
 * Validate extraction result with sanity checks
 */
export function validateExtraction(
  result: ExtractionResult,
  context: ExtractionContext
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (result.holdings === null) {
    return { valid: false, issues: ['No holdings extracted'] };
  }

  // Check for unrealistic values
  if (result.holdings < 0) {
    issues.push('Negative holdings value');
  }

  if (result.holdings > 1e12) {
    issues.push('Holdings value seems unrealistically high');
  }

  // Check for dramatic changes
  if (context.currentHoldings > 0) {
    const changePct = Math.abs(
      (result.holdings - context.currentHoldings) / context.currentHoldings
    ) * 100;

    if (changePct > 100) {
      issues.push(`Large change detected: ${changePct.toFixed(1)}% from current holdings`);
    }
  }

  // Check confidence
  if (result.confidence < 0.5) {
    issues.push(`Low confidence: ${(result.confidence * 100).toFixed(0)}%`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Create LLM config from environment variables
 */
export function createLLMConfigFromEnv(): LLMConfig | null {
  const provider = (process.env.MONITORING_LLM_PROVIDER || 'anthropic') as LLMProvider;
  const model = process.env.MONITORING_LLM_MODEL;

  let apiKey: string | undefined;

  switch (provider) {
    case 'anthropic':
      apiKey = process.env.ANTHROPIC_API_KEY;
      break;
    case 'grok':
      apiKey = process.env.GROK_API_KEY;
      break;
  }

  if (!apiKey) {
    console.warn(`No API key found for LLM provider: ${provider}`);
    return null;
  }

  return { provider, apiKey, model };
}
