import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import {
  createInMemoryBookingStore,
  createInMemoryEventTypeStore,
  type EventTypeRecord,
} from "./store.js";

const INTRO_CALL: EventTypeRecord = {
  id: "intro-call",
  title: "Знакомство",
  description: "Короткий звонок",
  durationMinutes: 15,
};

const DEEP_DIVE: EventTypeRecord = {
  id: "deep-dive",
  title: "Разбор проекта",
  description: "Часовой созвон",
  durationMinutes: 60,
};

function makeApp(
  nowMs: number,
  bookings: { eventTypeId: string; startMs: number; endMs: number }[],
) {
  const eventTypes = createInMemoryEventTypeStore();
  eventTypes.create(INTRO_CALL);
  eventTypes.create(DEEP_DIVE);
  const bookingStore = createInMemoryBookingStore();
  for (const booking of bookings) {
    bookingStore.create({ id: `b-${booking.startMs}`, ...booking });
  }

  return createApp({ eventTypes, bookings: bookingStore, now: () => nowMs });
}

function bookableAppWithTwoMeetings() {
  const nowMs = Date.parse("2026-10-30T12:00:00+03:00");
  const bookings = [
    {
      eventTypeId: "deep-dive",
      startMs: Date.parse("2026-11-03T10:00:00+03:00"),
      endMs: Date.parse("2026-11-03T11:00:00+03:00"),
    },
    {
      eventTypeId: "intro-call",
      startMs: Date.parse("2026-11-02T09:00:00+03:00"),
      endMs: Date.parse("2026-11-02T09:15:00+03:00"),
    },
  ];

  return { app: makeApp(nowMs, bookings), nowMs };
}

describe("GET /api/meetings", () => {
  it("returns an empty list when there are no bookings", async () => {
    const res = await makeApp(Date.parse("2026-10-30T12:00:00+03:00"), []).request("/api/meetings");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns upcoming bookings of all types sorted by start ascending", async () => {
    const { app } = bookableAppWithTwoMeetings();

    const res = await app.request("/api/meetings");

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      eventTypeId: string;
      eventTypeTitle: string;
      start: string;
    }[];
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({
      eventTypeId: "intro-call",
      eventTypeTitle: "Знакомство",
      start: "2026-11-02T09:00:00+03:00",
    });
    expect(body[1]).toMatchObject({
      eventTypeId: "deep-dive",
      eventTypeTitle: "Разбор проекта",
      start: "2026-11-03T10:00:00+03:00",
    });
  });

  it("hides bookings that have already started", async () => {
    const laterNow = Date.parse("2026-11-02T09:30:00+03:00"); // первая встреча уже началась

    const res = await makeApp(laterNow, [
      {
        eventTypeId: "intro-call",
        startMs: Date.parse("2026-11-02T09:00:00+03:00"),
        endMs: Date.parse("2026-11-02T09:15:00+03:00"),
      },
      {
        eventTypeId: "deep-dive",
        startMs: Date.parse("2026-11-03T10:00:00+03:00"),
        endMs: Date.parse("2026-11-03T11:00:00+03:00"),
      },
    ]).request("/api/meetings");

    const body = (await res.json()) as { eventTypeId: string }[];
    expect(body.map((meeting) => meeting.eventTypeId)).toEqual(["deep-dive"]);
  });
});
