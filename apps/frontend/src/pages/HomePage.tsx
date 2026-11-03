import { Anchor, Button, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

export default function HomePage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={1}>Календарь звонков</Title>
        <Text>
          Владелец календаря публикует типы встреч и доступное для них время: название, описание и
          длительность каждой встречи. Гость выбирает подходящий тип и записывается на свободный
          слот в ближайшие 14 дней. Регистрация не нужна.
        </Text>
        <Button component={Link} to="/book" size="md" w="fit-content">
          Записаться на звонок
        </Button>
        <Anchor component={Link} to="/meetings" size="sm">
          Встречи владельца
        </Anchor>
      </Stack>
    </Container>
  );
}
