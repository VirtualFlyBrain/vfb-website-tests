import { test } from '@playwright/test';
import { BASE_URL } from './helpers';
import {
  checkSiteHealth,
  HEALTH_CHECK_TIMEOUT,
  PRE_RUN_POLL_MS,
  PRE_RUN_WAIT_MS,
  writeOutageState,
} from './site-health';

/**
 * Runs before the main test project (see `dependencies` in playwright.config.ts). If the
 * site doesn't become healthy within PRE_RUN_WAIT_MS, this fails and Playwright skips the
 * rest of the suite, rather than every test timing out against a dead site.
 */
test('site is up before running tests', async ({ browser, request }, testInfo) => {
  test.setTimeout(PRE_RUN_WAIT_MS + 2 * HEALTH_CHECK_TIMEOUT);
  const deadline = Date.now() + PRE_RUN_WAIT_MS;

  for (;;) {
    const health = await checkSiteHealth(browser, request);
    if (health.healthy) return;
    if (Date.now() + PRE_RUN_POLL_MS > deadline) {
      writeOutageState(testInfo.project.outputDir, {
        since: new Date().toISOString(),
        detectedAfter: 'pre-run site health check',
        problems: health.problems,
      });
      throw new Error(
        `[OUTAGE] ${BASE_URL} is unhealthy and did not recover within ${PRE_RUN_WAIT_MS / 60_000} min — ` +
          `skipping the test suite. ${health.problems.join('; ')}`,
      );
    }
    console.log(`[site-health] ${BASE_URL} unhealthy, retrying in ${PRE_RUN_POLL_MS / 1000}s: ${health.problems.join('; ')}`);
    await new Promise((r) => setTimeout(r, PRE_RUN_POLL_MS));
  }
});
