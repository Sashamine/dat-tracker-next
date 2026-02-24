export const policyVersion = '0.1';

export type VerifierPolicy = {
  hardPrefixes: string[];
  hardExact: string[];
  warnExact: string[];
};

// Policy v0: be conservative about what blocks "verified".
export const policyV0: VerifierPolicy = {
  hardPrefixes: ['schemaVersion_', 'read_failed', 'ticker_mismatch', 'invalid_', 'low_quality_evidence:'],
  hardExact: ['missing_asOf', 'missing_generatedAt', 'missing_listing.country', 'missing_listing.exchangeMic', 'missing_listing.currency', 'missing_cash_asof', 'missing_debt_asof', 'missing_preferred_asof', 'missing_cash_evidence', 'missing_preferred_evidence'],
  warnExact: [],
};

export function isHardIssue(iss: string, p: VerifierPolicy = policyV0): boolean {
  if (p.hardExact.includes(iss)) return true;
  if (p.warnExact.includes(iss)) return false;
  for (const pref of p.hardPrefixes) if (iss.startsWith(pref)) return true;
  return false;
}
