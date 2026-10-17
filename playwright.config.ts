import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT } from "./e2e/settings.mjs";

export default defineConfig({
  testDir: "e2e",
  // The specs share one database and buy real stock from it, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set this to use an already installed Chromium instead of `npx playwright install`.
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
      },
    },
  ],
  webServer: {
    command: "node e2e/serve.mjs",
    url: `http://localhost:${E2E_PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "pipe",
  },
});
