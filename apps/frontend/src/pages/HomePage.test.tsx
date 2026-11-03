import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "../test-utils";
import HomePage from "./HomePage";

afterEach(cleanup);

describe("HomePage", () => {
  it("tells about the service", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Календарь звонков" })).toBeTruthy();
  });

  it("leads to the booking page", () => {
    renderWithProviders(<HomePage />);

    const cta = screen.getByRole("link", { name: "Записаться на звонок" });

    expect(cta.getAttribute("href")).toBe("/book");
  });
});
