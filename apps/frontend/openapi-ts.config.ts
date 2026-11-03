import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../contracts/tsp-output/openapi.yaml",
  output: "src/api-client",
});
