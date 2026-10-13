import { test, expect, Page, TestInfo } from './fixtures';
import {
  dismissQuickHelp,
  searchAndSelect,
  LONG_TEST_TIMEOUT,
  VERY_LONG_OP_TIMEOUT,
  SLOW_FACTOR,
  withTimeoutLabel,
} from './helpers';

// The Term Context graph can take several minutes to load after navigation,
// especially on the live site under load.
test.setTimeout(VERY_LONG_OP_TIMEOUT + LONG_TEST_TIMEOUT);

/** Read the force-graph node/link data from the VFBGraph React component. */
async function readGraphData(page: Page) {
  return await page.evaluate(() => {
    const container = document.querySelector('#VFBGraph .force-graph-container');
    if (!container) return null;
    let el: Element | null = container;
    for (let depth = 0; depth < 10 && el; depth++) {
      const key = Object.keys(el).find(
        k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
      );
      if (key) {
        let fiber = (el as any)[key];
        for (let i = 0; i < 30 && fiber; i++) {
          const props = fiber.memoizedProps || fiber.pendingProps;
          if (props?.data?.nodes && props?.data?.links) {
            return {
              nodeCount: props.data.nodes.length,
              linkCount: props.data.links.length,
              titles: props.data.nodes.map((n: any) => n.title),
            };
          }
          fiber = fiber.return;
        }
        break;
      }
      el = el.parentElement;
    }
    return null;
  });
}

/** Wait until the term-context graph has rendered nodes and visible canvas content. */
async function waitForGraphReady(page: Page, testInfo?: TestInfo) {
  await withTimeoutLabel(
    'Term Context graph data + canvas to render',
    async () =>
      await expect(async () => {
        const data = await readGraphData(page);
        expect(data).not.toBeNull();
        expect(data!.nodeCount).toBeGreaterThan(0);
        const hasContent = await page.evaluate(() => {
          const canvas = document.querySelector('#VFBGraph .force-graph-container canvas') as HTMLCanvasElement;
          if (!canvas) return false;
          const ctx = canvas.getContext('2d');
          if (!ctx) return false;
          const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let nonBlack = 0;
          for (let i = 0; i < d.length; i += 16) {
            if (d[i] + d[i + 1] + d[i + 2] > 30) nonBlack++;
          }
          return nonBlack > 50;
        });
        expect(hasContent).toBe(true);
      }).toPass({ timeout: VERY_LONG_OP_TIMEOUT, intervals: [1000, 2000, 5000] }),
    testInfo,
  );
}

/** Check that the graph canvas has visible (non-black) content. */
async function expectGraphHasContent(page: Page) {
  const hasContent = await page.evaluate(() => {
    const canvas = document.querySelector('#VFBGraph .force-graph-container canvas') as HTMLCanvasElement;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlack = 0;
    for (let i = 0; i < data.length; i += 16) {
      if (data[i] + data[i + 1] + data[i + 2] > 30) nonBlack++;
    }
    return nonBlack > 50;
  });
  expect(hasContent).toBe(true);
}

/** Click a graph link in the "Graphs for" section and wait for the Term Context tab to appear. */
async function openGraphView(page: Page, linkText: string, testInfo?: TestInfo) {
  const graphLink = page.locator('.Collapsible', { hasText: 'Graphs for' })
    .locator('a', { hasText: linkText });
  await graphLink.scrollIntoViewIfNeeded();
  await graphLink.click({ force: true });

  // Wait for the Term Context tab to appear
  await withTimeoutLabel(
    'Term Context tab to appear',
    () =>
      expect(
        page.locator('.flexlayout__tab_button_content:text-is("Term Context")'),
      ).toBeVisible({ timeout: 15_000 * SLOW_FACTOR }),
    testInfo,
  );
  // Wait for the graph data and canvas to actually render
  await waitForGraphReady(page, testInfo);
}

test.describe('VFB Term Context — classification graph (FBbt_00004020)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00004020', 'FBbt_00004020', testInfo);
    await openGraphView(page, 'Show classification', testInfo);
  });

  test('Term Context tab appears after clicking "Show classification"', async ({ page }) => {
    await expect(
      page.locator('.flexlayout__tab_button--selected', { hasText: 'Term Context' })
    ).toBeVisible();
  });

  test('graph is rendered on a canvas inside VFBGraph container', async ({ page }) => {
    const container = page.locator('#VFBGraph .force-graph-container');
    await expect(container).toBeVisible();

    const canvas = container.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(50);
    expect(box!.height).toBeGreaterThan(50);
  });

  test('graph canvas has visible content', async ({ page }) => {
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector('#VFBGraph .force-graph-container canvas') as HTMLCanvasElement;
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 16) {
        if (data[i] + data[i + 1] + data[i + 2] > 30) nonBlack++;
      }
      return nonBlack > 50;
    });
    expect(hasContent).toBe(true);
  });

  test('graph has zoom and navigation controls', async ({ page }) => {
    const graphPanel = page.locator('#VFBGraph');
    await expect(graphPanel.locator('i.fa-home')).toBeVisible();
    await expect(graphPanel.locator('i.fa-search-plus')).toBeVisible();
    await expect(graphPanel.locator('i.fa-search-minus')).toBeVisible();
    await expect(graphPanel.locator('i.fa-refresh')).toBeVisible();
  });

  test('classification graph contains nodes with FBbt IDs', async ({ page }) => {
    const graphData = await readGraphData(page);
    expect(graphData).not.toBeNull();
    expect(graphData!.nodeCount).toBeGreaterThan(1);
    expect(graphData!.linkCount).toBeGreaterThan(0);
    expect(graphData!.titles).toContain('FBbt_00004020');
  });
});

test.describe('VFB Term Context — location graph (FBbt_00004020)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00004020', 'FBbt_00004020', testInfo);
  });

  test('"Show location" also opens the Term Context tab', async ({ page }, testInfo) => {
    await openGraphView(page, 'Show location', testInfo);

    await expect(
      page.locator('.flexlayout__tab_button_content:text-is("Term Context")')
    ).toBeVisible();
    await expectGraphHasContent(page);
  });

  test('switching between classification and location reloads the graph', async ({ page }, testInfo) => {
    await openGraphView(page, 'Show classification', testInfo);
    const classData = await readGraphData(page);

    // Switch to location
    await page.locator('.Collapsible', { hasText: 'Graphs for' })
      .locator('a', { hasText: 'Show location' }).scrollIntoViewIfNeeded();
    await page.locator('.Collapsible', { hasText: 'Graphs for' })
      .locator('a', { hasText: 'Show location' }).click({ force: true });
    // Wait for the new graph data to render
    await waitForGraphReady(page, testInfo);

    const locData = await readGraphData(page);

    expect(classData).not.toBeNull();
    expect(locData).not.toBeNull();
    expect(classData!.nodeCount).toBeGreaterThan(0);
    expect(locData!.nodeCount).toBeGreaterThan(0);
  });
});

// ── Location graph for a neuropil subdivision (FBbt_00110000) ───────────────

test.describe('VFB Term Context — location graph (FBbt_00110000 / mushroom body alpha lobe slice)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'FBbt_00110000', 'FBbt_00110000', testInfo);
    await openGraphView(page, 'Show location', testInfo);
  });

  test('location graph renders with visible content', async ({ page }) => {
    await expectGraphHasContent(page);
  });

  test('location graph contains the query term as a node', async ({ page }) => {
    const graphData = await readGraphData(page);
    expect(graphData).not.toBeNull();
    expect(graphData!.titles).toContain('FBbt_00110000');
  });

  test('location graph shows the anatomical hierarchy up to adult brain', async ({ page }) => {
    const graphData = await readGraphData(page);
    expect(graphData).not.toBeNull();
    // adult brain (FBbt_00003624) should be in the graph as the root of the location hierarchy
    expect(graphData!.titles).toContain('FBbt_00003624');
  });

  test('location graph has multiple nodes and links', async ({ page }) => {
    const graphData = await readGraphData(page);
    expect(graphData).not.toBeNull();
    // The path from alpha lobe slice to adult brain passes through several structures
    expect(graphData!.nodeCount).toBeGreaterThan(5);
    expect(graphData!.linkCount).toBeGreaterThan(5);
  });

  test('location graph has zoom and navigation controls', async ({ page }) => {
    const graphPanel = page.locator('#VFBGraph');
    await expect(graphPanel.locator('i.fa-home')).toBeVisible();
    await expect(graphPanel.locator('i.fa-search-plus')).toBeVisible();
    await expect(graphPanel.locator('i.fa-search-minus')).toBeVisible();
    await expect(graphPanel.locator('i.fa-refresh')).toBeVisible();
  });
});
