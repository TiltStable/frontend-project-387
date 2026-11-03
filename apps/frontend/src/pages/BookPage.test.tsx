import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test-utils";

vi.mock("../api-client", () => ({
  eventTypesList: vi.fn(),
  availableSlotsApiList: vi.fn(),
  bookingsCreate: vi.fn(),
}));

import { availableSlotsApiList, bookingsCreate, eventTypesList } from "../api-client";
import BookPage from "./BookPage";

const mockedEventTypesList = vi.mocked(eventTypesList);
const mockedAvailableSlotsApiList = vi.mocked(availableSlotsApiList);
const mockedBookingsCreate = vi.mocked(bookingsCreate);

const introCall = {
  id: "intro-call",
  title: "Знакомство",
  description: "Короткий звонок",
  durationMinutes: 15,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("BookPage", () => {
  it("shows event types received from the API", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);

    renderWithProviders(<BookPage />);

    expect(await screen.findByText("Знакомство")).toBeTruthy();
    expect(screen.getByText("Короткий звонок")).toBeTruthy();
    expect(screen.getByText(/Длительность: 15 мин/)).toBeTruthy();
  });

  it("shows a message when there are no event types", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [] } as never);

    renderWithProviders(<BookPage />);

    expect(await screen.findByText("Пока нет доступных типов встреч.")).toBeTruthy();
  });

  it("shows an error when loading event types fails", async () => {
    mockedEventTypesList.mockResolvedValue({ error: "Internal Server Error" } as never);

    renderWithProviders(<BookPage />);

    expect(
      await screen.findByText("Не удалось загрузить типы встреч: Internal Server Error"),
    ).toBeTruthy();
    expect(screen.queryByText("Пока нет доступных типов встреч.")).toBeNull();
  });

  it("shows an error when loading slots fails", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({ error: "Internal Server Error" } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));

    expect(
      await screen.findByText("Не удалось загрузить слоты: Internal Server Error"),
    ).toBeTruthy();
    expect(screen.queryByText(/свободных слотов нет/)).toBeNull();
  });

  it("shows available slots grouped by day after selecting an event type", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({
      data: {
        eventTypeId: "intro-call",
        durationMinutes: 15,
        windowFrom: "2026-10-31",
        windowTo: "2026-11-13",
        slots: ["2026-11-02T09:00:00+03:00", "2026-11-02T09:15:00+03:00"],
      },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));

    expect(await screen.findByText("09:00")).toBeTruthy();
    expect(screen.getByText("09:15")).toBeTruthy();
    expect(screen.getByText(/понедельник, 2 ноября/)).toBeTruthy();
  });

  it("books a slot and shows a confirmation", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({
      data: {
        eventTypeId: "intro-call",
        durationMinutes: 15,
        windowFrom: "2026-10-31",
        windowTo: "2026-11-13",
        slots: ["2026-11-02T09:00:00+03:00"],
      },
    } as never);
    mockedBookingsCreate.mockResolvedValue({
      data: {
        id: "b1",
        eventTypeId: "intro-call",
        eventTypeTitle: "Знакомство",
        start: "2026-11-02T09:00:00+03:00",
        end: "2026-11-02T09:15:00+03:00",
      },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));
    fireEvent.click(await screen.findByText("09:00"));

    expect(await screen.findByText(/Вы записаны: Знакомство/)).toBeTruthy();
  });

  it("shows the conflict message when the slot is already taken", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({
      data: {
        eventTypeId: "intro-call",
        durationMinutes: 15,
        windowFrom: "2026-10-31",
        windowTo: "2026-11-13",
        slots: ["2026-11-02T09:00:00+03:00"],
      },
    } as never);
    mockedBookingsCreate.mockResolvedValue({
      error: { code: "SLOT_TAKEN", message: "Это время уже занято. Выберите другой слот." },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));
    fireEvent.click(await screen.findByText("09:00"));

    expect(await screen.findByText("Это время уже занято. Выберите другой слот.")).toBeTruthy();
  });

  it("sends an optional topic with the booking and shows it in the confirmation", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({
      data: {
        eventTypeId: "intro-call",
        durationMinutes: 15,
        windowFrom: "2026-10-31",
        windowTo: "2026-11-13",
        slots: ["2026-11-02T09:00:00+03:00"],
      },
    } as never);
    mockedBookingsCreate.mockResolvedValue({
      data: {
        id: "b1",
        eventTypeId: "intro-call",
        eventTypeTitle: "Знакомство",
        topic: "Обсудить проект",
        start: "2026-11-02T09:00:00+03:00",
        end: "2026-11-02T09:15:00+03:00",
      },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));

    const topicInput = await screen.findByPlaceholderText("Тема звонка (необязательно)");
    fireEvent.change(topicInput, { target: { value: "Обсудить проект" } });
    fireEvent.click(screen.getByText("09:00"));

    expect(await screen.findByText(/Тема: «Обсудить проект»/)).toBeTruthy();
    expect(mockedBookingsCreate).toHaveBeenCalledWith({
      body: {
        eventTypeId: "intro-call",
        start: "2026-11-02T09:00:00+03:00",
        topic: "Обсудить проект",
      },
    });
  });

  it("sends an empty topic when the field is left empty", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList.mockResolvedValue({
      data: {
        eventTypeId: "intro-call",
        durationMinutes: 15,
        windowFrom: "2026-10-31",
        windowTo: "2026-11-13",
        slots: ["2026-11-02T09:00:00+03:00"],
      },
    } as never);
    mockedBookingsCreate.mockResolvedValue({
      data: {
        id: "b1",
        eventTypeId: "intro-call",
        eventTypeTitle: "Знакомство",
        topic: "",
        start: "2026-11-02T09:00:00+03:00",
        end: "2026-11-02T09:15:00+03:00",
      },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));
    fireEvent.click(await screen.findByText("09:00"));

    expect(await screen.findByText(/Вы записаны: Знакомство/)).toBeTruthy();
    expect(screen.queryByText(/Тема:/)).toBeNull();
    expect(mockedBookingsCreate).toHaveBeenCalledWith({
      body: {
        eventTypeId: "intro-call",
        start: "2026-11-02T09:00:00+03:00",
        topic: "",
      },
    });
  });

  it("keeps the booking confirmation visible when slot refresh fails", async () => {
    mockedEventTypesList.mockResolvedValue({ data: [introCall] } as never);
    mockedAvailableSlotsApiList
      .mockResolvedValueOnce({
        data: {
          eventTypeId: "intro-call",
          durationMinutes: 15,
          windowFrom: "2026-10-31",
          windowTo: "2026-11-13",
          slots: ["2026-11-02T09:00:00+03:00"],
        },
      } as never)
      .mockResolvedValueOnce({ error: "Internal Server Error" } as never);
    mockedBookingsCreate.mockResolvedValue({
      data: {
        id: "b1",
        eventTypeId: "intro-call",
        eventTypeTitle: "Знакомство",
        topic: "Обсудить проект",
        start: "2026-11-02T09:00:00+03:00",
        end: "2026-11-02T09:15:00+03:00",
      },
    } as never);

    renderWithProviders(<BookPage />);
    fireEvent.click(await screen.findByText("Знакомство"));
    fireEvent.change(await screen.findByPlaceholderText("Тема звонка (необязательно)"), {
      target: { value: "Обсудить проект" },
    });
    fireEvent.click(screen.getByText("09:00"));

    expect(await screen.findByText(/Тема: «Обсудить проект»/)).toBeTruthy();
    expect(screen.getByText(/Не удалось обновить слоты/)).toBeTruthy();
  });
});
