import { defineConfig } from '@playwright/test';

// Dedicated port so e2e never collides with a dev/preview server on Astro's default 4321.
const PORT = 4517;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'chromium-mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // --ignore-lock keeps the preview in the foreground when Astro detects a coding agent
    // (it would otherwise spawn a detached server and exit) and starts alongside any locked
    // preview without claiming the lock. Astro still reads the lock and removes a stale one.
    command: `npx astro preview --ignore-lock --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
