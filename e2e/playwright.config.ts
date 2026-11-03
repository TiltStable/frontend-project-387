import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: [
    {
      // Без watch: tsx watch оставляет zombie-процесс, который держит порт
      // после завершения Playwright и валит следующий запуск.
      command: "npm run start:dev -w backend",
      url: "http://127.0.0.1:3000/health",
      cwd: "..",
      name: "backend",
      stdout: "pipe",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev:frontend",
      url: "http://127.0.0.1:5173",
      cwd: "..",
      name: "frontend",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
