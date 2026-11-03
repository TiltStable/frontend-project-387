import { Button, Card, Container, Loader, Stack, Text, TextInput, Title } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import {
  availableSlotsApiList,
  bookingsCreate,
  eventTypesList,
  type EventType,
} from "../api-client";
import { getErrorMessage } from "../errors";

const dayFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Moscow",
});

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Moscow",
});

type BookingState =
  | { kind: "idle" }
  | { kind: "booking" }
  | { kind: "booked"; message: string }
  | { kind: "failed"; message: string };

function SlotsPanel({ eventType }: { eventType: EventType }) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [booking, setBooking] = useState<BookingState>({ kind: "idle" });

  const loadSlots = useCallback(() => {
    availableSlotsApiList({ query: { eventTypeId: eventType.id } })
      .then(({ data, error }) => {
        if (error !== undefined) {
          setError(getErrorMessage(error));
          return;
        }
        setSlots(data?.slots ?? []);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, [eventType.id]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  function bookSlot(slot: string) {
    setBooking({ kind: "booking" });
    bookingsCreate({ body: { eventTypeId: eventType.id, start: slot, topic } })
      .then(({ data, error }) => {
        if (data !== undefined) {
          const topicNote = data.topic ? ` Тема: «${data.topic}».` : "";
          setBooking({
            kind: "booked",
            message: `Вы записаны: ${eventType.title}, ${dayFormatter.format(new Date(slot))} в ${timeFormatter.format(new Date(slot))}.${topicNote}`,
          });
          return availableSlotsApiList({ query: { eventTypeId: eventType.id } }).then(
            ({ data: fresh, error: refreshError }) => {
              if (refreshError !== undefined) {
                setError(getErrorMessage(refreshError));
                return;
              }
              setSlots(fresh?.slots ?? []);
            },
          );
        }
        setBooking({ kind: "failed", message: error?.message ?? "Не удалось забронировать слот." });
        return undefined;
      })
      .catch((reason: unknown) => {
        setBooking({
          kind: "failed",
          message: reason instanceof Error ? reason.message : String(reason),
        });
      });
  }

  // Полная замена панели на ошибку — только когда слоты не загружены
  // вовсе. Ошибка обновления после успешной брони не должна прятать
  // подтверждение записи: показываем её отдельной строкой.
  if (error !== null && slots === null) {
    return <Text c="red">Не удалось загрузить слоты: {error}</Text>;
  }
  if (slots === null) {
    return <Loader size="sm" type="dots" />;
  }

  const slotsByDay = new Map<string, string[]>();
  for (const slot of slots) {
    const day = slot.slice(0, 10);
    slotsByDay.set(day, [...(slotsByDay.get(day) ?? []), slot]);
  }

  return (
    <Stack gap="sm">
      {booking.kind === "booked" ? <Text c="teal">{booking.message}</Text> : null}
      {booking.kind === "failed" ? <Text c="red">{booking.message}</Text> : null}
      {error !== null ? <Text c="orange">Не удалось обновить слоты: {error}</Text> : null}
      {slots.length === 0 ? (
        <Text c="dimmed">В ближайшие 14 дней свободных слотов нет.</Text>
      ) : (
        <>
          <TextInput
            label="Тема звонка"
            placeholder="Тема звонка (необязательно)"
            maxLength={200}
            value={topic}
            onChange={(event) => setTopic(event.currentTarget.value)}
            disabled={booking.kind === "booking"}
            data-testid="topic-input"
          />
          {[...slotsByDay.entries()].map(([day, daySlots]) => (
            <div key={day} data-day={day}>
              <Text fw={600}>{dayFormatter.format(new Date(daySlots[0]))}</Text>
              <Button.Group>
                {daySlots.map((slot) => (
                  <Button
                    key={slot}
                    variant="light"
                    size="compact-sm"
                    disabled={booking.kind === "booking"}
                    onClick={() => bookSlot(slot)}
                    data-slot={slot}
                  >
                    {timeFormatter.format(new Date(slot))}
                  </Button>
                ))}
              </Button.Group>
            </div>
          ))}
        </>
      )}
    </Stack>
  );
}

export default function BookPage() {
  const [eventTypes, setEventTypes] = useState<EventType[] | null>(null);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventTypesList()
      .then(({ data, error }) => {
        if (error !== undefined) {
          setError(getErrorMessage(error));
          return;
        }
        setEventTypes(data ?? []);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, []);

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Запись на звонок</Title>
        {error !== null ? (
          <Text c="red">Не удалось загрузить типы встреч: {error}</Text>
        ) : eventTypes === null ? (
          <Loader size="sm" type="dots" />
        ) : eventTypes.length === 0 ? (
          <Text c="dimmed">Пока нет доступных типов встреч.</Text>
        ) : selectedType === null ? (
          <Stack gap="sm">
            <Text c="dimmed">Выберите тип встречи:</Text>
            {eventTypes.map((eventType) => (
              <Card
                key={eventType.id}
                withBorder
                shadow="sm"
                onClick={() => setSelectedType(eventType)}
                style={{ cursor: "pointer" }}
                data-event-type={eventType.id}
              >
                <Stack gap="xs">
                  <Title order={3}>{eventType.title}</Title>
                  <Text>{eventType.description}</Text>
                  <Text size="sm" c="dimmed">
                    Длительность: {eventType.durationMinutes} мин
                  </Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : (
          <Stack gap="sm">
            <Button variant="subtle" w="fit-content" onClick={() => setSelectedType(null)}>
              К выбору типа
            </Button>
            <Title order={2}>{selectedType.title}</Title>
            <SlotsPanel key={selectedType.id} eventType={selectedType} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
