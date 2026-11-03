import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createInMemoryBookingStore, createInMemoryEventTypeStore } from "./store.js";

function makeAppWithStatic() {
  const staticRoot = mkdtempSync(join(tmpdir(), "call-calendar-static-"));
  writeFileSync(join(staticRoot, "index.html"), "<html><body>SPA entry</body></html>");
  mkdirSync(join(staticRoot, "assets"));
  writeFileSync(join(staticRoot, "assets", "app.js"), "console.log(1);");

  return {
    app: createApp({
      eventTypes: createInMemoryEventTypeStore(),
      bookings: createInMemoryBookingStore(),
      staticRoot,
    }),
    staticRoot,
  };
}

describe("static serving (production mode)", () => {
  it("serves index.html for /", async () => {
    const { app } = makeAppWithStatic();

    const res = await app.request("/");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("SPA entry");
  });

  it("falls back to index.html for SPA deep links", async () => {
    const { app } = makeAppWithStatic();

    const res = await app.request("/book");

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("SPA entry");
  });

  it("serves static assets", async () => {
    const { app } = makeAppWithStatic();

    const res = await app.request("/assets/app.js");

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("console.log(1);");
  });

  it("returns JSON 404 for unknown api paths instead of the SPA fallback", async () => {
    const { app } = makeAppWithStatic();

    const res = await app.request("/api/unknown");

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps /health working alongside static routes", async () => {
    const { app } = makeAppWithStatic();

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});

describe("static serving edge case", () => {
  it("returns plain 404 when index.html is missing (partial build)", async () => {
    const staticRoot = mkdtempSync(join(tmpdir(), "call-calendar-empty-"));
    const app = createApp({
      eventTypes: createInMemoryEventTypeStore(),
      bookings: createInMemoryBookingStore(),
      staticRoot,
    });

    const res = await app.request("/");

    expect(res.status).toBe(404);
  });
});
