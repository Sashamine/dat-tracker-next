export const GROWTH_LOOKBACK_GRACE_DAYS = {
  30: 20,
  90: 45,
  365: 120,
} as const;

function toDayStart(input: Date | string): Date {
  const date = typeof input === "string" ? new Date(`${input}T00:00:00Z`) : new Date(input);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function daysBetweenUtc(later: Date | string, earlier: Date | string): number {
  const laterDate = toDayStart(later);
  const earlierDate = toDayStart(earlier);
  return Math.floor((laterDate.getTime() - earlierDate.getTime()) / 86400000);
}

export function findSnapshotOnOrBefore<T>(
  snapshots: T[],
  targetDate: Date,
  options: {
    getDate: (snapshot: T) => string;
    maxLagDays?: number;
  }
): T | null {
  const targetIso = targetDate.toISOString().split("T")[0];
  let best: T | null = null;

  for (const snapshot of snapshots) {
    const snapshotDate = options.getDate(snapshot);
    if (!snapshotDate || snapshotDate > targetIso) continue;
    if (!best || snapshotDate > options.getDate(best)) best = snapshot;
  }

  if (!best) return null;

  if (typeof options.maxLagDays === "number") {
    const lag = daysBetweenUtc(targetIso, options.getDate(best));
    if (lag > options.maxLagDays) return null;
  }

  return best;
}
