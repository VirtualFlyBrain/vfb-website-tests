import { test, expect, Page } from './fixtures';

/** Open the search panel and optionally type a query. */
async function openSearchAndQuery(page: Page, query?: string) {
  await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
  const searchInput = page.locator('input#searchInput');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  if (query) {
    await searchInput.fill(query);
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });
  }
  return searchInput;
}

/** Click a filter icon by label name (single click = include). */
async function enableFilter(page: Page, label: string) {
  const icon = page.locator(`div:has(> span:text-is("${label}")) > i.fa`);
  await icon.click();
  await page.waitForTimeout(300);
  await expect(icon).toHaveClass(/fa-plus-square/);
}

/** Re-trigger a search after changing filters. */
async function retriggerSearch(searchInput: Page['locator'] extends (...args: infer _) => infer R ? R : never, query: string, page: Page) {
  await searchInput.fill('');
  await page.waitForTimeout(300);
  await searchInput.fill(query);
  await page.waitForTimeout(3000);
}

test.describe('VFB Search — Split-GAL4 driver (MB099C)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('search for MB099C returns results', async ({ page }) => {
    await openSearchAndQuery(page, 'MB099C');

    const results = page.locator('li.searchResult');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // First result should contain MB099C
    await expect(results.first()).toContainText('MB099C');
  });

  test('MB099C results are tagged as Split', async ({ page }) => {
    await openSearchAndQuery(page, 'MB099C');

    const firstResult = page.locator('li.searchResult').first();
    const badges = firstResult.locator('span.label.types.badges');
    await expect(badges).toBeVisible();
    await expect(firstResult.locator('span.label-Split')).toBeVisible();
  });

  test('some MB099C Image results carry Nervous_system and Adult tags', async ({ page }) => {
    // Use the Image filter to isolate image entries
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });
    await enableFilter(page, 'Image');

    await page.locator('input#searchInput').fill('MB099C');
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    // At least some image results should have Nervous_system + Adult tags
    const withNervousSystem = page.locator('li.searchResult:has(span.label-Nervous_system)');
    expect(await withNervousSystem.count()).toBeGreaterThan(0);

    const withAdult = page.locator('li.searchResult:has(span.label-Adult)');
    expect(await withAdult.count()).toBeGreaterThan(0);
  });

  test('Split Expression filter returns MB099C results', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });
    await enableFilter(page, 'Split Expression');

    await page.locator('input#searchInput').fill('MB099C');
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    const count = await page.locator('li.searchResult').count();
    expect(count).toBeGreaterThan(0);
  });

  test('Expression Pattern filter returns MB099C results', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });
    await enableFilter(page, 'Expression Pattern');

    await page.locator('input#searchInput').fill('MB099C');
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    const count = await page.locator('li.searchResult').count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('VFB Search Filters — Split-GAL4 driver (MB099C)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('Neuron filter excludes all MB099C results', async ({ page }) => {
    await openSearchAndQuery(page, 'MB099C');
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // Include only Neuron — MB099C is a driver, not a neuron, so expect no results
    await enableFilter(page, 'Neuron');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, 'MB099C', page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBe(0);
  });

  test('Larva filter narrows MB099C results', async ({ page }) => {
    await openSearchAndQuery(page, 'MB099C');
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // Include only Larva — MB099C is predominantly adult data
    await enableFilter(page, 'Larva');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, 'MB099C', page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBeLessThan(unfilteredCount);
  });

  test('Type filter narrows MB099C to a small subset', async ({ page }) => {
    const searchInput = await openSearchAndQuery(page, 'MB099C');
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // Include only Type — should return just the type-level entries
    await enableFilter(page, 'Type');

    await retriggerSearch(searchInput, 'MB099C', page);
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(unfilteredCount);
  });
});
