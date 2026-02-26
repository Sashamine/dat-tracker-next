export type CorporateActionType =
  | 'split'
  | 'reverse_split'
  | 'consolidation'
  | 'subdivision';

export type CorporateAction = {
  action_id: string;
  entity_id: string;
  action_type: CorporateActionType | string;
  ratio: number;
  effective_date: string; // YYYY-MM-DD
  source_artifact_id: string | null;
  source_url: string | null;
  quote: string | null;
  confidence: number | null;
  created_at: string;
};

export type NormalizationBasis = 'current' | 'historical';

function assertValidNumber(n: number, name: string) {
  if (!Number.isFinite(n)) throw new Error(`${name} must be finite`);
}

/**
 * Compute multiplier to convert a value reported at `asOf` into the `basis` share basis.
 *
 * Convention: corporate_actions.ratio is the multiplicative change applied to shares
 * at the effective date going FORWARD in time.
 * - 2-for-1 split: ratio = 2
 * - 1-for-10 reverse split: ratio = 0.1
 *
 * For basis='current', we convert historical share counts into today's basis.
 * That means: if action effective_date is AFTER asOf, apply action.ratio.
 */
export function getNormalizationMultiplier(
  actions: Pick<CorporateAction, 'effective_date' | 'ratio'>[],
  asOf: string,
  basis: NormalizationBasis = 'current'
): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error(`asOf must be YYYY-MM-DD, got ${asOf}`);

  let m = 1;
  for (const a of actions) {
    if (!a?.effective_date || !/^\d{4}-\d{2}-\d{2}$/.test(a.effective_date)) {
      throw new Error(`Invalid effective_date: ${String(a?.effective_date)}`);
    }
    assertValidNumber(a.ratio, 'ratio');

    if (basis === 'current') {
      if (a.effective_date > asOf) m *= a.ratio;
    } else {
      // historical basis: convert current → asOf basis
      if (a.effective_date > asOf) m *= 1 / a.ratio;
    }
  }
  return m;
}

export function normalizeShares(
  shares: number,
  actions: Pick<CorporateAction, 'effective_date' | 'ratio'>[],
  asOf: string,
  basis: NormalizationBasis = 'current'
): number {
  assertValidNumber(shares, 'shares');
  return shares * getNormalizationMultiplier(actions, asOf, basis);
}

export function normalizePrice(
  price: number,
  actions: Pick<CorporateAction, 'effective_date' | 'ratio'>[],
  asOf: string,
  basis: NormalizationBasis = 'current'
): number {
  assertValidNumber(price, 'price');
  const m = getNormalizationMultiplier(actions, asOf, basis);
  // shares * price is invariant (ignoring float/rounding)
  return price / m;
}
