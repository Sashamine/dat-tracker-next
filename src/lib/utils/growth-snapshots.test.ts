import { describe, expect, it } from "vitest";
import { daysBetweenUtc, findSnapshotOnOrBefore, GROWTH_LOOKBACK_GRACE_DAYS } from "./growth-snapshots";

describe("growth-snapshots", () => {
  it("computes whole-day UTC deltas", () => {
    expect(daysBetweenUtc("2026-03-08", "2026-03-01")).toBe(7);
  });

  it("finds the nearest snapshot on or before the target date", () => {
    const snapshots = [
      { date: "2025-09-30", value: 1 },
      { date: "2025-10-15", value: 2 },
      { date: "2025-11-01", value: 3 },
    ];

    const snapshot = findSnapshotOnOrBefore(
      snapshots,
      new Date("2025-10-20T00:00:00Z"),
      { getDate: (row) => row.date }
    );

    expect(snapshot?.value).toBe(2);
  });

  it("returns null when the nearest snapshot is too stale for the requested lookback", () => {
    const snapshots = [
      { date: "2025-06-30", value: 1 },
      { date: "2026-02-28", value: 2 },
    ];

    const snapshot = findSnapshotOnOrBefore(
      snapshots,
      new Date("2025-12-08T00:00:00Z"),
      {
        getDate: (row) => row.date,
        maxLagDays: GROWTH_LOOKBACK_GRACE_DAYS[90],
      }
    );

    expect(snapshot).toBeNull();
  });
});
