import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Detect whether the current test run targets v2 production. Non-production servers
 * (v2-dev, v2-staging) are typically slower and need extended timeouts.
 */
const baseURL = process.env.VFB_BASE_URL ?? 'https://v2.virtualflybrain.org/';
export const IS_PRODUCTION = baseURL.startsWith('https://v2.virtualflybrain.org');

/** Multiplier applied to most timeouts when targeting a non-production server. */
export const SLOW_FACTOR = IS_PRODUCTION ? 1 : 3;

/** Test timeout for tests with slow operations (queries, graph rendering, ROI tree). */
export const LONG_TEST_TIMEOUT = 360_000 * SLOW_FACTOR;

/** Timeout for waiting on an individual long operation (e.g. query results to appear). */
export const LONG_OP_TIMEOUT = 240_000 * SLOW_FACTOR;

/**
 * Timeout for the very slowest operations: the Template ROI Browser tree (rendering
 * the full anatomy hierarchy), and large term-context graphs. These can take several
 * minutes on the live site under load.
 */
export const VERY_LONG_OP_TIMEOUT = 360_000 * SLOW_FACTOR;

/**
 * Run an awaitable. If it throws a Playwright-style timeout error, rethrow
 * with a `[TIMEOUT]` prefix and a human-readable description of the wait.
 * This makes timeout failures easy to spot in the HTML report and distinguishes
 * them from real assertion failures.
 *
 * Optionally annotates the test with the timeout label so the report's
 * "Annotations" section also flags it.
 */
export async function withTimeoutLabel<T>(
  description: string,
  fn: () => Promise<T>,
  testInfo?: TestInfo,
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = (err && (err.message || err.toString())) || '';
    const isTimeout =
      err?.name === 'TimeoutError' ||
      /Timeout \d+ms exceeded/.test(msg) ||
      /timed out/i.test(msg);
    if (isTimeout) {
      testInfo?.annotations.push({ type: 'timeout', description });
      const wrapped = new Error(`[TIMEOUT] ${description} — ${msg}`);
      wrapped.stack = err.stack;
      throw wrapped;
    }
    throw err;
  }
}

/** Dismiss the quick help dialog if it appears. */
export async function dismissQuickHelp(page: Page) {
  const skipBtn = page.locator('text=SKIP INTRO');
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  }
}

/** Open search, type a query, click the first result, and wait for Term Info to update. */
export async function searchAndSelect(
  page: Page,
  query: string,
  expectNameContains: string,
  testInfo?: TestInfo,
) {
  await page.locator('i.fa-search.arrowsStyle').first().click();
  const searchInput = page.locator('input#searchInput');
  await withTimeoutLabel(
    'search input becoming visible',
    () => expect(searchInput).toBeVisible({ timeout: 10_000 * SLOW_FACTOR }),
    testInfo,
  );
  await searchInput.fill(query);
  await withTimeoutLabel(
    `search results for "${query}"`,
    () => expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 * SLOW_FACTOR }),
    testInfo,
  );
  await page.locator('li.searchResult').first().click();

  // Race the Term Info update against the geppetto error dialog. If the live site
  // fails to load the entity, it shows "Houston, we have a problem" — surface that
  // as a clear, distinct error rather than a generic Term Info timeout.
  const nameContent = page
    .locator('.Collapsible', { hasText: 'Name' })
    .locator('.Collapsible__contentInner')
    .first();
  const houstonDialog = page.locator('text=Houston, we have a problem');

  await withTimeoutLabel(
    `Term Info to update with "${expectNameContains}"`,
    async () => {
      const timeout = 30_000 * SLOW_FACTOR;
      const result = await Promise.race([
        nameContent
          .filter({ hasText: expectNameContains })
          .waitFor({ state: 'visible', timeout })
          .then(() => 'loaded' as const),
        houstonDialog
          .waitFor({ state: 'visible', timeout })
          .then(() => 'site-error' as const),
      ]);
      if (result === 'site-error') {
        const detail = await page
          .locator('text=I broke geppetto')
          .textContent()
          .catch(() => '');
        throw new Error(
          `Site failed to load entity (geppetto error: "${detail || 'Houston, we have a problem'}"). ` +
            `This usually indicates a live-site regression, not a test bug.`,
        );
      }
    },
    testInfo,
  );
}

/** Check that the Name section contains expected semantic tag badges (e.g. label-Adult). */
export async function expectNameTags(page: Page, ...tagClasses: string[]) {
  const nameContent = page.locator('.Collapsible', { hasText: 'Name' })
    .locator('.Collapsible__contentInner').first();
  for (const tag of tagClasses) {
    await expect(nameContent.locator(`span.label-${tag}`)).toBeVisible();
  }
}

/**
 * Click a query link in the "Query for" section by text, scrolling it into view first.
 * Then wait for query results to appear (either "N results" text or a results table).
 */
export async function clickQueryAndExpectResults(page: Page, linkText: string, testInfo?: TestInfo) {
  const queryLink = page.locator('.Collapsible', { hasText: 'Query for' })
    .locator('.Collapsible__contentInner').first()
    .locator('a', { hasText: linkText });
  await queryLink.scrollIntoViewIfNeeded();
  await queryLink.click({ force: true });

  // Some queries navigate to a new page that reloads the app.
  // Wait for the navigation and new page to settle.
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 * SLOW_FACTOR }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 60_000 * SLOW_FACTOR }).catch(() => {});
  await page.waitForTimeout(5000);

  // Different query types produce different result formats:
  // - "N results" text (similarity/connectivity queries processed in-app)
  // - A results table with domain-specific headers (image lists, transcriptomics, etc.)
  await withTimeoutLabel(
    `query results for "${linkText}"`,
    () =>
      expect(
        page
          .locator('text=/\\d+ results/')
          .or(page.locator('th:has-text("Imaging_Technique")'))
          .or(page.locator('th:has-text("Score")'))
          .or(page.locator('th:has-text("Cell type")')),
      ).toBeVisible({ timeout: LONG_OP_TIMEOUT }),
    testInfo,
  );
}

/** Check that a collapsible section exists and contains expected text. */
export async function expectSection(page: Page, sectionName: string, ...expectedTexts: string[]) {
  const section = page.locator('.Collapsible', { hasText: sectionName })
    .locator('.Collapsible__contentInner').first();
  await expect(section).toBeVisible();
  for (const text of expectedTexts) {
    await expect(section).toContainText(text);
  }
}
