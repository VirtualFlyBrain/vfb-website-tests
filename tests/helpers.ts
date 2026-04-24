import { expect, Page } from '@playwright/test';

/** Dismiss the quick help dialog if it appears. */
export async function dismissQuickHelp(page: Page) {
  const skipBtn = page.locator('text=SKIP INTRO');
  if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await skipBtn.click();
  }
}

/** Open search, type a query, click the first result, and wait for Term Info to update. */
export async function searchAndSelect(page: Page, query: string, expectNameContains: string) {
  await page.locator('i.fa-search.arrowsStyle').first().click();
  const searchInput = page.locator('input#searchInput');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(query);
  await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('li.searchResult').first().click();
  await expect(
    page.locator('.Collapsible', { hasText: 'Name' }).locator('.Collapsible__contentInner').first()
  ).toContainText(expectNameContains, { timeout: 30_000 });
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
export async function clickQueryAndExpectResults(page: Page, linkText: string) {
  const queryLink = page.locator('.Collapsible', { hasText: 'Query for' })
    .locator('.Collapsible__contentInner').first()
    .locator('a', { hasText: linkText });
  await queryLink.scrollIntoViewIfNeeded();
  await queryLink.click({ force: true });

  // Wait for query results — different queries show results in different ways:
  // - "N results" text (e.g. for similarity/connectivity queries processed in-app)
  // - A results table with domain-specific headers (e.g. for image list queries)
  // Some queries navigate to a new page that reloads the app.
  // Wait for the navigation and new page to settle.
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Different query types produce different result formats:
  // - "N results" text (similarity/connectivity queries processed in-app)
  // - A results table with domain-specific headers (image lists, transcriptomics, etc.)
  await expect(
    page.locator('text=/\\d+ results/')
      .or(page.locator('th:has-text("Imaging_Technique")'))
      .or(page.locator('th:has-text("Score")'))
      .or(page.locator('th:has-text("Cell type")'))
  ).toBeVisible({ timeout: 120_000 });
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
