import type { EventTypeRecord } from "../store.js";

export interface DomainError {
  code: string;
  message: string;
}

export type EventTypeCreateResult =
  | { ok: true; value: EventTypeRecord }
  | { ok: false; error: DomainError };

const ID_PATTERN = /^[a-z0-9-]{1,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalid(code: string, message: string): EventTypeCreateResult {
  return { ok: false, error: { code, message } };
}

export function validateEventTypeCreate(raw: unknown): EventTypeCreateResult {
  if (!isRecord(raw)) {
    return invalid("INVALID_REQUEST", "Ожидается JSON-объект с полями типа события.");
  }

  const { id, title, description, durationMinutes } = raw;

  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return invalid(
      "INVALID_EVENT_TYPE_ID",
      "id должен быть строкой из строчных латинских букв, цифр и дефисов длиной 1-64.",
    );
  }

  if (typeof title !== "string" || title.length < 1 || title.length > 200) {
    return invalid(
      "INVALID_EVENT_TYPE_TITLE",
      "title должен быть непустой строкой до 200 символов.",
    );
  }

  if (typeof description !== "string" || description.length > 2000) {
    return invalid(
      "INVALID_EVENT_TYPE_DESCRIPTION",
      "description должен быть строкой до 2000 символов.",
    );
  }

  if (
    typeof durationMinutes !== "number" ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 480
  ) {
    return invalid(
      "INVALID_EVENT_TYPE_DURATION",
      "durationMinutes должен быть целым числом от 1 до 480.",
    );
  }

  return { ok: true, value: { id, title, description, durationMinutes } };
}
