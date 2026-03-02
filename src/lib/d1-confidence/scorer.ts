import type { DatapointForScoring, ConfidenceFactor, ConfidenceScoreResult } from './types';

const VERSION = 'v1.1';

// --- Method trust ---

const METHOD_SCORES: Record<string, number> = {
  sec_companyfacts_xbrl: 1.0,
  jp_tdnet_pdf: 0.9,
  llm_pdf_extract: 0.7,
  backfill_qe: 0.2,
};
const METHOD_DEFAULT = 0.2;

function scoreMethodTrust(method: string | null): ConfidenceFactor {
  const score = method ? (METHOD_SCORES[method] ?? METHOD_DEFAULT) : METHOD_DEFAULT;
  return {
    name: 'method_trust',
    weight: 0.30,
    score,
    weighted_score: 0.30 * score,
    detail: method ? `method=${method} → ${score}` : 'no method → 0.2',
  };
}

// --- Source quality ---

function scoreSourceQuality(sourceType: string | null, artifactId: string | null): ConfidenceFactor {
  let score: number;
  let detail: string;

  if (!artifactId || artifactId === 'unknown') {
    score = 0.1;
    detail = 'no artifact';
  } else if (!sourceType) {
    score = 0.3;
    detail = 'artifact exists but unknown source_type';
  } else if (sourceType.startsWith('sec_') || sourceType === 'sec_filing') {
    score = 1.0;
    detail = `source_type=${sourceType}`;
  } else if (sourceType === 'tdnet_pdf') {
    score = 0.9;
    detail = `source_type=${sourceType}`;
  } else if (sourceType === 'hkex_pdf' || sourceType === 'sedar_filing') {
    score = 0.8;
    detail = `source_type=${sourceType}`;
  } else {
    score = 0.3;
    detail = `source_type=${sourceType} (unknown tier)`;
  }

  return {
    name: 'source_quality',
    weight: 0.20,
    score,
    weighted_score: 0.20 * score,
    detail,
  };
}

// --- Receipt present ---

function scoreReceiptPresent(sourceUrl: string | null, artifactId: string | null): ConfidenceFactor {
  let score: number;
  let detail: string;

  if (sourceUrl && sourceUrl.length > 0) {
    score = 1.0;
    detail = 'source_url present';
  } else if (artifactId && artifactId !== 'unknown') {
    score = 0.3;
    detail = 'artifact_id present but no source_url';
  } else {
    score = 0.0;
    detail = 'no source_url or artifact';
  }

  return {
    name: 'receipt_present',
    weight: 0.15,
    score,
    weighted_score: 0.15 * score,
    detail,
  };
}

// --- Verification status ---

function scoreVerificationStatus(verdict: 'pass' | 'warn' | 'fail' | null): ConfidenceFactor {
  let score: number;
  let detail: string;

  if (verdict === 'pass') {
    score = 1.0;
    detail = 'latest verdict=pass';
  } else if (verdict === 'warn') {
    score = 0.5;
    detail = 'latest verdict=warn';
  } else if (verdict === 'fail') {
    score = 0.1;
    detail = 'latest verdict=fail';
  } else {
    score = 0.3;
    detail = 'no prior verification';
  }

  return {
    name: 'verification_status',
    weight: 0.15,
    score,
    weighted_score: 0.15 * score,
    detail,
  };
}

// --- Freshness ---

function scoreFreshness(asOf: string | null, now: Date): ConfidenceFactor {
  if (!asOf) {
    return {
      name: 'freshness',
      weight: 0.10,
      score: 0.4,
      weighted_score: 0.10 * 0.4,
      detail: 'no as_of date',
    };
  }

  const asOfDate = new Date(asOf);
  const daysOld = Math.floor((now.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));

  let score: number;
  if (daysOld <= 90) score = 1.0;
  else if (daysOld <= 180) score = 0.8;
  else if (daysOld <= 365) score = 0.5;
  else score = 0.3;

  return {
    name: 'freshness',
    weight: 0.10,
    score,
    weighted_score: 0.10 * score,
    detail: `as_of=${asOf} (${daysOld}d old)`,
  };
}

// --- Sanity bounds ---

type MetricBounds = { min: number; max: number; warnMax?: number };

const METRIC_BOUNDS: Record<string, MetricBounds> = {
  basic_shares:           { min: 1_000,  max: 50_000_000_000 },
  shares_outstanding:     { min: 1_000,  max: 50_000_000_000 },
  cash_usd:               { min: 0,      max: 500_000_000_000 },
  debt_usd:               { min: 0,      max: 500_000_000_000 },
  btc_holdings:           { min: 0,      max: 25_000_000 },
  btc_holdings_usd:       { min: 0,      max: 5_000_000_000_000 },
  eth_holdings:           { min: 0,      max: 100_000_000_000 },
  eth_holdings_usd:       { min: 0,      max: 1_000_000_000_000 },
};

function scoreSanityBounds(metric: string, value: number | null): ConfidenceFactor {
  if (value == null || !Number.isFinite(value)) {
    return {
      name: 'sanity_bounds',
      weight: 0.10,
      score: 0.0,
      weighted_score: 0.0,
      detail: 'missing or invalid value',
    };
  }

  if (value < 0) {
    return {
      name: 'sanity_bounds',
      weight: 0.10,
      score: 0.0,
      weighted_score: 0.0,
      detail: `value=${value} (negative)`,
    };
  }

  const bounds = METRIC_BOUNDS[metric.toLowerCase()];
  if (!bounds) {
    // Unknown metric — if value is non-negative, pass
    return {
      name: 'sanity_bounds',
      weight: 0.10,
      score: 1.0,
      weighted_score: 0.10,
      detail: `no bounds defined for metric=${metric}, value=${value} (non-negative OK)`,
    };
  }

  if (value < bounds.min || value > bounds.max) {
    return {
      name: 'sanity_bounds',
      weight: 0.10,
      score: 0.0,
      weighted_score: 0.0,
      detail: `value=${value} outside [${bounds.min}, ${bounds.max}]`,
    };
  }

  if (bounds.warnMax && value > bounds.warnMax) {
    return {
      name: 'sanity_bounds',
      weight: 0.10,
      score: 0.5,
      weighted_score: 0.05,
      detail: `value=${value} above warnMax=${bounds.warnMax}`,
    };
  }

  return {
    name: 'sanity_bounds',
    weight: 0.10,
    score: 1.0,
    weighted_score: 0.10,
    detail: `value=${value} within bounds`,
  };
}

// --- Main scorer ---

export function scoreDatapoint(
  dp: DatapointForScoring,
  now: Date = new Date()
): ConfidenceScoreResult {
  const factors: ConfidenceFactor[] = [
    scoreMethodTrust(dp.method),
    scoreSourceQuality(dp.source_type, dp.artifact_id),
    scoreReceiptPresent(dp.source_url, dp.artifact_id),
    scoreVerificationStatus(dp.latest_verdict),
    scoreFreshness(dp.as_of, now),
    scoreSanityBounds(dp.metric, dp.value),
  ];

  const confidence = Math.round(factors.reduce((sum, f) => sum + f.weighted_score, 0) * 1000) / 1000;

  const topIssue = factors
    .filter(f => f.score < 0.5)
    .sort((a, b) => a.score - b.score)[0];

  const summary = topIssue
    ? `${confidence.toFixed(2)} — lowest: ${topIssue.name} (${topIssue.score})`
    : `${confidence.toFixed(2)} — all factors adequate`;

  return {
    confidence,
    confidence_details: {
      version: VERSION,
      factors,
      summary,
    },
  };
}

// --- Threshold classification ---

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  DLQ: 0.55,
} as const;

export function classifyConfidence(confidence: number): 'high' | 'medium' | 'dlq' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.DLQ) return 'medium';
  return 'dlq';
}

export function verdictFromConfidence(confidence: number): 'pass' | 'warn' | 'fail' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'pass';
  if (confidence >= CONFIDENCE_THRESHOLDS.DLQ) return 'warn';
  return 'fail';
}
