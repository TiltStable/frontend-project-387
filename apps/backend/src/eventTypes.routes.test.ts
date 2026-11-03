import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createInMemoryEventTypeStore } from "./store.js";

function makeApp() {
  return createApp({ eventTypes: createInMemoryEventTypeStore() });
}

const validEventType = {
  id: "intro-call",
  title: "Знакомство",
  description: "Короткий звонок",
  durationMinutes: 15,
};

function post(app: ReturnType<typeof makeApp>, body: unknown) {
  return app.request("/api/event-types", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/event-types", () => {
  it("returns empty list when nothing is created", async () => {
    const res = await makeApp().request("/api/event-types");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns created event types", async () => {
    const app = makeApp();
    await post(app, validEventType);

    const res = await app.request("/api/event-types");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([validEventType]);
  });
});

describe("POST /api/event-types", () => {
  it("creates an event type", async () => {
    const res = await post(makeApp(), validEventType);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(validEventType);
  });

  it("rejects duplicate id with 409", async () => {
    const app = makeApp();
    await post(app, validEventType);

    const res = await post(app, { ...validEventType, title: "Другое" });

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "EVENT_TYPE_ID_TAKEN" });
  });

  it.each([
    ["bad slug", { ...validEventType, id: "Intro Call" }],
    ["empty title", { ...validEventType, title: "" }],
    ["zero duration", { ...validEventType, durationMinutes: 0 }],
    ["duration over 480", { ...validEventType, durationMinutes: 481 }],
    ["non-integer duration", { ...validEventType, durationMinutes: 1.5 }],
  ])("rejects %s with 400", async (_name, body) => {
    const res = await post(makeApp(), body);

    expect(res.status).toBe(400);
    const body40x = (await res.json()) as { code: string; message: string };
    expect(body40x.code).toMatch(/^INVALID_/);
    expect(body40x.message).toBeTruthy();
  });

  it("rejects malformed JSON body with 400", async () => {
    const res = await makeApp().request("/api/event-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });

    expect(res.status).toBe(400);
  });
});
