import { test, expect, Page } from '@playwright/test';

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

const QUERY = 'AFCA D50 female';

test.describe('VFB Search — scRNAseq data (AFCA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('search for AFCA D50 female returns results', async ({ page }) => {
    await openSearchAndQuery(page, QUERY);

    const results = page.locator('li.searchResult');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    await expect(results.first()).toContainText('AFCA');
  });

  test('AFCA results include DataSet-tagged entries', async ({ page }) => {
    await openSearchAndQuery(page, QUERY);

    const datasetResults = page.locator('li.searchResult:has(span.label-DataSet)');
    expect(await datasetResults.count()).toBeGreaterThan(0);
  });

  test('some AFCA Cluster results carry Nervous_system tag', async ({ page }) => {
    await openSearchAndQuery(page, QUERY);

    const nsClusterResults = page.locator(
      'li.searchResult:has(span.label-Cluster):has(span.label-Nervous_system)'
    );
    expect(await nsClusterResults.count()).toBeGreaterThan(0);
  });
});

test.describe('VFB Search Filters — scRNAseq data (AFCA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('"Has scRNAseq data" filter narrows AFCA results to datasets', async ({ page }) => {
    const searchInput = await openSearchAndQuery(page, QUERY);
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    await enableFilter(page, 'Has scRNAseq data');
    await retriggerSearch(searchInput, QUERY, page);
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(unfilteredCount);

    // All results under this filter should be DataSet-tagged
    const results = page.locator('li.searchResult');
    for (let i = 0; i < filteredCount; i++) {
      await expect(results.nth(i).locator('span.label-DataSet')).toBeVisible();
    }
  });

  test('Neuron filter excludes all AFCA results', async ({ page }) => {
    await openSearchAndQuery(page, QUERY);
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // AFCA entries are datasets and clusters, not neurons
    await enableFilter(page, 'Neuron');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, QUERY, page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBe(0);
  });

  test('Image filter excludes all AFCA results', async ({ page }) => {
    await openSearchAndQuery(page, QUERY);
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // AFCA is scRNAseq data, not images
    await enableFilter(page, 'Image');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, QUERY, page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBe(0);
  });
});
