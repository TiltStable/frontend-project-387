import {
  MS_PER_DAY,
  MS_PER_MINUTE,
  MOSCOW_OFFSET_MINUTES,
  dayOfWeek,
  formatDay,
} from "./datetime.js";
import { overlaps, type Interval } from "./overlap.js";

export interface CalendarConfig {
  workStartMinutes: number;
  workEndMinutes: number;
  /** 1 = Monday ... 7 = Sunday. */
  workWeekdays: number[];
  windowStartDaysAhead: number;
  windowDays: number;
  slotStepMinutes: number;
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  workStartMinutes: 9 * 60,
  workEndMinutes: 18 * 60,
  workWeekdays: [1, 2, 3, 4, 5],
  windowStartDaysAhead: 1,
  windowDays: 14,
  slotStepMinutes: 15,
};

export interface AvailableSlotsInput {
  now: number;
  durationMinutes: number;
  bookings: Interval[];
  config?: CalendarConfig;
}

export interface AvailableSlotsResult {
  windowFrom: string;
  windowTo: string;
  slots: number[];
}

export function computeAvailableSlots(input: AvailableSlotsInput): AvailableSlotsResult {
  const { now, durationMinutes, bookings } = input;
  const config = input.config ?? DEFAULT_CALENDAR_CONFIG;
  const offsetMs = MOSCOW_OFFSET_MINUTES * MS_PER_MINUTE;

  const firstDay = Math.floor((now + offsetMs) / MS_PER_DAY) + config.windowStartDaysAhead;
  const lastDay = firstDay + config.windowDays - 1;

  const slotStartsMs: number[] = [];
  for (let day = firstDay; day <= lastDay; day += 1) {
    if (!config.workWeekdays.includes(dayOfWeek(day))) {
      continue;
    }
    for (
      let minute = config.workStartMinutes;
      minute + durationMinutes <= config.workEndMinutes;
      minute += config.slotStepMinutes
    ) {
      const startMs = day * MS_PER_DAY + minute * MS_PER_MINUTE - offsetMs;
      const candidate: Interval = { startMs, endMs: startMs + durationMinutes * MS_PER_MINUTE };
      if (bookings.some((booking) => overlaps(candidate, booking))) {
        continue;
      }
      slotStartsMs.push(startMs);
    }
  }

  return { windowFrom: formatDay(firstDay), windowTo: formatDay(lastDay), slots: slotStartsMs };
}
