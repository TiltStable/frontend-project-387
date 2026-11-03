import { MantineProvider } from "@mantine/core";
import { render, type RenderResult } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router";

type RenderOptions = { path?: string };

export function renderWithProviders(
  ui: ReactElement,
  { path = "/" }: RenderOptions = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MantineProvider>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </MantineProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}
