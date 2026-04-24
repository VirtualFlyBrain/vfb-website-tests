import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — Split-GAL4 image (VFB_00063821)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'VFB_00063821', 'VFB_00063821');
  });

  test('shows name with Split-GAL4 identifier and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'JRC_MB099C', 'VFB_00063821');
    await expectNameTags(page, 'Split');
  });

  test('shows classification with expression pattern', async ({ page }) => {
    await expectSection(page, 'Classification', 'expression pattern');
  });

  test('shows anatomy and image query options', async ({ page }) => {
    const queryFor = page.locator('.Collapsible', { hasText: 'Query for' })
      .locator('.Collapsible__contentInner').first();
    await expect(queryFor).toContainText('Anatomy');
    await expect(queryFor).toContainText('is expressed in');
    await expect(queryFor).toContainText('Images of fragments');
  });

  test('shows FlyLight and NeuronBridge cross references', async ({ page }) => {
    const crossRefs = page.locator('.Collapsible', { hasText: 'Cross References' })
      .locator('.Collapsible__contentInner').first();

    await expect(crossRefs.locator('a[href*="splitgal4.janelia.org"]').first()).toBeVisible();
    await expect(crossRefs.locator('img[src*="fly_light"]')).toBeVisible();

    await expect(crossRefs.locator('a[href*="neuronbridge.janelia.org"]').first()).toBeVisible();
    await expect(crossRefs.locator('img[src*="neuronbridge"]')).toBeVisible();
  });

  test('shows downloads', async ({ page }) => {
    await expectSection(page, 'Downloads', 'OBJ');
  });

  test('shows alignment template', async ({ page }) => {
    await expectSection(page, 'Aligned to', 'JRC2018Unisex');
  });
});
