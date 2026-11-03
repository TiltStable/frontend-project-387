import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createInMemoryEventTypeStore } from "./store.js";

describe("smoke", () => {
  it("GET /health responds 200 with ok status", async () => {
    const res = await createApp({ eventTypes: createInMemoryEventTypeStore() }).request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
