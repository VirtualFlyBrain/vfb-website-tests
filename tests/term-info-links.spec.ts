import { test, expect } from '@playwright/test';
import { dismissQuickHelp, searchAndSelect, clickQueryAndExpectResults, LONG_TEST_TIMEOUT } from './helpers';

// ── Classification link navigates to parent class ───────────────────────────

test.describe('VFB Term Info Links — classification (FBbt_00045051)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00045051', 'FBbt_00045051');
  });

  test('clicking a classification link navigates to that class', async ({ page }) => {
    // Click "synaptic neuropil domain" in Classification
    const classLink = page.locator('.Collapsible', { hasText: 'Classification' })
      .locator('.Collapsible__contentInner').first()
      .locator('a', { hasText: 'synaptic neuropil domain' });
    await classLink.click();

    // Term Info should update to show the parent class
    await expect(
      page.locator('.Collapsible', { hasText: 'Name' }).locator('.Collapsible__contentInner').first()
    ).toContainText('FBbt_00040007', { timeout: 15_000 });
  });
});

// ── Available image loads into the viewer ───────────────────────────────────

test.describe('VFB Term Info Links — available images (FBbt_00045051)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00045051', 'FBbt_00045051');
  });

  test('clicking an available image loads it into the layers panel', async ({ page }) => {
    // Click the first available image thumbnail
    const imgLink = page.locator('.Collapsible', { hasText: 'Available Images' })
      .locator('.Collapsible__contentInner').first()
      .locator('a').first();
    await imgLink.click();

    // The image should appear in the Layers table (name includes "CAN on")
    await expect(
      page.locator('.griddle-table td', { hasText: 'CAN on' })
    ).toBeVisible({ timeout: 30_000 });
  });
});

// ── References link resolves (Berg2025) ─────────────────────────────────────

test.describe('VFB Term Info Links — references (Berg2025)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'Berg2025', 'Berg2025');
  });

  test('clicking a publication citation navigates to the pub record', async ({ page }) => {
    const refs = page.locator('.Collapsible', { hasText: 'References' })
      .locator('.Collapsible__contentInner').first();
    const pubLink = refs.locator('a', { hasText: 'Berg et al.' });
    await pubLink.click();

    // Term Info should update to show the publication record
    await expect(
      page.locator('.Collapsible', { hasText: 'Name' }).locator('.Collapsible__contentInner').first()
    ).toContainText('Berg', { timeout: 15_000 });
  });

  test('DOI link points to a valid doi.org URL', async ({ page }) => {
    const refs = page.locator('.Collapsible', { hasText: 'References' })
      .locator('.Collapsible__contentInner').first();
    const doiLink = refs.locator('a[href*="doi.org"]');
    const href = await doiLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/doi\.org\/10\.\d+\//);
  });
});

// ── Cross references have valid external URLs (VFB_00063821) ────────────────

test.describe('VFB Term Info Links — cross references (VFB_00063821)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'VFB_00063821', 'VFB_00063821');
  });

  test('FlyLight cross reference links to splitgal4.janelia.org', async ({ page }) => {
    const crossRefs = page.locator('.Collapsible', { hasText: 'Cross References' })
      .locator('.Collapsible__contentInner').first();
    const flyLightLink = crossRefs.locator('a[href*="splitgal4.janelia.org"]').first();
    const href = await flyLightLink.getAttribute('href');
    expect(href).toContain('MB099C');
  });

  test('NeuronBridge cross reference links to neuronbridge.janelia.org', async ({ page }) => {
    const crossRefs = page.locator('.Collapsible', { hasText: 'Cross References' })
      .locator('.Collapsible__contentInner').first();
    const nbLink = crossRefs.locator('a[href*="neuronbridge.janelia.org"]').first();
    const href = await nbLink.getAttribute('href');
    expect(href).toContain('MB099C');
  });
});

// ── Query link returns results (FBbt_00045051) ──────────────────────────────

test.describe('VFB Term Info Links — queries (FBbt_00045051)', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00045051', 'FBbt_00045051');
  });

  test('"List all available images" query returns results', async ({ page }) => {
    await clickQueryAndExpectResults(page, 'List all available images of cantle');
  });
});

// ── Neuron queries and cross references (VFB_jrchk7yg) ─────────────────────

test.describe('VFB Term Info Links — neuron queries and cross references (VFB_jrchk7yg)', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'VFB_jrchk7yg', 'VFB_jrchk7yg');
  });

  test('Neuprint cross reference links to neuprint.janelia.org', async ({ page }) => {
    const crossRefs = page.locator('.Collapsible', { hasText: 'Cross References' })
      .locator('.Collapsible__contentInner').first();
    const neuprintLink = crossRefs.locator('a[href*="neuprint"]').first();
    const href = await neuprintLink.getAttribute('href');
    expect(href).toMatch(/neuprint/);
    expect(href).toContain('885788485');
  });

  test('NeuronBridge cross reference links to neuronbridge.janelia.org', async ({ page }) => {
    const crossRefs = page.locator('.Collapsible', { hasText: 'Cross References' })
      .locator('.Collapsible__contentInner').first();
    const nbLink = crossRefs.locator('a[href*="neuronbridge"]').first();
    const href = await nbLink.getAttribute('href');
    expect(href).toContain('885788485');
  });

  test('"Neurons with similar morphology" query returns results', async ({ page }) => {
    await clickQueryAndExpectResults(page, 'Neurons with similar morphology');
  });

  test('"Neurons connected to" query returns results', async ({ page }) => {
    await clickQueryAndExpectResults(page, 'Neurons connected to');
  });
});

// ── Neuron class queries (FBbt_00100163) ────────────────────────────────────

test.describe('VFB Term Info Links — neuron class queries (FBbt_00100163)', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00100163', 'FBbt_00100163');
  });

  test('"scRNAseq data for" query returns results', async ({ page }) => {
    await clickQueryAndExpectResults(page, 'scRNAseq data for');
  });
});
