// The owner's time zone is Europe/Moscow: a fixed UTC+3 offset with no
// daylight saving, so calendar math works in shifted UTC space.

export const MOSCOW_OFFSET_MINUTES = 180;

export const MS_PER_MINUTE = 60_000;
export const MS_PER_DAY = 86_400_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Days since epoch in Moscow calendar terms. */
export function shiftedDay(ms: number): number {
  return Math.floor((ms + MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE) / MS_PER_DAY);
}

/** 1 = Monday ... 7 = Sunday. */
export function dayOfWeek(day: number): number {
  return ((day + 3) % 7) + 1;
}

/** Calendar date of a Moscow day number as YYYY-MM-DD. */
export function formatDay(day: number): string {
  const date = new Date(day * MS_PER_DAY);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Real epoch ms of a Moscow calendar day's start (00:00 +03:00). */
export function startOfDayMs(day: number): number {
  return day * MS_PER_DAY - MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE;
}

/** Formats epoch ms as an ISO 8601 string with the fixed +03:00 offset. */
export function formatOffsetDateTime(ms: number): string {
  const shifted = new Date(ms + MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE);
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}+03:00`
  );
}

/** Strict ISO 8601 date-time with an explicit offset (Z or +hh:mm); null otherwise.
 *  Calendar components are validated: Date.parse alone rolls nonexistent
 *  dates (2026-09-31 -> 2026-10-01) instead of rejecting them. */
export function parseOffsetDateTime(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (match === null) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const daysInMonth = new Date(Number(year), monthNumber, 0).getDate();

  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  if (dayNumber < 1 || dayNumber > daysInMonth) {
    return null;
  }
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}
