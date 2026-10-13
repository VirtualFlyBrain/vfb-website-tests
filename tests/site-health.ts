import * as fs from 'fs';
import * as path from 'path';
import type { APIRequestContext, Browser, TestInfo } from '@playwright/test';
import { BASE_URL, SLOW_FACTOR } from './helpers';

/**
 * Site health checks, used to tell "the live site is down" apart from real regressions.
 *
 * - Before the run, `site-health.setup.ts` waits for the site to be healthy and fails
 *   (skipping the whole suite) if it isn't.
 * - During the run, the auto fixture in `fixtures.ts` runs a health check after any failed
 *   test. A confirmed outage is recorded in `site-outage.json` in the output dir, and every
 *   remaining test is skipped rather than each waiting out its full timeouts. The site is not
 *   re-checked; rerun the workflow once it's back up.
 * - `outage-teardown.ts` fails the run if an outage was recorded, so skipped tests can't go
 *   unnoticed in an otherwise green run, and CI uses the same file to send a notification.
 */

/** Query used for the UI smoke check — a stable, well-known term. */
const SMOKE_QUERY = 'DNp01';

/** How long the pre-run check keeps polling for the site to become healthy. */
export const PRE_RUN_WAIT_MS = Number(process.env.VFB_HEALTH_WAIT_MIN ?? 10) * 60_000;

/** Delay between pre-run health polls. */
export const PRE_RUN_POLL_MS = 60_000;

/** Delay before re-checking to confirm a suspected outage (avoids reacting to a blip). */
const CONFIRM_DELAY_MS = 30_000;

/** Upper bound for one `checkSiteHealth` call: HTTP probe + UI smoke check. */
export const HEALTH_CHECK_TIMEOUT = 180_000 * SLOW_FACTOR;

/** Fixture timeout: two health checks plus the confirmation delay, with headroom. */
export const OUTAGE_GUARD_TIMEOUT = 2 * HEALTH_CHECK_TIMEOUT + CONFIRM_DELAY_MS + 30_000;

export interface SiteHealth {
  healthy: boolean;
  problems: string[];
}

export interface OutageState {
  since: string;
  /** Title of the failed test after which the outage was detected (or the pre-run check). */
  detectedAfter: string;
  problems: string[];
}

function firstLine(err: unknown): string {
  const msg = (err as any)?.message ?? String(err);
  // eslint-disable-next-line no-control-regex
  return msg.replace(/\x1b\[[0-9;]*m/g, '').split('\n')[0].trim();
}

function shortUrl(url: string): string {
  const u = new URL(url);
  return `${u.host}${u.pathname}`;
}

/**
 * Check the site is up: the front page responds, and a search in the UI returns results.
 * Any VFB backend requests that fail during the UI check are reported to help pinpoint
 * which service is down (e.g. Solr search, term info API).
 */
export async function checkSiteHealth(browser: Browser, request: APIRequestContext): Promise<SiteHealth> {
  const problems: string[] = [];

  try {
    const res = await request.get(BASE_URL, { timeout: 30_000 * SLOW_FACTOR });
    if (!res.ok()) problems.push(`GET ${BASE_URL} returned HTTP ${res.status()}`);
  } catch (err) {
    problems.push(`GET ${BASE_URL} failed: ${firstLine(err)}`);
  }
  if (problems.length) return { healthy: false, problems };

  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  const backendErrors = new Set<string>();
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('virtualflybrain.org')) {
      backendErrors.add(`HTTP ${res.status()} from ${shortUrl(res.url())}`);
    }
  });
  page.on('requestfailed', (req) => {
    const errorText = req.failure()?.errorText ?? 'failed';
    if (req.url().includes('virtualflybrain.org') && !errorText.includes('ERR_ABORTED')) {
      backendErrors.add(`${errorText} from ${shortUrl(req.url())}`);
    }
  });

  try {
    await page.goto('/', { timeout: 60_000 * SLOW_FACTOR });
    await page.locator('i.fa-search.arrowsStyle').first().click({ timeout: 60_000 * SLOW_FACTOR });
    await page.locator('input#searchInput').fill(SMOKE_QUERY, { timeout: 10_000 * SLOW_FACTOR });
    await page.locator('li.searchResult').first().waitFor({ state: 'visible', timeout: 30_000 * SLOW_FACTOR });
  } catch (err) {
    problems.push(`UI smoke check (search for "${SMOKE_QUERY}") failed: ${firstLine(err)}`);
    problems.push(...[...backendErrors].slice(0, 5));
  } finally {
    await context.close();
  }
  return { healthy: problems.length === 0, problems };
}

/** Run a health check, and if it fails, wait and re-check to confirm before reporting unhealthy. */
async function checkSiteHealthConfirmed(browser: Browser, request: APIRequestContext): Promise<SiteHealth> {
  const first = await checkSiteHealth(browser, request);
  if (first.healthy) return first;
  await new Promise((r) => setTimeout(r, CONFIRM_DELAY_MS));
  return checkSiteHealth(browser, request);
}

/** Outage record for this run; read by the fixtures, outage-teardown.ts and CI. */
export function outageFilePath(outputDir: string): string {
  return path.join(outputDir, 'site-outage.json');
}

export function readOutageState(outputDir: string): OutageState | undefined {
  try {
    return JSON.parse(fs.readFileSync(outageFilePath(outputDir), 'utf8'));
  } catch {
    return undefined;
  }
}

export function writeOutageState(outputDir: string, state: OutageState) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outageFilePath(outputDir), JSON.stringify(state, null, 2));
}

/** Called before each test: skip it if an outage has been recorded earlier in the run. */
export function skipIfOutage(testInfo: TestInfo) {
  const state = readOutageState(testInfo.project.outputDir);
  if (!state) return;
  const problems = state.problems.join('; ');
  testInfo.annotations.push({ type: 'outage', description: problems });
  testInfo.skip(true, `[OUTAGE] ${BASE_URL} went down at ${state.since} — skipping the rest of the run. ${problems}`);
}

/**
 * Called after each test. If the test failed and no outage is recorded yet, check whether
 * the site is down; if so, record the outage so the remaining tests are skipped.
 */
export async function recordOutageIfSiteDown(browser: Browser, request: APIRequestContext, testInfo: TestInfo) {
  const outputDir = testInfo.project.outputDir;
  if (testInfo.status === testInfo.expectedStatus || readOutageState(outputDir)) return;

  const health = await checkSiteHealthConfirmed(browser, request);
  if (health.healthy) return;

  const state: OutageState = {
    since: new Date().toISOString(),
    detectedAfter: testInfo.titlePath.slice(1).join(' › '),
    problems: health.problems,
  };
  writeOutageState(outputDir, state);
  testInfo.annotations.push({ type: 'outage', description: health.problems.join('; ') });
  console.log(`[site-health] Outage detected after "${state.detectedAfter}": ${health.problems.join('; ')}`);
}
