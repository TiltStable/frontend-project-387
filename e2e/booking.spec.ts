import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:3000";
const EVENT_TYPE_TITLE = "Знакомство (e2e)";
const CONFLICT_MESSAGE = "Это время уже занято. Выберите другой слот.";
const TOPIC_INPUT = '[data-testid="topic-input"]';

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API}/api/event-types`, {
    data: {
      id: "e2e-intro",
      title: EVENT_TYPE_TITLE,
      description: "Сквозной сценарий бронирования",
      durationMinutes: 30,
    },
  });
  // Идемпотентный seed: 201 создано, 409 уже существует с прошлого прогона.
  expect([201, 409]).toContain(res.status());
});

async function openBookingPage(page: Page) {
  await page.goto("/book");
  await page.getByText(EVENT_TYPE_TITLE).click();
  await page.locator("[data-slot]").first().waitFor();
}

test("guest books a slot and the owner sees the meeting", async ({ page, request }) => {
  await openBookingPage(page);

  const slot = page.locator("[data-slot]").first();
  const slotIso = await slot.getAttribute("data-slot");
  await slot.click();
  await expect(page.getByText(/Вы записаны: Знакомство \(e2e\)/)).toBeVisible();

  const meetings = await request.get(`${API}/api/meetings`);
  const body = (await meetings.json()) as {
    eventTypeTitle: string;
    topic: string;
    start: string;
  }[];
  // Соседний сценарий: бронирование без темы — тема пустая, поведение
  // прежнее. Скоуп — слот этого прогона: занятые слоты исключаются из
  // выдачи, поэтому бронирования слота принадлежат только no-topic
  // тестам и не зависят от переиспользования сервера между прогонами.
  const created = body.filter(
    (meeting) => meeting.eventTypeTitle === EVENT_TYPE_TITLE && meeting.start === slotIso,
  );
  expect(created.length).toBeGreaterThan(0);
  for (const meeting of created) {
    expect(meeting.topic).toBe("");
  }

  await page.goto("/meetings");
  // .first(): если сервер переиспользуется между прогонами, встреч
  // этого типа может быть несколько.
  await expect(page.getByText(`${EVENT_TYPE_TITLE} — `).first()).toBeVisible();
});

test("guest books a slot with a topic and the owner sees the topic", async ({ page, request }) => {
  await openBookingPage(page);

  await page.locator(TOPIC_INPUT).fill("Обсудить проект (e2e)");
  await page.locator("[data-slot]").first().click();
  await expect(
    page.getByText(/Вы записаны: Знакомство \(e2e\).*Тема: «Обсудить проект \(e2e\)»/),
  ).toBeVisible();

  const meetings = await request.get(`${API}/api/meetings`);
  const body = (await meetings.json()) as { eventTypeTitle: string; topic: string }[];
  expect(
    body.some(
      (meeting) =>
        meeting.eventTypeTitle === EVENT_TYPE_TITLE && meeting.topic === "Обсудить проект (e2e)",
    ),
  ).toBe(true);

  await page.goto("/meetings");
  await expect(page.getByText(/Тема: «Обсудить проект \(e2e\)»/).first()).toBeVisible();
});

test("second guest booking the same slot sees a conflict message", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await openBookingPage(pageA);
  await openBookingPage(pageB);

  const slotA = pageA.locator("[data-slot]").first();
  const slotIso = await slotA.getAttribute("data-slot");
  await slotA.click();
  await expect(pageA.getByText(/Вы записаны/)).toBeVisible();

  // Негативный сценарий с темой: конфликт не зависит от наличия темы.
  await pageB.locator(TOPIC_INPUT).fill("Попробую занять то же время");
  await pageB.locator(`[data-slot="${slotIso}"]`).click();
  await expect(pageB.getByText(CONFLICT_MESSAGE)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
