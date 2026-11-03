import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import {
  createInMemoryBookingStore,
  createInMemoryEventTypeStore,
  type EventTypeRecord,
} from "./store.js";

const NOW = Date.parse("2026-10-30T12:00:00+03:00");

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

const HALF_HOUR: EventTypeRecord = {
  id: "half-hour",
  title: "Полчаса",
  description: "Тридцатиминутный созвон",
  durationMinutes: 30,
};

function makeApp(extraTypes: EventTypeRecord[] = []) {
  const eventTypes = createInMemoryEventTypeStore();
  for (const eventType of [INTRO_CALL, DEEP_DIVE, ...extraTypes]) {
    eventTypes.create(eventType);
  }

  return createApp({
    eventTypes,
    bookings: createInMemoryBookingStore(),
    now: () => NOW,
  });
}

function post(app: ReturnType<typeof makeApp>, body: unknown) {
  return app.request("/api/bookings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/bookings", () => {
  it("creates a booking and returns it with event type title and end time", async () => {
    const res = await post(makeApp(), {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    expect(body).toMatchObject({
      eventTypeId: "intro-call",
      eventTypeTitle: "Знакомство",
      start: "2026-11-02T09:00:00+03:00",
      end: "2026-11-02T09:15:00+03:00",
    });
    expect(body.id).toBeTruthy();
  });

  it("stores and returns a call topic with the booking", async () => {
    const app = makeApp();
    const res = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
      topic: "Обсудить проект",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    expect(body.topic).toBe("Обсудить проект");

    const meetings = await app.request("/api/meetings");
    const meetingBody = (await meetings.json()) as { topic: string }[];
    expect(meetingBody.some((meeting) => meeting.topic === "Обсудить проект")).toBe(true);
  });

  it("keeps bookings without a topic working (topic is empty, neighbor scenario)", async () => {
    const app = makeApp();
    const withoutField = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
    });
    expect(withoutField.status).toBe(201);
    const body = (await withoutField.json()) as Record<string, string>;
    expect(body.topic).toBe("");

    const withEmpty = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:15:00+03:00",
      topic: "",
    });
    expect(withEmpty.status).toBe(201);
    expect(((await withEmpty.json()) as Record<string, string>).topic).toBe("");

    const meetings = (await (await app.request("/api/meetings")).json()) as {
      topic: string;
    }[];
    expect(meetings.map((meeting) => meeting.topic)).toEqual(["", ""]);
  });

  it("rejects a topic longer than 200 characters with TOPIC_TOO_LONG", async () => {
    const res = await post(makeApp(), {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
      topic: "т".repeat(201),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe("TOPIC_TOO_LONG");
  });

  it("treats a whitespace-only topic as no topic (regression)", async () => {
    const res = await post(makeApp(), {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
      topic: "   ",
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, string>;
    expect(body.topic).toBe("");
  });

  it("rejects a conflicting slot even when a topic is present", async () => {
    const app = makeApp();
    await post(app, { eventTypeId: "intro-call", start: "2026-11-02T09:00:00+03:00" });

    const res = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T09:00:00+03:00",
      topic: "Дубль",
    });

    expect(res.status).toBe(409);
    expect(((await res.json()) as { code: string }).code).toBe("SLOT_TAKEN");
  });

  it("rejects a booking that partially overlaps an existing one of another type (60-min at 10:00, then 30-min at 10:30)", async () => {
    const app = makeApp();
    const first = await post(app, {
      eventTypeId: "deep-dive",
      start: "2026-11-02T10:00:00+03:00",
    });
    expect(first.status).toBe(201);

    const second = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T10:30:00+03:00",
    });

    expect(second.status).toBe(409);
    const body = (await second.json()) as { code: string; message: string };
    expect(body.code).toBe("SLOT_TAKEN");
    expect(body.message).toContain("уже занято");
  });

  it("allows a booking that starts exactly when the previous one ends", async () => {
    const app = makeApp();
    await post(app, { eventTypeId: "deep-dive", start: "2026-11-02T10:00:00+03:00" });

    const res = await post(app, {
      eventTypeId: "intro-call",
      start: "2026-11-02T11:00:00+03:00",
    });

    expect(res.status).toBe(201);
  });

  it("resolves concurrent bookings of the same slot to exactly one 201 and one 409", async () => {
    const app = makeApp();
    const body = { eventTypeId: "intro-call", start: "2026-11-02T09:00:00+03:00" };

    const results = await Promise.all([post(app, body), post(app, body)]);
    const statuses = results.map((res) => res.status).sort();

    expect(statuses).toEqual([201, 409]);
  });

  it.each([
    ["unknown event type", { eventTypeId: "nope", start: "2026-11-02T09:00:00+03:00" }, 404],
    ["not a date", { eventTypeId: "intro-call", start: "not-a-date" }, 400],
    ["no utc offset", { eventTypeId: "intro-call", start: "2026-11-02T09:00:00" }, 400],
    [
      "nonexistent date rolls over",
      { eventTypeId: "intro-call", start: "2026-09-31T09:00:00+03:00" },
      400,
    ],
    ["hour out of range", { eventTypeId: "intro-call", start: "2026-11-02T24:00:00+03:00" }, 400],
    [
      "off the 15-minute grid",
      { eventTypeId: "intro-call", start: "2026-11-02T09:07:00+03:00" },
      400,
    ],
    ["saturday", { eventTypeId: "intro-call", start: "2026-10-31T09:00:00+03:00" }, 400],
    [
      "beyond the 14-day window",
      { eventTypeId: "intro-call", start: "2026-11-14T09:00:00+03:00" },
      400,
    ],
    [
      "before working hours",
      { eventTypeId: "intro-call", start: "2026-11-02T08:45:00+03:00" },
      400,
    ],
    ["after working hours", { eventTypeId: "intro-call", start: "2026-11-02T18:00:00+03:00" }, 400],
  ])("rejects %s", async (_name, body, expectedStatus) => {
    const res = await post(makeApp(), body);

    expect(res.status).toBe(expectedStatus);
  });

  it("rejects a 30-minute booking at 17:45 because it ends after working hours", async () => {
    const res = await post(makeApp([HALF_HOUR]), {
      eventTypeId: "half-hour",
      start: "2026-11-02T17:45:00+03:00",
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "SLOT_OUTSIDE_WORKING_WINDOW" });
  });
});
