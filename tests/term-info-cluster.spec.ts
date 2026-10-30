import { test } from './fixtures';
import { dismissQuickHelp, searchAndSelect, expectSection, expectNameTags } from './helpers';

test.describe('VFB Term Info — scRNAseq cluster (VFBseq_00001616)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissQuickHelp(page);
    await searchAndSelect(page, 'VFBseq_00001616', 'VFBseq_00001616');
  });

  test('shows name with cluster ID and semantic tags', async ({ page }) => {
    await expectSection(page, 'Name', 'Kenyon cell cluster (Aging Fly Cell Atlas head)', 'VFBseq_00001616');
    await expectNameTags(page, 'Nervous_system', 'Cluster', 'Adult');
  });

  test('shows classification as transcriptional cell cluster', async ({ page }) => {
    await expectSection(page, 'Classification', 'transcriptional cell cluster');
  });

  test('shows related individuals', async ({ page }) => {
    await expectSection(page, 'Related Individuals', 'Aging Fly Cell Atlas head');
  });

  test('shows relationships with cell type composition', async ({ page }) => {
    await expectSection(page, 'Relationships', 'adult Kenyon cell');
  });

  test('shows query for genes', async ({ page }) => {
    await expectSection(page, 'Query for', 'Genes expressed');
  });

  test('shows source', async ({ page }) => {
    await expectSection(page, 'Source', 'scRNAseq data from Lu (2023)');
  });
});
