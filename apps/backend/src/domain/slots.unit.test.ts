import { describe, expect, it } from "vitest";
import { computeAvailableSlots, DEFAULT_CALENDAR_CONFIG } from "./slots.js";

const NOW = Date.parse("2026-10-30T12:00:00+03:00");

function compute(durationMinutes: number, bookings: { startMs: number; endMs: number }[] = []) {
  return computeAvailableSlots({ now: NOW, durationMinutes, bookings });
}

describe("computeAvailableSlots", () => {
  it("returns a 14-day calendar window starting tomorrow", () => {
    const result = compute(15);

    expect(result.windowFrom).toBe("2026-10-31");
    expect(result.windowTo).toBe("2026-11-13");
  });

  it("offers the first slot on Monday at 09:00, weekends excluded", () => {
    const result = compute(15);

    expect(result.slots[0]).toBe(Date.parse("2026-11-02T09:00:00+03:00"));
  });

  it("offers the last slot on Friday at 17:45 for 15-minute slots", () => {
    const result = compute(15);

    expect(result.slots[result.slots.length - 1]).toBe(Date.parse("2026-11-13T17:45:00+03:00"));
  });

  it("offers 36 starts per weekday: 10 weekdays give 360 slots", () => {
    const result = compute(15);

    expect(result.slots).toHaveLength(10 * 36);
  });

  it("keeps every start on the 15-minute grid", () => {
    const result = compute(15);

    for (const startMs of result.slots) {
      expect((startMs / 60_000) % 15).toBe(0);
    }
  });

  it("respects slot duration: last 30-minute slot starts at 17:30", () => {
    const result = compute(30);

    expect(result.slots[result.slots.length - 1]).toBe(Date.parse("2026-11-13T17:30:00+03:00"));
  });

  it("excludes booked intervals but keeps adjacent slots", () => {
    const booked = {
      startMs: Date.parse("2026-11-02T09:00:00+03:00"),
      endMs: Date.parse("2026-11-02T09:15:00+03:00"),
    };

    const result = compute(15, [booked]);

    expect(result.slots).not.toContain(Date.parse("2026-11-02T09:00:00+03:00"));
    expect(result.slots).toContain(Date.parse("2026-11-02T09:15:00+03:00"));
  });

  it("excludes slots partially overlapping a longer booking", () => {
    const booked = {
      startMs: Date.parse("2026-11-02T10:00:00+03:00"),
      endMs: Date.parse("2026-11-02T11:00:00+03:00"),
    };

    const result = compute(30, [booked]);

    expect(result.slots).not.toContain(Date.parse("2026-11-02T10:30:00+03:00"));
    expect(result.slots).not.toContain(Date.parse("2026-11-02T10:45:00+03:00"));
    expect(result.slots).toContain(Date.parse("2026-11-02T11:00:00+03:00"));
  });

  it("uses config overrides when provided", () => {
    const result = computeAvailableSlots({
      now: NOW,
      durationMinutes: 15,
      bookings: [],
      config: { ...DEFAULT_CALENDAR_CONFIG, workStartMinutes: 600, workEndMinutes: 660 },
    });

    expect(result.slots).toHaveLength(10 * 4);
  });
});
