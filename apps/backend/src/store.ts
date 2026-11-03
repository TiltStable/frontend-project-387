export interface EventTypeRecord {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface EventTypeStore {
  list(): EventTypeRecord[];
  get(id: string): EventTypeRecord | undefined;
  create(eventType: EventTypeRecord): EventTypeRecord;
}

export function createInMemoryEventTypeStore(): EventTypeStore {
  const items = new Map<string, EventTypeRecord>();

  return {
    list: () => [...items.values()],
    get: (id) => items.get(id),
    create: (eventType) => {
      items.set(eventType.id, eventType);
      return eventType;
    },
  };
}

export interface BookingRecord {
  id: string;
  eventTypeId: string;
  /** Empty string when the guest did not provide a topic. */
  topic: string;
  startMs: number;
  endMs: number;
}

export interface BookingStore {
  list(): BookingRecord[];
  create(booking: BookingRecord): BookingRecord;
}

export function createInMemoryBookingStore(): BookingStore {
  const items: BookingRecord[] = [];

  return {
    list: () => [...items],
    create: (booking) => {
      items.push(booking);
      return booking;
    },
  };
}
