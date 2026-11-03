export interface Interval {
  startMs: number;
  endMs: number;
}

/**
 * Two intervals overlap when each starts strictly before the other ends.
 * Adjacent intervals (one ends exactly when the other starts) do not overlap.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}
