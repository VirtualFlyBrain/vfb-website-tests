import { test, expect } from '@playwright/test';

test.describe('VFB Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss the quick help dialog if it appears
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('search for DNp01 returns results', async ({ page }) => {
    // Open the search panel via the search icon in the toolbar
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();

    // Type into the search input
    const searchInput = page.locator('input#searchInput');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill('DNp01');

    // Wait for autocomplete results to appear
    const results = page.locator('li.searchResult');
    await expect(results.first()).toBeVisible({ timeout: 15_000 });

    // Should have multiple results
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // The first result should be the DNp01 giant fiber neuron
    await expect(results.first()).toContainText('DNp01');
  });
});
