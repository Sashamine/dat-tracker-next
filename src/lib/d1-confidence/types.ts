export type DatapointForScoring = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number | null;
  unit: string | null;
  scale: number | null;
  as_of: string | null;
  reported_at: string | null;
  method: string | null;
  artifact_id: string | null;
  created_at: string;

  // Joined from artifacts table
  source_type: string | null;
  source_url: string | null;

  // Joined from datapoint_verifications (latest row)
  latest_verdict: 'pass' | 'warn' | 'fail' | null;
  latest_checks_json: string | null;
};

export type ConfidenceFactor = {
  name: string;
  weight: number;
  score: number;
  weighted_score: number;
  detail: string;
};

export type ConfidenceDetails = {
  version: string;
  factors: ConfidenceFactor[];
  summary: string;
};

export type ConfidenceScoreResult = {
  confidence: number;
  confidence_details: ConfidenceDetails;
};

export type ConfidenceLevel = 'high' | 'medium' | 'dlq';
