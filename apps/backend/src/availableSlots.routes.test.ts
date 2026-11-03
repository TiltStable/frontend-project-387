import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createInMemoryBookingStore, createInMemoryEventTypeStore } from "./store.js";

const NOW = Date.parse("2026-10-30T12:00:00+03:00");

function makeApp(
  bookings: {
    id: string;
    eventTypeId: string;
    topic?: string;
    startMs: number;
    endMs: number;
  }[] = [],
) {
  const eventTypes = createInMemoryEventTypeStore();
  eventTypes.create({
    id: "intro-call",
    title: "Знакомство",
    description: "Короткий звонок",
    durationMinutes: 15,
  });
  const bookingStore = createInMemoryBookingStore();
  for (const booking of bookings) {
    bookingStore.create({ topic: "", ...booking });
  }

  return createApp({ eventTypes, bookings: bookingStore, now: () => NOW });
}

describe("GET /api/available-slots", () => {
  it("returns window bounds and slots for a known event type", async () => {
    const res = await makeApp().request("/api/available-slots?eventTypeId=intro-call");

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      eventTypeId: "intro-call",
      durationMinutes: 15,
      windowFrom: "2026-10-31",
      windowTo: "2026-11-13",
    });
    expect(body.slots).toContain("2026-11-02T09:00:00+03:00");
  });

  it("excludes booked slots from the list", async () => {
    const app = makeApp([
      {
        id: "b1",
        eventTypeId: "intro-call",
        startMs: Date.parse("2026-11-02T09:00:00+03:00"),
        endMs: Date.parse("2026-11-02T09:15:00+03:00"),
      },
    ]);

    const res = await app.request("/api/available-slots?eventTypeId=intro-call");

    const body = (await res.json()) as { slots: string[] };
    expect(body.slots).not.toContain("2026-11-02T09:00:00+03:00");
    expect(body.slots[0]).toBe("2026-11-02T09:15:00+03:00");
  });

  it("returns 404 for unknown event type", async () => {
    const res = await makeApp().request("/api/available-slots?eventTypeId=nope");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "EVENT_TYPE_NOT_FOUND" });
  });

  it("returns 400 when eventTypeId is missing", async () => {
    const res = await makeApp().request("/api/available-slots");

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });
});
