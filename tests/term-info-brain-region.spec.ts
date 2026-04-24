import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — brain region (FBbt_00045051)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00045051', 'FBbt_00045051');
  });

  test('shows name with semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'cantle', 'FBbt_00045051');
    await expectNameTags(page, 'Synaptic_neuropil_domain', 'Nervous_system', 'Adult');
  });

  test('shows alternative names with synonyms', async ({ page }) => {
    await expectSection(page, 'Alternative Names', 'CAN', 'PONPp');
  });

  test('shows classification as synaptic neuropil domain', async ({ page }) => {
    await expectSection(page, 'Classification', 'synaptic neuropil domain');
  });

  test('shows available images with navigation', async ({ page }) => {
    const images = page.locator('.Collapsible', { hasText: 'Available Images' })
      .locator('.Collapsible__contentInner').first();
    await expect(images).toBeVisible();
    await expect(images.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows relationships with parent structures', async ({ page }) => {
    await expectSection(page, 'Relationships', 'deutocerebrum');
  });

  test('shows query options for neurons innervating region', async ({ page }) => {
    await expectSection(page, 'Query for', 'Neurons with', 'presynaptic terminals', 'postsynaptic terminals');
  });

  test('shows description', async ({ page }) => {
    await expectSection(page, 'Description', 'synaptic neuropil domain', 'saddle');
  });

  test('shows cross references', async ({ page }) => {
    await expectSection(page, 'Cross References', 'Insect Brain DB');
  });

  test('shows references with citations', async ({ page }) => {
    const refsTrigger = page.locator('.Collapsible__trigger:text-is("References")');
    await expect(refsTrigger).toBeVisible();
    const refsContent = refsTrigger.locator('~ .Collapsible__contentOuter .Collapsible__contentInner');
    await expect(refsContent).toContainText('Ito et al.');
    await expect(refsContent).toContainText('Chiang et al.');
  });
});
