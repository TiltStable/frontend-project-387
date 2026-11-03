import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { formatOffsetDateTime, parseOffsetDateTime } from "./domain/datetime.js";
import { validateEventTypeCreate } from "./domain/eventType.js";
import { overlaps } from "./domain/overlap.js";
import { computeAvailableSlots } from "./domain/slots.js";
import { createInMemoryBookingStore, type BookingStore, type EventTypeStore } from "./store.js";

const DEFAULT_STATIC_ROOT = "./apps/frontend/dist";

export interface AppDeps {
  eventTypes: EventTypeStore;
  bookings?: BookingStore;
  now?: () => number;
  /** Directory with the built SPA (index.html + assets), relative to cwd. */
  staticRoot?: string;
}

export function createApp(deps: AppDeps) {
  const bookings = deps.bookings ?? createInMemoryBookingStore();
  const now = deps.now ?? (() => Date.now());
  const staticRoot = (deps.staticRoot ?? DEFAULT_STATIC_ROOT).replaceAll("\\", "/");
  const app = new Hono();

  app.use(cors());

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.get("/api/event-types", (c) => c.json(deps.eventTypes.list()));

  app.post("/api/event-types", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json(
        { code: "INVALID_JSON", message: "Тело запроса должно быть корректным JSON." },
        400,
      );
    }

    const result = validateEventTypeCreate(raw);
    if (!result.ok) {
      return c.json(result.error, 400);
    }

    if (deps.eventTypes.get(result.value.id) !== undefined) {
      return c.json(
        { code: "EVENT_TYPE_ID_TAKEN", message: "Тип события с таким id уже существует." },
        409,
      );
    }

    return c.json(deps.eventTypes.create(result.value), 201);
  });

  app.get("/api/available-slots", (c) => {
    const eventTypeId = c.req.query("eventTypeId");
    if (!eventTypeId) {
      return c.json({ code: "INVALID_REQUEST", message: "Укажите eventTypeId." }, 400);
    }

    const eventType = deps.eventTypes.get(eventTypeId);
    if (eventType === undefined) {
      return c.json({ code: "EVENT_TYPE_NOT_FOUND", message: "Тип события не найден." }, 404);
    }

    const result = computeAvailableSlots({
      now: now(),
      durationMinutes: eventType.durationMinutes,
      bookings: bookings.list(),
    });

    return c.json({
      eventTypeId: eventType.id,
      durationMinutes: eventType.durationMinutes,
      windowFrom: result.windowFrom,
      windowTo: result.windowTo,
      slots: result.slots.map(formatOffsetDateTime),
    });
  });

  app.post("/api/bookings", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json(
        { code: "INVALID_JSON", message: "Тело запроса должно быть корректным JSON." },
        400,
      );
    }

    if (typeof raw !== "object" || raw === null) {
      return c.json({ code: "INVALID_REQUEST", message: "Ожидается JSON-объект." }, 400);
    }
    const { eventTypeId, start } = raw as Record<string, unknown>;
    if (typeof eventTypeId !== "string" || eventTypeId === "") {
      return c.json({ code: "INVALID_REQUEST", message: "Укажите eventTypeId." }, 400);
    }

    const startMs = parseOffsetDateTime(start);
    if (startMs === null) {
      return c.json(
        {
          code: "INVALID_START",
          message:
            "start должен быть датой-временем ISO 8601 с офсетом, например 2026-11-02T09:00:00+03:00.",
        },
        400,
      );
    }

    const eventType = deps.eventTypes.get(eventTypeId);
    if (eventType === undefined) {
      return c.json({ code: "EVENT_TYPE_NOT_FOUND", message: "Тип события не найден." }, 404);
    }

    if (startMs % (15 * 60_000) !== 0) {
      return c.json(
        { code: "SLOT_NOT_ON_GRID", message: "Старт должен быть кратен 15 минутам." },
        400,
      );
    }

    const workingWindow = computeAvailableSlots({
      now: now(),
      durationMinutes: eventType.durationMinutes,
      bookings: [],
    });
    if (!workingWindow.slots.includes(startMs)) {
      return c.json(
        {
          code: "SLOT_OUTSIDE_WORKING_WINDOW",
          message: "Слот вне окна записи (14 дней с завтрашнего дня) или рабочих часов владельца.",
        },
        400,
      );
    }

    const durationMs = eventType.durationMinutes * 60_000;
    const candidate = { startMs, endMs: startMs + durationMs };
    if (bookings.list().some((booking) => overlaps(candidate, booking))) {
      return c.json(
        { code: "SLOT_TAKEN", message: "Это время уже занято. Выберите другой слот." },
        409,
      );
    }

    const created = bookings.create({
      id: randomUUID(),
      eventTypeId: eventType.id,
      startMs,
      endMs: candidate.endMs,
    });

    return c.json(
      {
        id: created.id,
        eventTypeId: created.eventTypeId,
        eventTypeTitle: eventType.title,
        start: formatOffsetDateTime(created.startMs),
        end: formatOffsetDateTime(created.endMs),
      },
      201,
    );
  });

  app.get("/api/meetings", (c) => {
    const currentMs = now();
    const upcoming = bookings
      .list()
      .filter((booking) => booking.startMs >= currentMs)
      .sort((a, b) => a.startMs - b.startMs)
      .map((booking) => ({
        id: booking.id,
        eventTypeId: booking.eventTypeId,
        eventTypeTitle: deps.eventTypes.get(booking.eventTypeId)?.title ?? booking.eventTypeId,
        start: formatOffsetDateTime(booking.startMs),
        end: formatOffsetDateTime(booking.endMs),
      }));

    return c.json(upcoming);
  });

  app.use("*", serveStatic({ root: staticRoot }));
  app.all("/api/*", (c) => c.json({ code: "NOT_FOUND", message: "Маршрут не найден." }, 404));
  app.get("*", serveStatic({ path: `${staticRoot}/index.html` }));

  return app;
}
