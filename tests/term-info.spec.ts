import { test, expect, Page } from '@playwright/test';

/** Open search, type a query, click the first result, and wait for Term Info to update. */
async function searchAndSelect(page: Page, query: string, expectNameContains: string) {
  await page.locator('i.fa-search.arrowsStyle').first().click();
  const searchInput = page.locator('input#searchInput');
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(query);
  await expect(page.locator('li.searchResult').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('li.searchResult').first().click();
  // Wait for Term Info to update — the Name section should contain the expected text
  await expect(
    page.locator('.Collapsible', { hasText: 'Name' }).locator('.Collapsible__contentInner').first()
  ).toContainText(expectNameContains, { timeout: 30_000 });
}

/** Check that the Name section contains expected semantic tag badges (e.g. label-Adult). */
async function expectNameTags(page: Page, ...tagClasses: string[]) {
  const nameContent = page.locator('.Collapsible', { hasText: 'Name' })
    .locator('.Collapsible__contentInner').first();
  for (const tag of tagClasses) {
    await expect(nameContent.locator(`span.label-${tag}`)).toBeVisible();
  }
}

/** Check that a collapsible section exists and contains expected text. */
async function expectSection(page: Page, sectionName: string, ...expectedTexts: string[]) {
  const section = page.locator('.Collapsible', { hasText: sectionName })
    .locator('.Collapsible__contentInner').first();
  await expect(section).toBeVisible();
  for (const text of expectedTexts) {
    await expect(section).toContainText(text);
  }
}

// ── Individual neuron (WEDPN2A_R) ───────────────────────────────────────────

test.describe('VFB Term Info — individual neuron (VFB_jrchk7yg)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
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
    // Should have Previous/Next buttons for cycling through thumbnails
    await expect(thumbnail.locator('button', { hasText: 'Previous' })).toBeVisible();
    await expect(thumbnail.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows neurotransmitter prediction with confidence and publication link', async ({ page }) => {
    const relationships = page.locator('.Collapsible', { hasText: 'Relationships' })
      .locator('.Collapsible__contentInner').first();

    // Neurotransmitter prediction text
    await expect(relationships).toContainText('gamma-aminobutyric acid');

    // Confidence level badge (e.g. "70%")
    const confidenceBadge = relationships.locator('span.badge');
    await expect(confidenceBadge).toBeVisible();
    const badgeText = await confidenceBadge.textContent();
    expect(badgeText).toMatch(/\d+%/);

    // Confidence links to documentation
    const confidenceLink = relationships.locator('a[title="confidence value"]');
    await expect(confidenceLink).toBeVisible();

    // Publication icon linking to FlyBase
    const pubLink = relationships.locator('a[title*="FBrf"]');
    await expect(pubLink).toBeVisible();
    const pubIcon = pubLink.locator('i.gpt-fly');
    await expect(pubIcon).toBeVisible();
  });

  test('shows anatomical relationships', async ({ page }) => {
    const relationships = page.locator('.Collapsible', { hasText: 'Relationships' })
      .locator('.Collapsible__contentInner').first();

    // Should include non-prediction relationships from other build sources
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

// ── scRNAseq cluster (FBlc0006494) ──────────────────────────────────────────

test.describe('VFB Term Info — scRNAseq cluster (FBlc0006494)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
    await searchAndSelect(page, 'FBlc0006494', 'FBlc0006494');
  });

  test('shows name with cluster ID and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'PNS_neurons', 'FBlc0006494');
    await expectNameTags(page, 'Nervous_system', 'Cluster', 'Adult');
  });

  test('shows classification as transcriptional cell cluster', async ({ page }) => {
    await expectSection(page, 'Classification', 'transcriptional cell cluster');
  });

  test('shows related individuals', async ({ page }) => {
    await expectSection(page, 'Related Individuals', 'scRNAseq_2023_AFCA');
  });

  test('shows relationships with cell type composition', async ({ page }) => {
    await expectSection(page, 'Relationships', 'PNS neuron');
  });

  test('shows query for genes', async ({ page }) => {
    await expectSection(page, 'Query for', 'Genes expressed');
  });

  test('shows source', async ({ page }) => {
    await expectSection(page, 'Source', 'scRNAseq_2023_AFCA');
  });
});

// ── Neuron class (FBbt_00100163 — adult pacemaker neuron) ───────────────────

test.describe('VFB Term Info — neuron class (FBbt_00100163)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
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
    // Expression and anatomy queries
    await expect(queryFor).toContainText('transgene expression');
    await expect(queryFor).toContainText('Subclasses');
    await expect(queryFor).toContainText('available images');
    // Transcriptomics
    await expect(queryFor).toContainText('transcriptomics');
    // Connectivity
    await expect(queryFor).toContainText('downstream connectivity');
    await expect(queryFor).toContainText('upstream connectivity');
  });

  test('shows graphs section', async ({ page }) => {
    await expectSection(page, 'Graphs for', 'Show location', 'Show classification');
  });
});

// ── Split-GAL4 image (VFB_00063821) ─────────────────────────────────────────

test.describe('VFB Term Info — Split-GAL4 image (VFB_00063821)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
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

    // FlyLight Split-GAL4 link with icon
    await expect(crossRefs.locator('a[href*="splitgal4.janelia.org"]').first()).toBeVisible();
    await expect(crossRefs.locator('img[src*="fly_light"]')).toBeVisible();

    // NeuronBridge link with icon
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

// ── Dataset (Berg2025) ──────────────────────────────────────────────────────

test.describe('VFB Term Info — dataset (Berg2025)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
    await searchAndSelect(page, 'Berg2025', 'Berg2025');
  });

  test('shows symbol', async ({ page }) => {
    await expectSection(page, 'Symbol', 'male-cns');
  });

  test('shows name with dataset description and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'Male CNS', 'Berg2025');
    await expectNameTags(page, 'DataSet');
  });

  test('shows available images with navigation', async ({ page }) => {
    const images = page.locator('.Collapsible', { hasText: 'Available Images' })
      .locator('.Collapsible__contentInner');
    await expect(images).toBeVisible();
    await expect(images.locator('button', { hasText: 'Next' })).toBeVisible();
  });

  test('shows query to list images', async ({ page }) => {
    await expectSection(page, 'Query for', 'List all images');
  });

  test('shows description', async ({ page }) => {
    await expectSection(page, 'Description', 'male-cns', 'Berg');
  });

  test('shows references with DOI link and pub tag', async ({ page }) => {
    const refs = page.locator('.Collapsible', { hasText: 'References' })
      .locator('.Collapsible__contentInner').first();
    await expect(refs).toContainText('Berg');
    await expect(refs).toContainText('2025');

    // DOI icon linking to the publication
    const doiLink = refs.locator('a[href*="doi.org"]');
    await expect(doiLink).toBeVisible();
    const doiIcon = doiLink.locator('i.gpt-doi');
    await expect(doiIcon).toBeVisible();

    // pub semantic tag
    await expect(refs.locator('span.label-pub')).toBeVisible();
  });

  test('shows license', async ({ page }) => {
    await expectSection(page, 'License', 'CC-BY');
  });
});

// ── Brain region / neuropil (FBbt_00045051 — cantle) ────────────────────────

test.describe('VFB Term Info — brain region (FBbt_00045051)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const skipBtn = page.locator('text=SKIP INTRO');
    if (await skipBtn.isVisible({ timeout: 5000 }).catch(() => false)) await skipBtn.click();
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
    // Use the trigger text directly to avoid matching "Cross References"
    const refsTrigger = page.locator('.Collapsible__trigger:text-is("References")');
    await expect(refsTrigger).toBeVisible();
    const refsContent = refsTrigger.locator('~ .Collapsible__contentOuter .Collapsible__contentInner');
    await expect(refsContent).toContainText('Ito et al.');
    await expect(refsContent).toContainText('Chiang et al.');
  });
});
