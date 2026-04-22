import { test, expect, Page } from '@playwright/test';

const VFB_ID = 'VFB_jrchk7yg';
const NEURON_NAME = 'WEDPN2A_R (FlyEM-HB:885788485)';

/** Search for and select VFB_jrchk7yg, then wait for the viewer to load. */
async function selectNeuron(page: Page) {
  await page.locator('i.fa-search.arrowsStyle[title="Search"]').click();
  const searchInput = page.locator('input#searchInput');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(VFB_ID);
  await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('li.searchResult').first().click();
  await page.locator('#NewStackViewerdisplayArea canvas').waitFor({ state: 'visible', timeout: 30_000 });
}

/** Compute a rough hash of the slice viewer canvas pixel data to detect visual changes. */
async function sliceCanvasHash(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const canvas = document.querySelector('#NewStackViewerdisplayArea canvas') as HTMLCanvasElement;
    if (!canvas) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 400) sum += data[i];
    return sum;
  });
}

test.describe('VFB Slice Viewer (WEDPN2A_R — VFB_jrchk7yg)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await selectNeuron(page);
  });

  test('slice viewer canvas is visible after selecting a neuron', async ({ page }) => {
    const canvas = page.locator('#NewStackViewerdisplayArea canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });

  test('slice viewer has navigation controls', async ({ page }) => {
    await expect(page.locator('button[title="Center Stack"]')).toBeVisible();
    await expect(page.locator('button[title="Zoom In"]')).toBeVisible();
    await expect(page.locator('button[title="Zoom Out"]')).toBeVisible();
    await expect(page.locator('button[title="Step Into Stack"]')).toBeVisible();
    await expect(page.locator('button[title="Step Out Of Stack"]')).toBeVisible();
    await expect(page.locator('button[title="Change Slice Plane Through Stack"]')).toBeVisible();
    await expect(page.locator('button[title="Toggle the 3D slice display"]')).toBeVisible();
  });

  test('stepping through the stack changes the displayed slice', async ({ page }) => {
    await page.waitForTimeout(2000);
    const before = await sliceCanvasHash(page);
    expect(before).toBeGreaterThan(0);

    // Step into the stack several times
    const stepIn = page.locator('button[title="Step Into Stack"]');
    await stepIn.click();
    await page.waitForTimeout(500);
    await stepIn.click();
    await page.waitForTimeout(500);
    await stepIn.click();
    await page.waitForTimeout(1000);

    const after = await sliceCanvasHash(page);
    expect(after).not.toBe(before);
  });

  test('zooming changes the slice view', async ({ page }) => {
    await page.waitForTimeout(2000);
    const before = await sliceCanvasHash(page);
    expect(before).toBeGreaterThan(0);

    await page.locator('button[title="Zoom In"]').click();
    await page.waitForTimeout(500);
    await page.locator('button[title="Zoom In"]').click();
    await page.waitForTimeout(1000);

    const after = await sliceCanvasHash(page);
    expect(after).not.toBe(before);
  });

  test('changing slice plane changes the view', async ({ page }) => {
    await page.waitForTimeout(2000);
    const before = await sliceCanvasHash(page);
    expect(before).toBeGreaterThan(0);

    await page.locator('button[title="Change Slice Plane Through Stack"]').click();
    await page.waitForTimeout(2000);

    const after = await sliceCanvasHash(page);
    expect(after).not.toBe(before);
  });
});

test.describe('VFB 3D Viewer (WEDPN2A_R — VFB_jrchk7yg)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await selectNeuron(page);
  });

  test('3D viewer panel is visible with a canvas', async ({ page }) => {
    // The 3D Viewer tab should be visible
    await expect(
      page.locator('.flexlayout__tab_button_content:text-is("3D Viewer")')
    ).toBeVisible();

    // The 3D viewer has rotation/camera controls that the slice viewer doesn't
    // Look for the 3D viewer's canvas in its panel
    const panel3d = page.locator('.flexlayout__tab', {
      has: page.locator('button.fa-undo, button.fa-repeat, button.fa-video-camera'),
    });

    // If the panel is behind the slice viewer tab, we might need to look at all canvases
    // At minimum, there should be multiple canvases (slice + 3D)
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(2);
  });

  test('3D viewer has pan, rotate, zoom, and camera controls', async ({ page }) => {
    // Pan controls
    await expect(page.locator('button.pan-left')).toBeVisible();
    await expect(page.locator('button.pan-right')).toBeVisible();
    await expect(page.locator('button.pan-top')).toBeVisible();
    await expect(page.locator('button.pan-bottom')).toBeVisible();
    await expect(page.locator('button.pan-home')).toBeVisible();

    // Rotate controls
    await expect(page.locator('button.rotate-left')).toBeVisible();
    await expect(page.locator('button.rotate-right')).toBeVisible();
    await expect(page.locator('button.rotate-home')).toBeVisible();

    // Zoom
    await expect(page.locator('button.zoom-in')).toBeVisible();
    await expect(page.locator('button.zoom-out')).toBeVisible();

    // Wireframe toggle
    await expect(page.locator('button.wireframe')).toBeVisible();
  });

  test('3D viewer rotate controls are clickable', async ({ page }) => {
    // Rotate left — button should be clickable without errors
    const rotateLeft = page.locator('button.rotate-left');
    await rotateLeft.click();
    await page.waitForTimeout(500);
    await rotateLeft.click();
    await page.waitForTimeout(500);

    // Camera reset — should return to default view
    await page.locator('button.rotate-home').click();
    await page.waitForTimeout(500);

    // No errors should have occurred (page still functional)
    await expect(page.locator('button.rotate-left')).toBeVisible();
  });

  test('3D viewer zoom controls are clickable', async ({ page }) => {
    await page.locator('button.zoom-in').click();
    await page.waitForTimeout(500);
    await page.locator('button.zoom-in').click();
    await page.waitForTimeout(500);

    // Zoom out to restore
    await page.locator('button.zoom-out').click();
    await page.waitForTimeout(500);
    await page.locator('button.zoom-out').click();
    await page.waitForTimeout(500);

    // Still functional
    await expect(page.locator('button.zoom-in')).toBeVisible();
  });

  test('3D viewer wireframe toggle is clickable', async ({ page }) => {
    const wireframeBtn = page.locator('button.wireframe');

    // Click to toggle wireframe on
    await wireframeBtn.click();
    await page.waitForTimeout(500);

    // Click again to toggle off
    await wireframeBtn.click();
    await page.waitForTimeout(500);

    await expect(wireframeBtn).toBeVisible();
  });
});

test.describe('VFB Layers Panel (WEDPN2A_R — VFB_jrchk7yg)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await selectNeuron(page);
  });

  test('layers table has expected columns', async ({ page }) => {
    const headers = page.locator('.griddle-table th');
    await expect(headers.nth(0)).toContainText('Controls');
    await expect(headers.nth(1)).toContainText('Name');
    await expect(headers.nth(2)).toContainText('Type');
    await expect(headers.nth(3)).toContainText('Thumbnail');
  });

  test('layers include the template (JRC2018Unisex)', async ({ page }) => {
    await expect(
      page.locator('.griddle-table td', { hasText: 'JRC2018Unisex' })
    ).toBeVisible();
  });

  test('layers include the selected neuron', async ({ page }) => {
    await expect(
      page.locator('.griddle-table td', { hasText: NEURON_NAME })
    ).toBeVisible();
  });

  test('neuron layer shows type classification', async ({ page }) => {
    // The row containing the neuron should also show its type
    const neuronRow = page.locator('.griddle-table tbody tr', { hasText: NEURON_NAME });
    await expect(neuronRow).toBeVisible();
    await expect(neuronRow).toContainText('wedge projection neuron');
  });

  test('layer controls expand and collapse', async ({ page }) => {
    const neuronRow = page.locator('.griddle-table tbody tr', { hasText: NEURON_NAME });
    const controlBtn = neuronRow.locator('#LayersControls_Menu button.MuiButton-root');

    // Initially the expand icon should be angle-down
    await expect(neuronRow.locator('i.fa-angle-down')).toBeVisible();

    // Click to expand
    await controlBtn.click();
    await page.waitForTimeout(500);

    // After expanding, icon should change to angle-up
    await expect(neuronRow.locator('i.fa-angle-up')).toBeVisible();

    // Click again to collapse
    await controlBtn.click();
    await page.waitForTimeout(500);

    // Should be back to angle-down
    await expect(neuronRow.locator('i.fa-angle-down')).toBeVisible();
  });

  test('neuron layer has a color indicator', async ({ page }) => {
    const neuronRow = page.locator('.griddle-table tbody tr', { hasText: NEURON_NAME });

    // The row should contain a span with a color style
    const colorSpan = await neuronRow.evaluate(row => {
      const spans = row.querySelectorAll('span');
      for (const span of Array.from(spans)) {
        const style = span.getAttribute('style');
        if (style?.includes('color: rgb')) return style;
      }
      return null;
    });
    expect(colorSpan).not.toBeNull();
    expect(colorSpan).toMatch(/color: rgb\(\d+, \d+, \d+\)/);
  });

  test('expanding a layer reveals a color picker button', async ({ page }) => {
    const neuronRow = page.locator('.griddle-table tbody tr', { hasText: NEURON_NAME });

    // Expand the row
    await neuronRow.locator('#LayersControls_Menu button.MuiButton-root').click();
    await page.waitForTimeout(500);

    // A color picker button (fa-tint) should appear
    const colorPickerBtn = page.locator('button.color-picker-button');
    await expect(colorPickerBtn).toBeVisible({ timeout: 5_000 });
  });

  test('clicking color picker button opens a chrome color picker', async ({ page }) => {
    const neuronRow = page.locator('.griddle-table tbody tr', { hasText: NEURON_NAME });

    // Expand the row
    await neuronRow.locator('#LayersControls_Menu button.MuiButton-root').click();
    await page.waitForTimeout(500);

    // Click the color picker button
    await page.locator('button.color-picker-button').click();
    await page.waitForTimeout(500);

    // The chrome-picker should appear with a hex input
    const chromePicker = page.locator('.chrome-picker');
    await expect(chromePicker).toBeVisible({ timeout: 5_000 });

    // Hex input should show the current color
    const hexInput = chromePicker.locator('input').first();
    const hexValue = await hexInput.inputValue();
    expect(hexValue).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('template layer has visibility toggle', async ({ page }) => {
    const templateRow = page.locator('.griddle-table tbody tr', { hasText: 'JRC2018Unisex' });
    await expect(templateRow).toBeVisible();
    const eyeIcon = templateRow.locator('i.fa-eye, i.fa-eye-slash');
    await expect(eyeIcon).toBeVisible();
  });

  test('layers filter input is visible', async ({ page }) => {
    const filterInput = page.locator('input.griddle-filter');
    await expect(filterInput).toBeVisible();
    expect(await filterInput.getAttribute('placeholder')).toBe('Filter');
  });
});
