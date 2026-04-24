import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — individual neuron (VFB_jrchk7yg)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'VFB_jrchk7yg', 'VFB_jrchk7yg');
  });

  test('shows symbol', async ({ page }) => {
    await expect(page.locator('.Collapsible__contentInner').first()).toContainText('WEDPN2A_R');
  });

  test('shows name with VFB and FlyEM IDs and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'WEDPN2A_R (FlyEM-HB:885788485)', 'VFB_jrchk7yg');
    await expectNameTags(page, 'secondary_neuron', 'GABAergic', 'Cholinergic', 'Adult');
  });

  test('shows classification with parent class', async ({ page }) => {
    await expectSection(page, 'Classification', 'wedge projection neuron');
  });

  test('shows thumbnail with navigation', async ({ page }) => {
    const thumbnail = page.locator('.Collapsible', { hasText: 'Thumbnail' })
      .locator('.Collapsible__contentInner');
    await expect(thumbnail).toBeVisible();
    await expect(thumbnail.locator('button', { hasText: 'Previous' })).toBeVisible();
    await expect(thumbnail.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows neurotransmitter prediction with confidence and publication link', async ({ page }) => {
    const relationships = page.locator('.Collapsible', { hasText: 'Relationships' })
      .locator('.Collapsible__contentInner').first();

    await expect(relationships).toContainText('gamma-aminobutyric acid');

    const confidenceBadge = relationships.locator('span.badge');
    await expect(confidenceBadge).toBeVisible();
    const badgeText = await confidenceBadge.textContent();
    expect(badgeText).toMatch(/\d+%/);

    await expect(relationships.locator('a[title="confidence value"]')).toBeVisible();

    const pubLink = relationships.locator('a[title*="FBrf"]');
    await expect(pubLink).toBeVisible();
    await expect(pubLink.locator('i.gpt-fly')).toBeVisible();
  });

  test('shows anatomical relationships', async ({ page }) => {
    const relationships = page.locator('.Collapsible', { hasText: 'Relationships' })
      .locator('.Collapsible__contentInner').first();
    await expect(relationships).toContainText('soma location');
    await expect(relationships).toContainText('is part of');
    await expect(relationships).toContainText('adult brain');
  });

  test('shows query options including NBLAST similarity', async ({ page }) => {
    await expectSection(page, 'Query for', 'NBLAST', 'similar morphology');
  });

  test('shows graphs section', async ({ page }) => {
    await expectSection(page, 'Graphs for', 'Show location', 'Show classification');
  });

  test('shows circuit browser link', async ({ page }) => {
    await expectSection(page, 'Add Neuron to Circuit Browser', 'Circuit Browser Query');
  });

  test('shows cross references', async ({ page }) => {
    await expectSection(page, 'Cross References', 'Neuprint', 'neuronbridge');
  });

  test('shows downloads with mesh, skeleton, slices, and signal files', async ({ page }) => {
    await expectSection(page, 'Downloads', 'OBJ', 'SWC', 'Woolz', 'NRRD');
  });

  test('shows alignment template', async ({ page }) => {
    await expectSection(page, 'Aligned to', 'JRC2018Unisex');
  });

  test('shows license', async ({ page }) => {
    await expectSection(page, 'License', 'CC-BY');
  });

  test('focus bar shows queries for the neuron', async ({ page }) => {
    await expect(
      page.locator('.focusTermDivR button.MuiButton-root').first()
    ).toContainText('WEDPN2A_R');
  });
});
