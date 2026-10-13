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

/**
 * v2-dev (and other non-production servers) are typically slower than the live site —
 * use longer timeouts when not testing against v2 production. Even on production
 * the live site can be slow, so the production baseline is generous.
 */
const isProduction = baseURL.startsWith('https://v2.virtualflybrain.org');
const slowFactor = isProduction ? 1 : 3;
const testTimeout = 120_000 * slowFactor;     // 120s prod / 360s dev
const expectTimeout = 20_000 * slowFactor;    // 20s  prod /  60s dev
const navigationTimeout = 60_000 * slowFactor; // 60s prod / 180s dev
const actionTimeout = 60_000 * slowFactor;    // 60s  prod / 180s dev

export default defineConfig({
  testDir: './tests',
  /* Fails the run if a site outage caused tests to be skipped (see tests/site-health.ts) */
  globalTeardown: './tests/outage-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  /* Single worker to avoid overloading the remote site with concurrent requests */
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL,
    // Traces are large (50-100 MB per retry) and eat the GitHub artifact quota.
    // Screenshots on failure + the page snapshot in error-context.md are usually
    // enough for triage; flip back to 'on-first-retry' for deeper local debugging.
    trace: process.env.CI ? 'off' : 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout,
    actionTimeout,
  },
  projects: [
    /* Pre-run site health check; if the site is down the rest of the suite is skipped.
       Use --no-deps to skip it when running tests locally. */
    {
      name: 'site-health',
      testMatch: /site-health\.setup\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['site-health'],
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
  /* Test and assertion timeouts — extended automatically for non-production servers */
  timeout: testTimeout,
  expect: {
    timeout: expectTimeout,
  },
});
