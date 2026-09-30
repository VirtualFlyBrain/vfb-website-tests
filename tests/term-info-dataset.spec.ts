import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — dataset (Berg2025)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    // Search result for 'Berg2025' also returns Berg2025aroi (Male CNS neuropil ROIs),
    // which can rank first — pick the connectome neurons dataset explicitly.
    await searchAndSelect(page, 'Berg2025', 'Berg2025a', undefined, '(Berg2025a)');
  });

  test('shows name with dataset description and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'Male CNS', 'Berg2025');
    await expectNameTags(page, 'DataSet');
  });

  test('shows available images with navigation', async ({ page }) => {
    // Scope to the first matching Collapsible: the "Query for" section now also
    // contains the text "available images" (via the "List all available images
    // of male-cns" query link), which otherwise makes this locator ambiguous.
    const images = page.locator('.Collapsible', { hasText: 'Available Images' })
      .first()
      .locator('.Collapsible__contentInner');
    await expect(images).toBeVisible();
    await expect(images.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows query to list images', async ({ page }) => {
    await expectSection(page, 'Query for', 'Images in dataset');
  });

  test('shows description', async ({ page }) => {
    await expectSection(page, 'Description', 'male-cns', 'Berg');
  });

  test('shows references with DOI link', async ({ page }) => {
    const refs = page.locator('.Collapsible', { hasText: 'References' })
      .locator('.Collapsible__contentInner').first();
    await expect(refs).toContainText('Berg');
    await expect(refs).toContainText('2025');

    const doiLink = refs.locator('a[href*="doi.org"]');
    await expect(doiLink).toBeVisible();
    await expect(doiLink.locator('i.gpt-doi')).toBeVisible();

    // The publication badge (span.label-pub) is intentionally no longer shown on
    // the dataset page, so we don't assert it here.
  });

  test('shows license', async ({ page }) => {
    await expectSection(page, 'License', 'CC-BY');
  });
});
