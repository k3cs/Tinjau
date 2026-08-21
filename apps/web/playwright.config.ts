import { defineConfig, devices } from "@playwright/test";

/**
 * `TINJAU_E2E_BASE_URL` points the whole suite at a deployed origin instead of
 * a local dev server, which is what T7.4's clean-browser rehearsal actually
 * needs: the same assertions, run against the URL a judge will open. When it is
 * set the local `webServer` is skipped, because starting one would prove
 * nothing about the deployment.
 */
const REMOTE = process.env.TINJAU_E2E_BASE_URL;
const LOCAL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 2,
  timeout: 60_000,
  reporter: "line",
  use: {
    baseURL: REMOTE ?? LOCAL,
    trace: "retain-on-failure",
  },
  webServer: REMOTE
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: LOCAL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
