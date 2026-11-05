import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Niente log dell'app (errori attesi come 409/404, codici OTP finti, avvisi wallet):
    // gli errori dei test falliti restano visibili.
    silent: true,
    // I test api/ condividono il DB di sviluppo: un file alla volta.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
