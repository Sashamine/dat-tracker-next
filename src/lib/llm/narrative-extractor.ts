import Anthropic from '@anthropic-ai/sdk';

/**
 * Structured result from LLM extraction
 */
export interface ExtractionResult {
  asset: string;
  amount: number;
  asOf: string;
  confidence: number;
  reasoning: string;
}

/**
 * Utility to extract crypto holdings from corporate narrative text using Claude.
 */
export async function extractHoldingsFromNarrative(
  text: string, 
  ticker: string,
  targetAsset: string = 'BTC'
): Promise<ExtractionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[LLM] ANTHROPIC_API_KEY missing, skipping extraction.');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  // Guard: Don't send massive blobs to save cost
  const truncatedText = text.substring(0, 15000);

  console.log(`[LLM] Extracting ${targetAsset} holdings for ${ticker}...`);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: `You are a financial auditor specializing in digital assets. 
      Your task is to analyze corporate disclosures and extract precise crypto holdings.
      
      CRITICAL RULES:
      1. Distinguish between "Committed to buy" (0 holdings) vs "Currently holds" (Actual holdings).
      2. Only extract holdings if the company states they are currently held as of a specific date.
      3. If no specific current holdings amount is found, return null.
      4. Return results in strictly valid JSON.`,
      messages: [
        {
          role: 'user',
          content: `Analyze this disclosure for ${ticker} and extract the current ${targetAsset} holdings.
          
          Text:
          """
          ${truncatedText}
          """
          
          Return JSON format:
          {
            "asset": "BTC",
            "amount": 1234.56,
            "asOf": "YYYY-MM-DD",
            "confidence": 0.0-1.0,
            "reasoning": "Brief explanation of where the number came from"
          }`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as ExtractionResult;
  } catch (error) {
    console.error(`[LLM] Extraction failed for ${ticker}:`, (error as Error).message);
    return null;
  }
}
