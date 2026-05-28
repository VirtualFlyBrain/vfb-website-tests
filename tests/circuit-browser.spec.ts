import { test, expect, Page } from '@playwright/test';
import { LONG_TEST_TIMEOUT, LONG_OP_TIMEOUT, SLOW_FACTOR, withTimeoutLabel } from './helpers';

// Circuit browser tests interact with a Neo4j backend that can be slow;
// limit parallelism to avoid overwhelming the site
test.describe.configure({ mode: 'serial' });

const MBON21 = {
  searchTerm: 'MBON21',
  optionText: 'VFB_jrchk0f9',
  fullName: 'MBON21(y4y5)(PVL06)_L (FlyEM-HB:985813153)',
};

const MB_C1_R = {
  searchTerm: 'MB-C1_R',
  optionText: '5813021291',
  fullName: 'MB-C1_R (MB-C1_R (FlyEM-HB:5813021291))',
};

const LHCENT3_R = {
  searchTerm: 'LHCENT3',
  optionText: 'LHCENT3_R',
};

/** Navigate to the Circuit Browser tab and wait for it to load. */
async function openCircuitBrowser(page: Page, testInfo?: import('@playwright/test').TestInfo) {
  await page.locator('text=Circuit Browser').first().click();
  await withTimeoutLabel(
    'Circuit Browser panel to load (.neuron1 input)',
    () => page.locator('.neuron1 input').waitFor({ state: 'visible', timeout: LONG_OP_TIMEOUT }),
    testInfo,
  );
}

/** Run the MBON21 → LHCENT3_R connectivity query and wait for results. */
async function runMBON21toLHCENT3Query(page: Page, testInfo?: import('@playwright/test').TestInfo) {
  await openCircuitBrowser(page, testInfo);

  await selectNeuron(page, '.neuron1 input', MBON21.searchTerm, MBON21.optionText);
  await selectNeuron(page, '.neuron2 input', LHCENT3_R.searchTerm, LHCENT3_R.optionText);

  // Set paths to 1
  await page.locator('.MuiSlider-root').click();
  await page.locator('.MuiSlider-root').press('Home');
  await page.waitForTimeout(300);

  // Set min weight to 50 using keyboard to ensure React state updates
  const weightField = page.locator('#weightField');
  await weightField.click({ clickCount: 3 });
  await page.keyboard.type('50');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);

  // Run query and wait for the Neo4j response
  const responsePromise = page.waitForResponse(
    resp => resp.url().includes('neo4j/tx/commit') && resp.status() === 200,
    { timeout: 90_000 * SLOW_FACTOR }
  );
  await page.locator('button:has-text("Run Query")').click();
  await responsePromise;

  // Wait for graph to render
  await page.waitForTimeout(5000);
}

/**
 * Read graph node/link data from the ForceGraph2D React component's props.
 * The force-graph-container is not a React element itself, but its parent div has
 * a React fiber that leads to the ForceGraph2D component with the graph data.
 */
async function readGraphDataOnce(page: Page) {
  return await page.evaluate(() => {
    const container = document.querySelector('.force-graph-container');
    if (!container) return null;
    const parent = container.parentElement;
    if (!parent) return null;

    // Find the React fiber on the parent element
    const fiberKey = Object.keys(parent).find(
      k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    if (!fiberKey) return null;

    // Walk up the fiber tree to find ForceGraph2D's props
    let fiber = (parent as any)[fiberKey];
    for (let i = 0; i < 30 && fiber; i++) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props?.data?.nodes && props?.data?.links) {
        const d = props.data;
        return {
          nodes: d.nodes.map((n: any) => ({
            name: n.name,
            title: n.title,
            classLabel: n.classLabel,
          })),
          links: d.links.map((l: any) => ({
            label: l.label,
            weight: l.weight,
          })),
        };
      }
      fiber = fiber.return;
    }

    return null;
  });
}

/**
 * Poll until the force-graph React component has populated nodes/links, then return
 * the graph data. The graph can take several seconds to populate after the Neo4j
 * response arrives, especially on the live site under load.
 */
async function getGraphData(page: Page, testInfo?: import('@playwright/test').TestInfo) {
  let data: Awaited<ReturnType<typeof readGraphDataOnce>> = null;
  await withTimeoutLabel(
    'circuit graph data to populate',
    () =>
      expect(async () => {
        data = await readGraphDataOnce(page);
        expect(data).not.toBeNull();
        expect(data!.nodes.length).toBeGreaterThan(0);
      }).toPass({ timeout: LONG_OP_TIMEOUT, intervals: [500, 1000, 2000, 5000] }),
    testInfo,
  );
  return data;
}

/** Type a neuron name into a Circuit Browser input and select from autocomplete. */
async function selectNeuron(
  page: Page,
  inputSelector: string,
  searchTerm: string,
  optionMatch: string,
) {
  const input = page.locator(inputSelector);
  await input.click();
  await input.fill(searchTerm);
  await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 10_000 });
  await page.locator('[role="option"]', { hasText: optionMatch }).first().click();
  await page.waitForTimeout(500);
}

test.describe('VFB Circuit Browser', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
  });

  test('Circuit Browser tab is visible and shows expected controls', async ({ page }, testInfo) => {
    await openCircuitBrowser(page, testInfo);

    // Neuron input fields
    await expect(page.locator('.neuron1 input')).toBeVisible();
    await expect(page.locator('.neuron2 input')).toBeVisible();

    // Paths slider
    await expect(page.locator('.MuiSlider-root')).toBeVisible();

    // Min weight field
    await expect(page.locator('#weightField')).toBeVisible();

    // Run Query and Clear buttons
    await expect(page.locator('button:has-text("Run Query")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
  });

  test('Run Query button is disabled until both neurons are set', async ({ page }, testInfo) => {
    await openCircuitBrowser(page, testInfo);

    // Initially disabled (no neurons set)
    const runBtn = page.locator('button:has-text("Run Query")');
    await expect(runBtn).toBeDisabled();

    // Set Neuron 1 only — should still be disabled
    await selectNeuron(page, '.neuron1 input', MBON21.searchTerm, MBON21.optionText);
    await expect(runBtn).toBeDisabled();

    // Set Neuron 2 — should become enabled
    await selectNeuron(page, '.neuron2 input', MB_C1_R.searchTerm, MB_C1_R.optionText);
    await expect(runBtn).toBeEnabled();
  });
});

test.describe('VFB Circuit Browser — Neuron autocomplete (MBON21)', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await openCircuitBrowser(page, testInfo);
  });

  test('typing MBON21 in Neuron 1 shows autocomplete options', async ({ page }) => {
    const input = page.locator('.neuron1 input');
    await input.click();
    await input.fill(MBON21.searchTerm);
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 10_000 });

    // Should include the specific FlyEM-HB neuron
    await expect(
      page.locator('[role="option"]', { hasText: MBON21.optionText })
    ).toBeVisible();
  });

  test('selecting MBON21 populates Neuron 1 field', async ({ page }) => {
    await selectNeuron(page, '.neuron1 input', MBON21.searchTerm, MBON21.optionText);

    // The input should now contain the selected neuron name
    const value = await page.locator('.neuron1 input').inputValue();
    expect(value).toContain('MBON21');
  });
});

test.describe('VFB Circuit Browser — Neuron autocomplete (MB-C1_R)', () => {
  test.setTimeout(LONG_TEST_TIMEOUT);

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await openCircuitBrowser(page, testInfo);
  });

  test('typing MB-C1_R in Neuron 2 shows autocomplete options', async ({ page }) => {
    const input = page.locator('.neuron2 input');
    await input.click();
    await input.fill(MB_C1_R.searchTerm);
    await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 10_000 });

    // Should include the specific FlyEM-HB neuron
    await expect(
      page.locator('[role="option"]', { hasText: MB_C1_R.optionText }).first()
    ).toBeVisible();
  });

  test('selecting MB-C1_R populates Neuron 2 field', async ({ page }) => {
    await selectNeuron(page, '.neuron2 input', MB_C1_R.searchTerm, MB_C1_R.optionText);

    const value = await page.locator('.neuron2 input').inputValue();
    expect(value).toContain('MB-C1_R');
  });
});

test.describe('VFB Circuit Browser — Query execution', () => {
  // Neo4j connectivity queries can take a minute or more on the live site
  test.setTimeout(LONG_TEST_TIMEOUT);

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }
    await openCircuitBrowser(page, testInfo);
  });

  test('running a query shows a loading indicator', async ({ page }) => {
    // Set both neurons
    await selectNeuron(page, '.neuron1 input', MBON21.searchTerm, MBON21.optionText);
    await selectNeuron(page, '.neuron2 input', MB_C1_R.searchTerm, MB_C1_R.optionText);

    // Set paths slider to 1
    await page.locator('.MuiSlider-root').click();
    await page.locator('.MuiSlider-root').press('Home');
    await page.waitForTimeout(300);

    // Run query
    await page.locator('button:has-text("Run Query")').click();

    // A loading spinner should appear in the circuit browser
    await expect(page.locator('#VFBCircuitBrowser')).toBeVisible({ timeout: 10_000 });
  });

  test('MBON21 → LHCENT3_R query returns connectivity results', async ({ page }, testInfo) => {
    await runMBON21toLHCENT3Query(page, testInfo);

    // Results should show neurotransmitter type labels
    await expect(page.locator('li:text-is("Cholinergic")')).toBeVisible({ timeout: 10_000 });
  });

  test('Clear button resets the neuron fields', async ({ page }) => {
    // Set both neurons
    await selectNeuron(page, '.neuron1 input', MBON21.searchTerm, MBON21.optionText);
    await selectNeuron(page, '.neuron2 input', MB_C1_R.searchTerm, MB_C1_R.optionText);

    // Verify they are filled
    expect(await page.locator('.neuron1 input').inputValue()).toContain('MBON21');
    expect(await page.locator('.neuron2 input').inputValue()).toContain('MB-C1_R');

    // Click Clear
    await page.locator('button:has-text("Clear")').click();
    await page.waitForTimeout(500);

    // Fields should be empty
    expect(await page.locator('.neuron1 input').inputValue()).toBe('');
    expect(await page.locator('.neuron2 input').inputValue()).toBe('');

    // Run Query should be disabled again
    await expect(page.locator('button:has-text("Run Query")')).toBeDisabled();
  });
});

test.describe('VFB Circuit Browser — Graph visualisation (MBON21 → LHCENT3_R)', () => {
  // Query takes time; run serially to avoid overloading the site
  test.setTimeout(LONG_TEST_TIMEOUT);
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }, testInfo) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await skipBtn.click();
    }

    await runMBON21toLHCENT3Query(page, testInfo);
  });

  test('edge data includes synapse weight', async ({ page }, testInfo) => {
    const data = await getGraphData(page, testInfo);
    expect(data).not.toBeNull();
    expect(data!.links.length).toBeGreaterThan(0);

    // The link between MBON21 and LHCENT3_R should have weight 71
    const link = data!.links[0];
    expect(link.label).toContain('synapsed');
    expect(link.weight).toContain(71);
  });

  test('graph nodes have short names (classLabel) and long names', async ({ page }, testInfo) => {
    const data = await getGraphData(page, testInfo);
    expect(data).not.toBeNull();
    expect(data!.nodes.length).toBe(2);

    // Each node should have classLabel (short name), name (long name), and title (VFB ID)
    const mbon21 = data!.nodes.find(n => n.classLabel === 'MBON21');
    expect(mbon21).toBeDefined();
    expect(mbon21!.name).toContain('MBON21(y4y5)(PVL06)_L');
    expect(mbon21!.name).toContain('FlyEM-HB:985813153');
    expect(mbon21!.title).toBe('VFB_jrchk0f9');

    const lhcent3 = data!.nodes.find(n => n.classLabel === 'LHCENT3');
    expect(lhcent3).toBeDefined();
    expect(lhcent3!.name).toContain('LHCENT3_R');
    expect(lhcent3!.name).toContain('FlyEM-HB:487144598');
    expect(lhcent3!.title).toBe('VFB_jrchjz4t');
  });

});
