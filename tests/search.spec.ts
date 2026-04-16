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
    await openSearchAndQuery(page, 'DNp01');

    const results = page.locator('li.searchResult');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);

    // The first result should be the DNp01 giant fiber neuron
    await expect(results.first()).toContainText('DNp01');
  });

  test('DNp01 results display semantic tags', async ({ page }) => {
    await openSearchAndQuery(page, 'DNp01');

    // The first result ("DNp01 (giant fiber neuron)") should carry semantic tags
    const firstResult = page.locator('li.searchResult').first();
    const badges = firstResult.locator('span.label.types.badges');
    await expect(badges).toBeVisible();

    // Check for expected tags on the giant fiber neuron
    const expectedTags = ['primary_neuron', 'Nervous_system', 'Auditory_system', 'Adult'];
    for (const tag of expectedTags) {
      await expect(
        firstResult.locator(`span.label-${tag}`)
      ).toBeVisible();
    }
  });

  test('semantic tags use distinct label classes', async ({ page }) => {
    await openSearchAndQuery(page, 'DNp01');

    // Collect all unique tag classes across all visible results
    const tagClasses = await page.evaluate(() => {
      const tags = document.querySelectorAll('li.searchResult span.label.types.badges span.label');
      const classes = new Set<string>();
      tags.forEach(el => {
        el.classList.forEach(c => {
          if (c.startsWith('label-')) classes.add(c);
        });
      });
      return [...classes].sort();
    });

    // There should be several distinct tag types across the result set
    expect(tagClasses.length).toBeGreaterThan(1);
    expect(tagClasses).toContain('label-Adult');
    expect(tagClasses).toContain('label-Nervous_system');
  });
});

test.describe('VFB Search Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('filter panel is shown with expected categories', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });

    // The filter section should show known categories
    const expectedFilters = [
      'Adult', 'Larva', 'Nervous System', 'Anatomy', 'Neuron',
      'Type', 'Image', 'Expression Pattern',
    ];
    for (const label of expectedFilters) {
      await expect(
        page.locator(`div:has(> i.fa) > span:text-is("${label}")`)
      ).toBeVisible();
    }

    // Should also have a "Clear Filters" button
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('filters start in neutral state', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });

    // All filter icons (except Deprecated) should start as fa-square
    const filterStates = await page.evaluate(() => {
      const container = Array.from(document.querySelectorAll('span')).find(
        el => el.textContent?.trim() === 'Filters' && el.getBoundingClientRect().height > 0
      )?.parentElement;
      if (!container) return [];
      return Array.from(container.querySelectorAll('div')).map(div => {
        const icon = div.querySelector('i.fa');
        const label = div.querySelector('span');
        if (!icon || !label) return null;
        return {
          label: label.textContent?.trim(),
          isNeutral: icon.classList.contains('fa-square'),
          isExcluded: icon.classList.contains('fa-minus-square'),
        };
      }).filter(Boolean);
    });

    for (const f of filterStates) {
      if (f!.label === 'Deprecated') {
        // Deprecated starts excluded (red minus)
        expect(f!.isExcluded).toBe(true);
      } else if (f!.label !== 'Clear Filters') {
        // All others start neutral
        expect(f!.isNeutral).toBe(true);
      }
    }
  });

  test('clicking a filter toggles its icon state', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });

    // Click the Neuron filter icon
    const neuronIcon = page.locator('div:has(> span:text-is("Neuron")) > i.fa');
    await neuronIcon.click();
    await page.waitForTimeout(300);

    // Icon should change from fa-square to fa-plus-square (green, included)
    await expect(neuronIcon).toHaveClass(/fa-plus-square/);

    // Click again — should cycle to fa-minus-square (excluded)
    await neuronIcon.click();
    await page.waitForTimeout(300);
    await expect(neuronIcon).toHaveClass(/fa-minus-square/);

    // Click once more — back to neutral fa-square
    await neuronIcon.click();
    await page.waitForTimeout(300);
    await expect(neuronIcon).toHaveClass(/fa-square/);
    // Make sure it's the plain square, not plus-square or minus-square
    const cls = await neuronIcon.getAttribute('class');
    expect(cls).not.toContain('plus');
    expect(cls).not.toContain('minus');
  });

  test('including a filter narrows search results', async ({ page }) => {
    const searchInput = await openSearchAndQuery(page, 'DNp01');

    // Count unfiltered results
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // Include only Image results — only some DNp01 hits are images,
    // so this should give fewer results than unfiltered
    const imageIcon = page.locator('div:has(> span:text-is("Image")) > i.fa');
    await imageIcon.click();
    await page.waitForTimeout(300);
    await expect(imageIcon).toHaveClass(/fa-plus-square/);

    // Re-trigger search to get filtered results
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await searchInput.fill('DNp01');
    await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });
    // Allow results to fully load
    await page.waitForTimeout(2000);

    const includedCount = await page.locator('li.searchResult').count();
    // Including only Image should narrow the results
    expect(includedCount).toBeGreaterThan(0);
    expect(includedCount).toBeLessThan(unfilteredCount);
  });

  test('excluding a filter narrows search results', async ({ page }) => {
    const searchInput = await openSearchAndQuery(page, 'DNp01');

    // Count unfiltered results
    const unfilteredCount = await page.locator('li.searchResult').count();
    expect(unfilteredCount).toBeGreaterThan(0);

    // Exclude Neuron by clicking twice (neutral -> include -> exclude)
    // All DNp01 results are neurons, so this should eliminate them
    const neuronIcon = page.locator('div:has(> span:text-is("Neuron")) > i.fa');
    await neuronIcon.click();
    await page.waitForTimeout(300);
    await neuronIcon.click();
    await page.waitForTimeout(300);
    await expect(neuronIcon).toHaveClass(/fa-minus-square/);

    // Re-trigger search to get filtered results
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await searchInput.fill('DNp01');
    // Wait for results to settle — they may all be filtered out
    await page.waitForTimeout(3000);

    const excludedCount = await page.locator('li.searchResult').count();
    // Excluding neurons should reduce the result count (likely to zero for DNp01)
    expect(excludedCount).toBeLessThan(unfilteredCount);
  });

  test('Clear Filters resets all filters to neutral', async ({ page }) => {
    await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
    await page.locator('input#searchInput').waitFor({ state: 'visible', timeout: 10_000 });

    // Activate a couple of filters
    await page.locator('div:has(> span:text-is("Neuron")) > i.fa').click();
    await page.waitForTimeout(300);
    await page.locator('div:has(> span:text-is("Anatomy")) > i.fa').click();
    await page.waitForTimeout(300);

    // Verify they are no longer neutral
    await expect(
      page.locator('div:has(> span:text-is("Neuron")) > i.fa')
    ).toHaveClass(/fa-plus-square/);

    // Click Clear Filters
    await page.locator('button:has-text("Clear Filters")').click();
    await page.waitForTimeout(300);

    // Both should be back to fa-square
    const neuronCls = await page.locator('div:has(> span:text-is("Neuron")) > i.fa').getAttribute('class');
    expect(neuronCls).toContain('fa-square');
    expect(neuronCls).not.toContain('plus');
    expect(neuronCls).not.toContain('minus');

    const anatomyCls = await page.locator('div:has(> span:text-is("Anatomy")) > i.fa').getAttribute('class');
    expect(anatomyCls).toContain('fa-square');
    expect(anatomyCls).not.toContain('plus');
    expect(anatomyCls).not.toContain('minus');
  });
});
