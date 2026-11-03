import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "backend",
          environment: "node",
          include: ["apps/backend/src/**/*.test.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["apps/frontend/src/**/*.test.{ts,tsx}"],
          setupFiles: ["apps/frontend/src/test-setup.ts"],
        },
      },
    ],
  },
});
