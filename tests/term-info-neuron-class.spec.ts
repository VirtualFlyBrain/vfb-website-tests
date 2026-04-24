import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — neuron class (FBbt_00100163)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00100163', 'FBbt_00100163');
  });

  test('shows name as adult pacemaker neuron with semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'adult pacemaker neuron', 'FBbt_00100163');
    await expectNameTags(page, 'Neuron', 'Nervous_system', 'Adult');
  });

  test('shows alternative names', async ({ page }) => {
    await expectSection(page, 'Alternative Names', 'clock neuron');
  });

  test('shows classification', async ({ page }) => {
    await expectSection(page, 'Classification', 'pacemaker neuron');
  });

  test('shows available images with navigation', async ({ page }) => {
    const images = page.locator('.Collapsible', { hasText: 'Available Images' })
      .locator('.Collapsible__contentInner').first();
    await expect(images).toBeVisible();
    await expect(images.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows query options for neuron class', async ({ page }) => {
    const queryFor = page.locator('.Collapsible', { hasText: 'Query for' })
      .locator('.Collapsible__contentInner').first();
    await expect(queryFor).toContainText('transgene expression');
    await expect(queryFor).toContainText('Subclasses');
    await expect(queryFor).toContainText('available images');
    await expect(queryFor).toContainText('transcriptomics');
    await expect(queryFor).toContainText('downstream connectivity');
    await expect(queryFor).toContainText('upstream connectivity');
  });

  test('shows graphs section', async ({ page }) => {
    await expectSection(page, 'Graphs for', 'Show location', 'Show classification');
  });
});
