/**
 * Material Change Detection
 *
 * Compares new datapoint values against existing latest values in D1
 * and identifies material changes worth alerting on.
 *
 * Used by: xbrl-to-d1, foreign-to-d1 crons after writing new data.
 */

import { D1Client } from '@/lib/d1';
import { sendDiscordEmbed } from '@/lib/discord';

// ── Thresholds ──────────────────────────────────────────────────────

/** Minimum % change to consider "material" per metric */
const MATERIAL_THRESHOLDS: Record<string, number> = {
  holdings_native:       0.005,  // 0.5% — any purchase/sale
  basic_shares:          0.01,   // 1%   — dilution or buyback
  debt_usd:              0.05,   // 5%   — new issuance or paydown
  cash_usd:              0.10,   // 10%  — cash is volatile
  preferred_equity_usd:  0.10,   // 10%
  restricted_cash_usd:   0.10,   // 10%
  other_investments_usd: 0.10,   // 10%
  bitcoin_holdings_usd:  0.05,   // 5%   — mostly price-driven, less useful
};

const DEFAULT_THRESHOLD = 0.05;

export interface MaterialChange {
  ticker: string;
  metric: string;
  oldValue: number;
  newValue: number;
  changePct: number;
  oldAsOf: string | null;
  newAsOf: string | null;
  direction: 'up' | 'down';
}

/**
 * Snapshot the current latest values for a set of tickers before cron writes.
 * Call this BEFORE the cron updates D1.
 */
export async function snapshotLatestValues(
  d1: D1Client,
  tickers: string[],
): Promise<Map<string, Map<string, { value: number; as_of: string | null }>>> {
  const snapshot = new Map<string, Map<string, { value: number; as_of: string | null }>>();

  if (tickers.length === 0) return snapshot;

  // Query in batches to avoid SQL limits
  const batchSize = 50;
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');

    const result = await d1.query<{
      entity_id: string;
      metric: string;
      value: number;
      as_of: string | null;
    }>(
      `SELECT entity_id, metric, value, as_of
       FROM latest_datapoints
       WHERE entity_id IN (${placeholders})
         AND status = 'approved'`,
      batch,
    );

    for (const row of result.results) {
      if (!snapshot.has(row.entity_id)) {
        snapshot.set(row.entity_id, new Map());
      }
      snapshot.get(row.entity_id)!.set(row.metric, {
        value: row.value,
        as_of: row.as_of,
      });
    }
  }

  return snapshot;
}

/**
 * Compare current latest values against a pre-write snapshot.
 * Call this AFTER the cron has written to D1.
 */
export async function detectMaterialChanges(
  d1: D1Client,
  tickers: string[],
  beforeSnapshot: Map<string, Map<string, { value: number; as_of: string | null }>>,
): Promise<MaterialChange[]> {
  const changes: MaterialChange[] = [];

  if (tickers.length === 0) return changes;

  const afterSnapshot = await snapshotLatestValues(d1, tickers);

  for (const ticker of tickers) {
    const before = beforeSnapshot.get(ticker);
    const after = afterSnapshot.get(ticker);
    if (!after) continue;

    for (const [metric, afterVal] of after) {
      const beforeVal = before?.get(metric);

      if (!beforeVal) {
        // New metric for this ticker — always material
        if (afterVal.value > 0) {
          changes.push({
            ticker,
            metric,
            oldValue: 0,
            newValue: afterVal.value,
            changePct: 1,
            oldAsOf: null,
            newAsOf: afterVal.as_of,
            direction: 'up',
          });
        }
        continue;
      }

      // Same value = no change
      if (beforeVal.value === afterVal.value) continue;

      // Calculate % change
      const denominator = Math.max(Math.abs(beforeVal.value), 1);
      const changePct = Math.abs(afterVal.value - beforeVal.value) / denominator;
      const threshold = MATERIAL_THRESHOLDS[metric] ?? DEFAULT_THRESHOLD;

      if (changePct >= threshold) {
        changes.push({
          ticker,
          metric,
          oldValue: beforeVal.value,
          newValue: afterVal.value,
          changePct,
          oldAsOf: beforeVal.as_of,
          newAsOf: afterVal.as_of,
          direction: afterVal.value > beforeVal.value ? 'up' : 'down',
        });
      }
    }
  }

  // Sort by importance: holdings first, then by % change
  const metricPriority: Record<string, number> = {
    holdings_native: 0,
    basic_shares: 1,
    debt_usd: 2,
    cash_usd: 3,
    preferred_equity_usd: 4,
  };
  changes.sort((a, b) => {
    const pa = metricPriority[a.metric] ?? 99;
    const pb = metricPriority[b.metric] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.changePct - a.changePct;
  });

  return changes;
}

// ── Formatting ──────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  holdings_native: 'Holdings',
  basic_shares: 'Shares',
  debt_usd: 'Debt',
  cash_usd: 'Cash',
  preferred_equity_usd: 'Preferred',
  restricted_cash_usd: 'Restricted Cash',
  other_investments_usd: 'Other Investments',
  bitcoin_holdings_usd: 'BTC (USD)',
};

function formatValue(metric: string, value: number): string {
  if (metric === 'holdings_native') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (metric === 'basic_shares') {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    return value.toLocaleString('en-US');
  }
  // USD metrics
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString('en-US')}`;
}

/**
 * Send a Discord alert for material data changes.
 */
export async function alertMaterialChanges(
  changes: MaterialChange[],
  source: string,
): Promise<boolean> {
  if (changes.length === 0) return true;

  const lines = changes.slice(0, 15).map(c => {
    const label = METRIC_LABELS[c.metric] || c.metric;
    const arrow = c.direction === 'up' ? '↑' : '↓';
    const pct = (c.changePct * 100).toFixed(1);
    return `**${c.ticker}** ${label}: ${formatValue(c.metric, c.oldValue)} → ${formatValue(c.metric, c.newValue)} (${arrow}${pct}%)`;
  });

  if (changes.length > 15) {
    lines.push(`+${changes.length - 15} more changes`);
  }

  // Determine severity
  const hasHoldingsChange = changes.some(c => c.metric === 'holdings_native');
  const hasLargeChange = changes.some(c => c.changePct > 0.20);
  const color = hasHoldingsChange || hasLargeChange ? 0xf39c12 : 0x3498db; // orange : blue

  return sendDiscordEmbed({
    title: `${changes.length} Material Change${changes.length === 1 ? '' : 's'} Detected`,
    description: lines.join('\n'),
    color,
    fields: [
      { name: 'Source', value: source, inline: true },
      { name: 'Time', value: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', inline: true },
    ],
  }, hasHoldingsChange); // mention if holdings changed
}
