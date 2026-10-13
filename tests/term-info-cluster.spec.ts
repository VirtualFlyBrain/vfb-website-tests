import { test } from './fixtures';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — scRNAseq cluster (FBlc0006494)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
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
