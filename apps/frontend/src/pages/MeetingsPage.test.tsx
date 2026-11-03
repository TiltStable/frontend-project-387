import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test-utils";

vi.mock("../api-client", () => ({
  meetingsList: vi.fn(),
}));

import { meetingsList } from "../api-client";
import MeetingsPage from "./MeetingsPage";

const mockedMeetingsList = vi.mocked(meetingsList);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MeetingsPage", () => {
  it("shows upcoming meetings of different types", async () => {
    mockedMeetingsList.mockResolvedValue({
      data: [
        {
          id: "b1",
          eventTypeId: "intro-call",
          eventTypeTitle: "Знакомство",
          start: "2026-11-02T09:00:00+03:00",
          end: "2026-11-02T09:15:00+03:00",
        },
        {
          id: "b2",
          eventTypeId: "deep-dive",
          eventTypeTitle: "Разбор проекта",
          start: "2026-11-03T10:00:00+03:00",
          end: "2026-11-03T11:00:00+03:00",
        },
      ],
    } as never);

    renderWithProviders(<MeetingsPage />);

    expect(await screen.findByText(/Знакомство — 2 ноября/)).toBeTruthy();
    expect(screen.getByText(/Разбор проекта — 3 ноября/)).toBeTruthy();
  });

  it("shows an empty state when there are no meetings", async () => {
    mockedMeetingsList.mockResolvedValue({ data: [] } as never);

    renderWithProviders(<MeetingsPage />);

    expect(await screen.findByText("Предстоящих встреч нет.")).toBeTruthy();
  });

  it("shows an error when loading meetings fails", async () => {
    mockedMeetingsList.mockResolvedValue({ error: "Internal Server Error" } as never);

    renderWithProviders(<MeetingsPage />);

    expect(
      await screen.findByText("Не удалось загрузить встречи: Internal Server Error"),
    ).toBeTruthy();
    expect(screen.queryByText("Предстоящих встреч нет.")).toBeNull();
  });
});
