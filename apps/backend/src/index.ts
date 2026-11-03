import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createInMemoryEventTypeStore } from "./store.js";

const rawPort = process.env.PORT;
const port = rawPort === undefined ? 3000 : Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT value: "${rawPort}". Must be an integer from 1 to 65535.`);
  process.exit(1);
}

const app = createApp({ eventTypes: createInMemoryEventTypeStore() });

serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`Backend is running on http://localhost:${info.port}`);
});
