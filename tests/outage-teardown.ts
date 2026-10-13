import type { FullConfig } from '@playwright/test';
import { readOutageState } from './site-health';

/**
 * Global teardown: if a site outage was detected during the run, the remaining tests were
 * skipped, so fail the run even if everything that did run passed. See site-health.ts.
 */
export default async function outageTeardown(config: FullConfig) {
  const state = readOutageState(config.projects[0].outputDir);
  if (!state) return;
  throw new Error(
    `[OUTAGE] Site went down at ${state.since} (detected after "${state.detectedAfter}") — ` +
      `the rest of the run was skipped. ${state.problems.join('; ')}`,
  );
}
