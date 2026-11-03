import { Container, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { meetingsList, type Meeting } from "../api-client";
import { getErrorMessage } from "../errors";

const startFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Moscow",
});

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    meetingsList()
      .then(({ data, error }) => {
        if (error !== undefined) {
          setError(getErrorMessage(error));
          return;
        }
        setMeetings(data ?? []);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });
  }, []);

  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Предстоящие встречи</Title>
        {error !== null ? (
          <Text c="red">Не удалось загрузить встречи: {error}</Text>
        ) : meetings === null ? (
          <Loader size="sm" type="dots" />
        ) : meetings.length === 0 ? (
          <Text c="dimmed">Предстоящих встреч нет.</Text>
        ) : (
          <Stack gap="sm">
            {meetings.map((meeting) => (
              <Text key={meeting.id}>
                {meeting.eventTypeTitle} — {startFormatter.format(new Date(meeting.start))}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
