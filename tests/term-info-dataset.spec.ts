import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — dataset (Berg2025)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'Berg2025', 'Berg2025');
  });

  test('shows symbol', async ({ page }) => {
    await expectSection(page, 'Symbol', 'male-cns');
  });

  test('shows name with dataset description and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'Male CNS', 'Berg2025');
    await expectNameTags(page, 'DataSet');
  });

  test('shows available images with navigation', async ({ page }) => {
    const images = page.locator('.Collapsible', { hasText: 'Available Images' })
      .locator('.Collapsible__contentInner');
    await expect(images).toBeVisible();
    await expect(images.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows query to list images', async ({ page }) => {
    await expectSection(page, 'Query for', 'List all images');
  });

  test('shows description', async ({ page }) => {
    await expectSection(page, 'Description', 'male-cns', 'Berg');
  });

  test('shows references with DOI link and pub tag', async ({ page }) => {
    const refs = page.locator('.Collapsible', { hasText: 'References' })
      .locator('.Collapsible__contentInner').first();
    await expect(refs).toContainText('Berg');
    await expect(refs).toContainText('2025');

    const doiLink = refs.locator('a[href*="doi.org"]');
    await expect(doiLink).toBeVisible();
    await expect(doiLink.locator('i.gpt-doi')).toBeVisible();

    await expect(refs.locator('span.label-pub')).toBeVisible();
  });

  test('shows license', async ({ page }) => {
    await expectSection(page, 'License', 'CC-BY');
  });
});
