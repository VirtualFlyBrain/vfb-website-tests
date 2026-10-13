import { test, expect } from './fixtures';
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

  // VFB_00063821 is an *Individual* expression-pattern image (SuperTypes include
  // Individual, Expression_pattern, Split). VFBquery's instance-inheritance block
  // (vfb_queries.py ~L1376-1451) propagates its parent expression-pattern class's
  // queries onto it — running vfbquery.get_term_info('VFB_00063821') on the current
  // library yields 7 inherited queries, incl. AnatomyExpressedIn ("Anatomy where …
  // is expressed") and epFrag ("Images of fragments of …"). If this test fails on
  // the live site, the deployed VFBquery/cached term_info predates that inheritance
  // and is dropping the queries — a real regression, not a test bug.
  test('shows anatomy and image query options', async ({ page }) => {
    const queryFor = page.locator('.Collapsible', { hasText: 'Query for' })
      .locator('.Collapsible__contentInner').first();
    await expect(queryFor).toContainText('Anatomy');
    await expect(queryFor).toContainText('is expressed');
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
    // "Aligned to" now lists templates by short name (e.g. "JRC2018U, JFRC2").
    await expectSection(page, 'Aligned to', 'JRC2018U');
  });
});
