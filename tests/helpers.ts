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

/** Check that a collapsible section exists and contains expected text. */
export async function expectSection(page: Page, sectionName: string, ...expectedTexts: string[]) {
  const section = page.locator('.Collapsible', { hasText: sectionName })
    .locator('.Collapsible__contentInner').first();
  await expect(section).toBeVisible();
  for (const text of expectedTexts) {
    await expect(section).toContainText(text);
  }
}
