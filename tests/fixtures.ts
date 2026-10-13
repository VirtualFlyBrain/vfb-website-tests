import { test as base } from '@playwright/test';
import { skipIfOutage, recordOutageIfSiteDown, OUTAGE_GUARD_TIMEOUT } from './site-health';

export * from '@playwright/test';

/**
 * Specs import `test` from here rather than '@playwright/test' so every test gets the
 * outage guard: skip tests while the site is known to be down, and check for an outage
 * after any failure. See site-health.ts.
 */
export const test = base.extend<{ outageGuard: void }>({
  outageGuard: [
    async ({ browser, request }, use, testInfo) => {
      skipIfOutage(testInfo);
      await use();
      await recordOutageIfSiteDown(browser, request, testInfo);
    },
    { auto: true, timeout: OUTAGE_GUARD_TIMEOUT },
  ],
});
