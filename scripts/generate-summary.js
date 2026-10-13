#!/usr/bin/env node
/**
 * Generate a Markdown summary from a Playwright JSON results file.
 *
 * Usage:
 *   node scripts/generate-summary.js [path/to/results.json] [path/to/summary.md]
 *
 * Defaults:
 *   input  = test-results/results.json
 *   output = test-results/summary.md
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || 'test-results/results.json';
const outputPath = process.argv[3] || 'test-results/summary.md';

if (!fs.existsSync(inputPath)) {
  console.error(`Results file not found: ${inputPath}`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Recursively walk suites and collect test specs
function collectSpecs(suite, parentTitles = []) {
  const out = [];
  const titles = [...parentTitles, suite.title].filter(Boolean);
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      // A test has runs in `results` — pick the final result
      const final = test.results[test.results.length - 1];
      out.push({
        file: spec.file,
        suiteTitles: titles,
        title: spec.title,
        status: final?.status || 'unknown',
        outcome: test.status, // 'expected' | 'unexpected' | 'flaky' | 'skipped'
        duration: final?.duration || 0,
        errors: final?.errors || [],
        annotations: test.annotations || [],
        attempts: test.results.length,
      });
    }
  }
  for (const child of suite.suites || []) {
    out.push(...collectSpecs(child, titles));
  }
  return out;
}

const allSpecs = [];
for (const suite of results.suites || []) {
  allSpecs.push(...collectSpecs(suite));
}

// Tests whose final attempt was skipped by the outage guard (see tests/site-health.ts) never
// passed. Playwright reports a failure followed by a skipped retry as "flaky", so pull these
// out before bucketing by outcome.
const isOutageSkipped = s => s.status === 'skipped' && s.annotations.some(a => a.type === 'outage');
const outageSkipped = allSpecs.filter(isOutageSkipped);
const counted = allSpecs.filter(s => !isOutageSkipped(s));

const failed = counted.filter(s => s.outcome === 'unexpected');
const flaky = counted.filter(s => s.outcome === 'flaky');
const passed = counted.filter(s => s.outcome === 'expected');
const skipped = [...counted.filter(s => s.outcome === 'skipped'), ...outageSkipped];

// Identify outage and timeout failures
function categorize(spec) {
  // Annotation set by the outage guard in tests/site-health.ts
  if (spec.annotations.some(a => a.type === 'outage')) return 'outage';
  if ((spec.errors[0]?.message || '').toString().includes('[OUTAGE]')) return 'outage';
  // Annotation set by our withTimeoutLabel helper
  if (spec.annotations.some(a => a.type === 'timeout')) return 'timeout';
  const msg = (spec.errors[0]?.message || '').toString();
  if (msg.startsWith('[TIMEOUT]')) return 'timeout';
  if (/Test timeout of \d+ms exceeded/i.test(msg)) return 'timeout';
  if (/Timeout \d+ms exceeded/i.test(msg)) return 'timeout';
  if (/TimeoutError/i.test(msg)) return 'timeout';
  return 'assertion';
}

const failedOutages = failed.filter(s => categorize(s) === 'outage');
const preRunOutage = failedOutages.some(s => s.file.endsWith('site-health.setup.ts'));
const failedTimeouts = failed.filter(s => categorize(s) === 'timeout');
const failedAssertions = failed.filter(s => categorize(s) === 'assertion');

// Strip ANSI codes from error messages
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

const CATEGORY_LABELS = {
  outage: { icon: '🔌', type: 'Site outage' },
  timeout: { icon: '⏱️', type: 'Timeout' },
  assertion: { icon: '❌', type: 'Assertion / other' },
};

function formatSpec(spec) {
  const fullTitle = [...spec.suiteTitles.slice(1), spec.title].filter(Boolean).join(' › ');
  const cat = categorize(spec);
  const label = CATEGORY_LABELS[cat];
  const annoDescs = spec.annotations
    .filter(a => a.type === 'timeout')
    .map(a => a.description)
    .filter(Boolean);
  const error = stripAnsi(spec.errors[0]?.message || '').trim();
  const duration = (spec.duration / 1000).toFixed(1);

  let block = `### ${label.icon} ${fullTitle}\n\n`;
  block += `- **File**: \`${spec.file}\`\n`;
  block += `- **Type**: ${label.type}\n`;
  block += `- **Duration**: ${duration}s`;
  if (spec.attempts > 1) block += ` (${spec.attempts} attempts)`;
  block += `\n`;
  if (annoDescs.length) {
    block += `- **Timed out waiting for**: ${annoDescs.join('; ')}\n`;
  }
  if (error) {
    // Limit error to 1500 chars to keep summary readable
    const truncated = error.length > 1500 ? error.slice(0, 1500) + '\n…(truncated)…' : error;
    block += `\n<details><summary>Error</summary>\n\n\`\`\`\n${truncated}\n\`\`\`\n\n</details>\n`;
  }
  return block;
}

const baseURL = process.env.VFB_BASE_URL || results.config?.metadata?.baseURL || '(unknown)';
const totals = `${passed.length} passed, ${failed.length} failed, ${flaky.length} flaky, ${skipped.length} skipped`;
const wallMs = results.stats?.duration || 0;
const wallMin = (wallMs / 60000).toFixed(1);

let md = '';
md += `# VFB test summary\n\n`;
md += `**Target**: \`${baseURL}\`  \n`;
if (failed.length > 0) md += `**Result**: ❌ ${failed.length} failed  \n`;
else if (outageSkipped.length > 0) md += `**Result**: ⚠️ Incomplete — ${outageSkipped.length} skipped due to site outage  \n`;
else md += `**Result**: ✅ All tests passed  \n`;
md += `**Totals**: ${totals}  \n`;
md += `**Wall time**: ${wallMin} min\n\n`;

if (failedOutages.length > 0 || outageSkipped.length > 0) {
  md += `> [!WARNING]\n`;
  if (preRunOutage) {
    md += `> **Site outage detected before the run** — \`${baseURL}\` was down or unable to search, so the test suite was skipped. `;
  } else {
    md += `> **Site outage detected during the run** — \`${baseURL}\` was down or unable to search, so ${outageSkipped.length} test(s) were skipped and not re-run. `;
  }
  md += `This reflects the live site's availability, not test regressions. See the 🔌 sections below for what the health check found.\n\n`;
}

if (failed.length > 0) {
  md += `## Failures by category\n\n`;
  md += `| Category | Count |\n|----------|-------|\n`;
  if (failedOutages.length > 0) md += `| 🔌 Site outage | ${failedOutages.length} |\n`;
  md += `| ⏱️ Timeouts | ${failedTimeouts.length} |\n`;
  md += `| ❌ Assertions / other | ${failedAssertions.length} |\n\n`;
  md += `> ⏱️ Timeouts often indicate the live site was slow rather than a real regression. Look at assertion failures first.\n\n`;
}

if (failedOutages.length > 0) {
  md += `## 🔌 Site outage failures (${failedOutages.length})\n\n`;
  for (const spec of failedOutages) md += formatSpec(spec) + '\n';
}

if (outageSkipped.length > 0) {
  md += `## 🔌 Skipped due to site outage (${outageSkipped.length})\n\n`;
  const reason = outageSkipped[0].annotations.find(a => a.type === 'outage')?.description;
  if (reason) md += `Health check: ${reason}\n\n`;
  for (const spec of outageSkipped) {
    const fullTitle = [...spec.suiteTitles.slice(1), spec.title].filter(Boolean).join(' › ');
    md += `- \`${spec.file}\` › ${fullTitle}\n`;
  }
  md += '\n';
}

if (failedTimeouts.length > 0) {
  md += `## ⏱️ Timeout failures (${failedTimeouts.length})\n\n`;
  for (const spec of failedTimeouts) md += formatSpec(spec) + '\n';
}

if (failedAssertions.length > 0) {
  md += `## ❌ Assertion / other failures (${failedAssertions.length})\n\n`;
  for (const spec of failedAssertions) md += formatSpec(spec) + '\n';
}

if (flaky.length > 0) {
  md += `## ⚠️ Flaky tests (passed on retry) (${flaky.length})\n\n`;
  for (const spec of flaky) {
    const fullTitle = [...spec.suiteTitles.slice(1), spec.title].filter(Boolean).join(' › ');
    md += `- \`${spec.file}\` › ${fullTitle} (${spec.attempts} attempts)\n`;
  }
  md += '\n';
}

if (failed.length === 0 && flaky.length === 0 && outageSkipped.length === 0) {
  md += `All ${passed.length} tests passed cleanly.\n`;
}

// Ensure output directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, md);
console.log(`Wrote summary to ${outputPath}`);
console.log(`  ${totals}`);
if (failedOutages.length > 0) console.log(`  🔌 ${failedOutages.length} site outage failures`);
if (outageSkipped.length > 0) console.log(`  🔌 ${outageSkipped.length} skipped due to site outage`);
if (failedTimeouts.length > 0) console.log(`  ⏱️  ${failedTimeouts.length} timeout failures`);
if (failedAssertions.length > 0) console.log(`  ❌ ${failedAssertions.length} assertion failures`);
