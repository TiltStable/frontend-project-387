import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Явный IPv4: на Windows localhost может резолвиться в ::1, и тогда
    // readiness-проверки (Playwright, mise daemons) не достучатся.
    host: "127.0.0.1",
  },
});
