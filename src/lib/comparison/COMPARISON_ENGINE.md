# Comparison Engine

## Overview

The comparison engine runs twice daily (AM + PM) to:
1. Fetch holdings from configured sources
2. Compare against our TypeScript values
3. Create discrepancy records if sources disagree
4. Send email digest if discrepancies found

## Flow

```
CRON (9am ET, 4pm ET)
    │
    ▼
┌─────────────────────────────────┐
│  1. Load our current values     │
│     from companies.ts           │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  2. For each company:           │
│     - Get configured sources    │
│     - Fetch from each source    │
│     - Record in fetch_results   │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  3. Compare                     │
│     - Our value vs fetched      │
│     - If ANY differ → discrepancy│
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  4. If discrepancies found:     │
│     - Send email digest         │
└─────────────────────────────────┘
```

## File Structure

```
src/lib/comparison/
  engine.ts           # Main comparison logic
  email.ts            # Email digest formatting/sending

src/lib/fetchers/
  index.ts            # Fetcher registry
  types.ts            # FetchResult interface
  mnav.ts             # mNAV.com API
  bitcointreasuries.ts
  dashboards/
    strategy.ts
    strive.ts
    sharplink.ts      # (exists)
    defidevcorp.ts
    ...
```

## Interfaces

```typescript
// What a fetcher returns
interface FetchResult {
  ticker: string;
  field: 'holdings' | 'shares' | 'debt' | 'cash';
  value: number;
  source: {
    name: string;       // "mNAV.com", "strategy.com", etc.
    url: string;        // Link to verify
    date: string;       // When source published this (ISO date)
  };
  fetchedAt: Date;
  raw?: unknown;        // Original response for debugging
}

// What we compare against
interface OurValue {
  ticker: string;
  field: 'holdings';
  value: number;
  source: {
    name: string;
    url: string;
    date: string;
  };
}

// Result of comparison
interface ComparisonResult {
  ticker: string;
  field: 'holdings';
  ourValue: number;
  sourceValues: Record<string, {
    value: number;
    url: string;
    date: string;
  }>;
  hasDiscrepancy: boolean;
  maxDeviationPct: number;
  severity: 'minor' | 'moderate' | 'major';
}
```

## Fetcher Interface

Each fetcher exports:

```typescript
// src/lib/fetchers/mnav.ts
export async function fetch(tickers: string[]): Promise<FetchResult[]>;

// Can fetch multiple companies at once (batch API)
// Returns results for all requested tickers
```

## Comparison Logic

```typescript
// src/lib/comparison/engine.ts

export async function runComparison(): Promise<{
  discrepancies: ComparisonResult[];
  errors: { ticker: string; source: string; error: string }[];
}> {
  // 1. Load our values from companies.ts
  const ourValues = loadOurValues(); // Read from TypeScript

  // 2. Get source config for each company
  const sourceConfigs = loadSourceConfigs(); // From company-sources.ts

  // 3. Fetch from all sources
  const fetchResults: FetchResult[] = [];
  const errors: { ticker: string; source: string; error: string }[] = [];

  for (const [sourceName, fetcher] of Object.entries(fetchers)) {
    const tickersForSource = getTickersForSource(sourceName, sourceConfigs);

    if (tickersForSource.length === 0) continue;

    try {
      const results = await fetcher.fetch(tickersForSource);
      fetchResults.push(...results);

      // Record in fetch_results table
      await recordFetchResults(results);
    } catch (err) {
      errors.push({
        ticker: 'batch',
        source: sourceName,
        error: err.message
      });
    }
  }

  // 4. Compare
  const discrepancies: ComparisonResult[] = [];

  for (const ourValue of ourValues) {
    const sourcesForTicker = fetchResults.filter(
      r => r.ticker === ourValue.ticker && r.field === ourValue.field
    );

    if (sourcesForTicker.length === 0) continue;

    const comparison = compare(ourValue, sourcesForTicker);

    if (comparison.hasDiscrepancy) {
      discrepancies.push(comparison);

      // Record in discrepancies table
      await recordDiscrepancy(comparison);
    }
  }

  return { discrepancies, errors };
}

function compare(ourValue: OurValue, sources: FetchResult[]): ComparisonResult {
  const sourceValues: Record<string, { value: number; url: string; date: string }> = {};
  let maxDeviationPct = 0;
  let hasDiscrepancy = false;

  for (const source of sources) {
    sourceValues[source.source.name] = {
      value: source.value,
      url: source.source.url,
      date: source.source.date,
    };

    const deviationPct = Math.abs(
      (source.value - ourValue.value) / ourValue.value * 100
    );

    if (deviationPct > 0) {
      hasDiscrepancy = true;
      maxDeviationPct = Math.max(maxDeviationPct, deviationPct);
    }
  }

  return {
    ticker: ourValue.ticker,
    field: ourValue.field,
    ourValue: ourValue.value,
    sourceValues,
    hasDiscrepancy,
    maxDeviationPct,
    severity: maxDeviationPct < 1 ? 'minor'
            : maxDeviationPct < 5 ? 'moderate'
            : 'major',
  };
}
```

## Email Digest

```typescript
// src/lib/comparison/email.ts

export async function sendDiscrepancyDigest(
  discrepancies: ComparisonResult[],
  errors: { ticker: string; source: string; error: string }[]
): Promise<void> {
  if (discrepancies.length === 0 && errors.length === 0) {
    // No email if nothing to report
    return;
  }

  const html = formatEmailHtml(discrepancies, errors);

  await sendEmail({
    to: process.env.ALERT_EMAIL,
    subject: `DAT Tracker - ${discrepancies.length} discrepancies found`,
    html,
  });
}
```

## Cron Schedule

```typescript
// src/app/api/cron/comparison/route.ts

// Vercel cron: 0 9,16 * * * (9am and 4pm ET)

export async function GET() {
  const { discrepancies, errors } = await runComparison();

  await sendDiscrepancyDigest(discrepancies, errors);

  return Response.json({
    discrepancies: discrepancies.length,
    errors: errors.length,
  });
}
```

## Source Config in company-sources.ts

```typescript
// Add to existing company-sources.ts

export const comparisonSources: Record<string, {
  holdings: string[];  // Which fetchers to use for holdings
}> = {
  'MSTR': {
    holdings: ['mnav', 'bitcointreasuries', 'strategy-dashboard'],
  },
  'MARA': {
    holdings: ['mnav', 'bitcointreasuries'],
  },
  'SBET': {
    holdings: ['sharplink-dashboard'],  // ETH company, not on mNAV
  },
  // ... etc
};
```

## Starting Small

Phase 1 fetchers:
- [x] mNAV.com API (already exists)
- [ ] BitcoinTreasuries.net (scraper)
- [ ] 3 official dashboards: strategy.com, sharplink.com, defidevcorp.com

This covers ~15 BTC companies + SBET + DFDV = good validation set.

---

## Updated: SEC Auto-Update Flow

SEC filings are authoritative - they auto-update, no human review needed.

```
HOURLY SEC CHECK
    │
    ▼
┌─────────────────────────────────┐
│  New 8-K/10-Q detected?         │
└─────────────┬───────────────────┘
              │ Yes
              ▼
┌─────────────────────────────────┐
│  Parse holdings from filing     │
│  (LLM extraction)               │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  AUTO-UPDATE companies.ts       │
│  git add → commit → push        │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Send notification              │
│  "MSTR updated to 709,715 BTC   │
│   from SEC 8-K (Jan 21)"        │
└─────────────────────────────────┘
```

## Other Sources: Discrepancy Flow (unchanged)

Aggregators, dashboards → flag discrepancy → human reviews → manual update.

## Schedule Summary

| Source Type | Check Frequency | On Detection |
|-------------|-----------------|--------------|
| SEC EDGAR | Hourly | Auto-update + notify |
| Dashboards | Twice daily (9am, 12pm) | Flag discrepancy |
| Aggregators | Twice daily (9am, 12pm) | Flag discrepancy |

## Email Digest

- **SEC updates**: Immediate notification per update
- **Discrepancies**: Batched into 9am/12pm digest (if any found)
