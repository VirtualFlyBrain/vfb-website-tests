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

// AFCA (Lu 2023). Cluster labels contain "Aging Fly Cell Atlas"; the dataset is
// labelled "scRNAseq data from Lu (2023)". "Lu (2023)" matches both (plus genes).
const CLUSTER_QUERY = 'Aging Fly Cell Atlas';
const DATASET_QUERY = 'scRNAseq data from Lu';
const MIXED_QUERY = 'Lu (2023)';

test.describe('VFB Search — scRNAseq data (AFCA, Lu 2023)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('search for Aging Fly Cell Atlas returns cluster results', async ({ page }) => {
    await openSearchAndQuery(page, CLUSTER_QUERY);

    const results = page.locator('li.searchResult');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    await expect(results.first()).toContainText('Aging Fly Cell Atlas');
  });

  test('AFCA dataset search returns DataSet-tagged entry', async ({ page }) => {
    await openSearchAndQuery(page, DATASET_QUERY);

    const datasetResults = page.locator('li.searchResult:has(span.label-DataSet)');
    expect(await datasetResults.count()).toBeGreaterThan(0);
  });

  test('some AFCA Cluster results carry Nervous_system tag', async ({ page }) => {
    await openSearchAndQuery(page, CLUSTER_QUERY);

    const nsClusterResults = page.locator(
      'li.searchResult:has(span.label-Cluster):has(span.label-Nervous_system)'
    );
    expect(await nsClusterResults.count()).toBeGreaterThan(0);
  });
});

test.describe('VFB Search Filters — scRNAseq data (AFCA, Lu 2023)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('"Has scRNAseq data" filter keeps the AFCA dataset and drops its clusters', async ({ page }) => {
    const searchInput = await openSearchAndQuery(page, MIXED_QUERY);
    const clusterResults = page.locator('li.searchResult:has(span.label-Cluster)');
    expect(await clusterResults.count()).toBeGreaterThan(0);

    await enableFilter(page, 'Has scRNAseq data');
    await retriggerSearch(searchInput, MIXED_QUERY, page);
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });

    // The filter also matches genes (e.g. "Gustatory receptor LU.1"), so only
    // check that the dataset survives and the clusters do not
    await expect(
      page.locator('li.searchResult:has(span.label-DataSet)', { hasText: 'scRNAseq data from Lu (2023)' })
    ).toBeVisible();
    expect(await clusterResults.count()).toBe(0);
  });

  test('Neuron filter excludes all AFCA results', async ({ page }) => {
    await openSearchAndQuery(page, CLUSTER_QUERY);
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // AFCA clusters are not neurons
    await enableFilter(page, 'Neuron');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, CLUSTER_QUERY, page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBe(0);
  });

  test('Image filter excludes all AFCA results', async ({ page }) => {
    await openSearchAndQuery(page, CLUSTER_QUERY);
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // AFCA is scRNAseq data, not images
    await enableFilter(page, 'Image');

    const searchInput = page.locator('input#searchInput');
    await retriggerSearch(searchInput, CLUSTER_QUERY, page);

    const filteredCount = await page.locator('li.searchResult').count();
    expect(filteredCount).toBe(0);
  });
});
