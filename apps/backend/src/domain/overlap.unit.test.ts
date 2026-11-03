import { describe, expect, it } from "vitest";
import { overlaps } from "./overlap.js";

const MINUTE = 60_000;

function interval(startMinutes: number, endMinutes: number) {
  return { startMs: startMinutes * MINUTE, endMs: endMinutes * MINUTE };
}

describe("overlaps", () => {
  it("detects partial overlap", () => {
    expect(overlaps(interval(540, 600), interval(570, 600))).toBe(true);
  });

  it("detects containment of a shorter interval", () => {
    expect(overlaps(interval(540, 600), interval(630, 660))).toBe(false);
    expect(overlaps(interval(540, 600), interval(545, 555))).toBe(true);
  });

  it("allows adjacency (end equals next start)", () => {
    expect(overlaps(interval(540, 600), interval(600, 630))).toBe(false);
  });

  it("allows disjoint intervals", () => {
    expect(overlaps(interval(540, 600), interval(660, 700))).toBe(false);
  });
});
