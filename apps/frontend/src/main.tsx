import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@mantine/core/styles.css";
import App from "./App.tsx";
import { client } from "./api-client/client.gen";

// В проде SPA и API живут на одном origin (контейнер отдаёт и то, и другое).
// В dev и e2e — vite-сервер, API на localhost:3000 (CORS включён на бекенде).
client.setConfig({
  baseUrl: import.meta.env.PROD ? window.location.origin : "http://localhost:3000",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
);
