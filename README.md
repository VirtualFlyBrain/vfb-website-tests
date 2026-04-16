# VFB Website Tests

Playwright end-to-end tests for [Virtual Fly Brain](https://v2.virtualflybrain.org/).

## Setup

```bash
npm install
npx playwright install chromium
```

## Running tests

```bash
# Run tests against production (v2.virtualflybrain.org)
npm test

# Run with the interactive UI (great for debugging)
npm run test:ui

# Run headed (see the browser)
npm run test:headed

# Run against v2-dev
npm run test:v2-dev

# Run against any server
VFB_BASE_URL=https://your-server.example.com/ npm test

# View the HTML report after a run
npm run report
```

## GitHub Actions

Two workflows are provided:

- **Scheduled tests (v2 production)** — runs daily at 06:00 UTC against `v2.virtualflybrain.org`. The HTML report is published to GitHub Pages and uploaded as a workflow artifact.
- **Manual tests (any server)** — trigger manually via the Actions tab, specifying any base URL (defaults to `v2-dev.virtualflybrain.org`).

## Adding more browsers

Uncomment the Firefox and/or WebKit projects in `playwright.config.ts`, then install the browsers:

```bash
npx playwright install firefox webkit
```

## Project structure

```
tests/           # Test specs
playwright.config.ts  # Playwright configuration
.github/workflows/    # CI workflows
```
