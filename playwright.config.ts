import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL can be set via the VFB_BASE_URL environment variable.
 * Defaults to the production v2 site.
 *
 * Examples:
 *   VFB_BASE_URL=https://v2-dev.virtualflybrain.org/ npx playwright test
 *   npx playwright test                # uses https://v2.virtualflybrain.org/
 */
const baseURL = process.env.VFB_BASE_URL ?? 'https://v2.virtualflybrain.org/';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to add more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  /* Increase timeout for a remote site that may be slow to load */
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
});
