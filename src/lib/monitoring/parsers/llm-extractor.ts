/**
 * LLM-based Holdings Extractor
 * Uses Claude or Grok to extract holdings numbers from text
 */

import { ExtractionResult, ExtractionContext } from '../types';

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
 * Build the extraction prompt
 */
function buildExtractionPrompt(text: string, context: ExtractionContext): string {
  return `You are analyzing a financial document or announcement for ${context.companyName} (${context.ticker}).

This company holds ${context.asset} as a treasury asset. Their current known holdings are ${context.currentHoldings.toLocaleString()} ${context.asset}.

Extract the following information from the text below. Be very careful to distinguish between:
- TOTAL holdings (what we want)
- NEW acquisitions/purchases (not what we want - unless you can calculate total from this)
- Historical holdings (from a previous period)

Only extract values you are confident about based on the text. Do NOT make up numbers.

TEXT TO ANALYZE:
---
${text.substring(0, 8000)}
---

Respond in valid JSON format only, with no markdown formatting:
{
  "holdings": <number or null if not found>,
  "sharesOutstanding": <number or null if not found>,
  "costBasis": <number or null if not found>,
  "extractedDate": "<YYYY-MM-DD or null if not found>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<brief explanation of how you extracted these values, or why you couldn't>",
  "rawNumbers": ["<list of all relevant numbers found in text>"]
}

Important guidelines:
- Set holdings to null if you cannot determine the TOTAL holdings
- If the text only mentions a purchase amount but not total holdings, set holdings to null
- Confidence should reflect how certain you are about the holdings value
- Lower confidence if the text is ambiguous or if numbers could refer to different things
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

    return {
      holdings: parsed.holdings ?? null,
      sharesOutstanding: parsed.sharesOutstanding ?? null,
      costBasis: parsed.costBasis ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
      extractedDate: parsed.extractedDate || null,
      rawNumbers: Array.isArray(parsed.rawNumbers) ? parsed.rawNumbers : [],
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', content);
    return {
      holdings: null,
      sharesOutstanding: null,
      costBasis: null,
      confidence: 0,
      reasoning: `Failed to parse response: ${error instanceof Error ? error.message : String(error)}`,
      extractedDate: null,
      rawNumbers: [],
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
      costBasis: null,
      confidence: 0,
      reasoning: 'Text too short for extraction',
      extractedDate: null,
      rawNumbers: [],
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
      costBasis: null,
      confidence: 0,
      reasoning: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      extractedDate: null,
      rawNumbers: [],
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
