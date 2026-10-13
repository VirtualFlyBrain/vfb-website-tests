import { test, expect } from './fixtures';
import { dismissQuickHelp, LONG_TEST_TIMEOUT, VERY_LONG_OP_TIMEOUT, withTimeoutLabel } from './helpers';

// The ROI tree takes a long time to load (~50s on production, longer on v2-dev)
// The ROI tree is the slowest single operation in the suite — give the test
// extra budget on top of the tree-load wait itself.
test.setTimeout(VERY_LONG_OP_TIMEOUT + LONG_TEST_TIMEOUT);

test.describe('VFB Template ROI Browser', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);

    // Switch to the Template ROI Browser tab
    await page.locator('.flexlayout__tab_button_content:text-is("Template ROI Browser")').click();

    // Wait for the ROI hierarchy tree to load (uses react-sortable-tree)
    await withTimeoutLabel(
      'ROI hierarchy tree to load (.rst__tree)',
      () => page.locator('.rst__tree').waitFor({ state: 'visible', timeout: VERY_LONG_OP_TIMEOUT }),
      testInfo,
    );
  });

  test('ROI tree loads with "adult brain" as the root node', async ({ page }) => {
    const rootTitle = page.locator('.rst__rowTitle').first();
    await expect(rootTitle).toContainText('adult brain');

    const rootSubtitle = page.locator('.rst__rowSubtitle').first();
    await expect(rootSubtitle).toContainText('FBbt_00003624');
  });

  test('root node has an expand button', async ({ page }) => {
    await expect(page.locator('.rst__expandButton').first()).toBeVisible();
  });

  test('expanding "adult brain" reveals child brain regions', async ({ page }) => {
    // Expand the root node
    await page.locator('.rst__expandButton').first().click();
    await page.waitForTimeout(2000);

    // Should now show multiple child nodes
    const nodeCount = await page.locator('.rst__node').count();
    expect(nodeCount).toBeGreaterThan(1);

    // Children should include known major subdivisions
    const titles = await page.locator('.rst__rowTitle').allTextContents();
    expect(titles.some(t => t.includes('central brain'))).toBe(true);
  });

  test('child nodes have expand buttons for deeper navigation', async ({ page }) => {
    await page.locator('.rst__expandButton').first().click();
    await page.waitForTimeout(2000);

    // At least some children should be expandable
    const expandButtons = page.locator('.rst__expandButton');
    expect(await expandButtons.count()).toBeGreaterThan(0);
  });

  test('clicking a tree node updates Term Info', async ({ page }) => {
    // Expand root
    await page.locator('.rst__expandButton').first().click();
    await page.waitForTimeout(2000);

    // Click the second node (first child)
    const childTitle = page.locator('.rst__rowTitle').nth(1);
    const childName = await childTitle.textContent();
    await childTitle.click();
    await page.waitForTimeout(3000);

    // Term Info should update to show the selected region
    const nameSection = page.locator('.Collapsible', { hasText: 'Name' })
      .locator('.Collapsible__contentInner').first();
    await expect(nameSection).toContainText(childName!);
  });

  test('each tree node shows an FBbt ID as subtitle', async ({ page }) => {
    await page.locator('.rst__expandButton').first().click();
    await page.waitForTimeout(2000);

    const subtitles = await page.locator('.rst__rowSubtitle').allTextContents();
    expect(subtitles.length).toBeGreaterThan(1);
    for (const sub of subtitles) {
      expect(sub).toMatch(/FBbt_\d+/);
    }
  });

  test('slice viewer shows painted brain regions when ROI browser is active', async ({ page }) => {
    const hasColour = await page.evaluate(() => {
      const canvas = document.querySelector('#NewStackViewerdisplayArea canvas') as HTMLCanvasElement;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let colourCount = 0;
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r + g + b > 50) colourCount++;
      }
      return colourCount > 100;
    });
    expect(hasColour).toBe(true);
  });
});

test.describe('VFB Template ROI Browser — deep navigation (SLP)', () => {
  // The ROI tree is the slowest single operation in the suite — give the test
// extra budget on top of the tree-load wait itself.
test.setTimeout(VERY_LONG_OP_TIMEOUT + LONG_TEST_TIMEOUT);

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);

    await page.locator('.flexlayout__tab_button_content:text-is("Template ROI Browser")').click();
    await withTimeoutLabel(
      'ROI hierarchy tree to load (.rst__tree)',
      () => page.locator('.rst__tree').waitFor({ state: 'visible', timeout: VERY_LONG_OP_TIMEOUT }),
      testInfo,
    );

    // Navigate to: adult brain > adult cerebral ganglion > adult cerebrum > superior neuropils
    const expandPath = ['adult brain', 'adult cerebral ganglion', 'adult cerebrum', 'superior neuropils'];
    for (const nodeName of expandPath) {
      const expandBtn = page.locator('.rst__node', { hasText: nodeName })
        .locator('.rst__expandButton').first();
      if (await expandBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expandBtn.click();
        await page.waitForTimeout(1500);
      }
    }
  });

  test('navigating to SLP reveals it in the tree', async ({ page }) => {
    await expect(
      page.locator('.rst__rowTitle', { hasText: 'superior lateral protocerebrum' })
    ).toBeVisible();
    await expect(
      page.locator('.rst__rowSubtitle', { hasText: 'FBbt_00007054' })
    ).toBeVisible();
  });

  test('clicking a leaf node selects it and highlights the region', async ({ page }) => {
    const slpTitle = page.locator('.rst__rowTitle', { hasText: 'superior lateral protocerebrum' });
    await slpTitle.scrollIntoViewIfNeeded();
    await slpTitle.click();
    await page.waitForTimeout(3000);

    // Term Info should update to show SLP
    const nameSection = page.locator('.Collapsible', { hasText: 'Name' })
      .locator('.Collapsible__contentInner').first();
    await expect(nameSection).toContainText('superior lateral protocerebrum');
    await expect(nameSection).toContainText('FBbt_00007054');
  });

  test('hovering over a node shows an anatomical definition tooltip', async ({ page }) => {
    const slpTitle = page.locator('.rst__node', { hasText: 'superior lateral protocerebrum' })
      .locator('.rst__rowTitle');
    await slpTitle.hover();

    // MUI tooltip should appear with the anatomical description
    const tooltip = page.locator('.MuiTooltip-tooltip');
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
    await expect(tooltip).toContainText('neuropil');
  });
});
