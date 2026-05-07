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

# Run a specific test file
npx playwright test tests/term-info-neuron.spec.ts

# Run tests matching a pattern
npx playwright test --grep "search"
```

### Timeouts and slow-server scaling

The live site can be slow under load and `v2-dev` (or any other non-production server) is typically slower still. The config detects the target server from `VFB_BASE_URL` and applies a 3× multiplier to all timeouts when not on production:

|                              | Production (v2) | v2-dev / other  |
|------------------------------|-----------------|-----------------|
| Test timeout                 | 120s            | 360s            |
| Expect timeout               | 20s             | 60s             |
| Navigation timeout           | 60s             | 180s            |
| Action timeout               | 60s             | 180s            |
| Long-running tests           | 360s            | 1080s (18 min)  |
| Long-running ops             | 240s            | 720s (12 min)   |
| Very-long ops (ROI tree, big graphs) | 360s    | 1080s (18 min)  |
| Internal helper waits        | 10s–30s         | 30s–90s         |

### Identifying timeout failures in the HTML report

Long waits in the helpers and slow specs are wrapped with `withTimeoutLabel(...)`. When a timeout occurs:

- the failure message in the HTML report is prefixed with `[TIMEOUT] <description> — ...`
- the test gets an annotation of type `timeout` (visible in the test's "Annotations" section)

This makes timeout failures easy to distinguish from real assertion failures (e.g. wrong text, missing element). If you see `[TIMEOUT]` in the report, the underlying problem is usually that the site or a backend query was too slow rather than a regression.

```bash
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
tests/
  helpers.ts                       # Shared test utilities
  search-neuron-class.spec.ts      # Search tests: DNp01 (neuron class)
  search-split-gal4.spec.ts        # Search tests: MB099C (split-GAL4 driver)
  search-scrnaseq.spec.ts          # Search tests: AFCA (scRNAseq data)
  term-info-neuron.spec.ts         # Term Info: individual neuron
  term-info-cluster.spec.ts        # Term Info: scRNAseq cluster
  term-info-neuron-class.spec.ts   # Term Info: neuron class
  term-info-split-gal4.spec.ts     # Term Info: Split-GAL4 image
  term-info-dataset.spec.ts        # Term Info: dataset
  term-info-brain-region.spec.ts   # Term Info: brain region / neuropil
  term-info-links.spec.ts          # Term Info: link resolution
  circuit-browser.spec.ts          # Circuit Browser
  viewer.spec.ts                   # Slice Viewer, 3D Viewer, Layers panel
playwright.config.ts               # Playwright configuration
.github/workflows/                 # CI workflows
```

## Test documentation

### Search tests

Tests that the search panel returns correct results with semantic tags and that filters work.

#### `search-neuron-class.spec.ts` — DNp01 (8 tests)

| Test | Description |
|------|-------------|
| search for DNp01 returns results | Results appear; first contains "DNp01" |
| DNp01 results display semantic tags | First result has `primary_neuron`, `Nervous_system`, `Auditory_system`, `Adult` badges |
| filter panel is shown with expected categories | Adult, Larva, Nervous System, Anatomy, Neuron, Type, Image, Expression Pattern visible; Clear Filters button present |
| filters start in neutral state | All icons `fa-square` except Deprecated which starts `fa-minus-square` |
| clicking a filter toggles its icon state | Cycles neutral -> include (`fa-plus-square`) -> exclude (`fa-minus-square`) -> neutral |
| including a filter narrows search results | Image filter reduces DNp01 result count |
| excluding a filter narrows search results | Excluding Neuron reduces DNp01 result count |
| Clear Filters resets all filters to neutral | After activating Neuron + Anatomy, Clear Filters restores all to `fa-square` |

#### `search-split-gal4.spec.ts` — MB099C (8 tests)

| Test | Description |
|------|-------------|
| search for MB099C returns results | Results appear; first contains "MB099C" |
| MB099C results are tagged as Split | First result has `Split` badge |
| some MB099C Image results carry Nervous_system and Adult tags | Using Image filter, at least some results have both tags |
| Split Expression filter returns MB099C results | Split Expression filter yields >0 results |
| Expression Pattern filter returns MB099C results | Expression Pattern filter yields >0 results |
| Neuron filter excludes all MB099C results | 0 results (it's a driver, not a neuron) |
| Larva filter narrows MB099C results | Fewer results than unfiltered |
| Type filter narrows MB099C to a small subset | >0 but fewer than unfiltered |

#### `search-scrnaseq.spec.ts` — AFCA D50 female (6 tests)

| Test | Description |
|------|-------------|
| search for AFCA D50 female returns results | Results appear; first contains "AFCA" |
| AFCA results include DataSet-tagged entries | At least one result has `DataSet` badge |
| some AFCA Cluster results carry Nervous_system tag | At least one result has both `Cluster` and `Nervous_system` |
| "Has scRNAseq data" filter narrows AFCA results to datasets | Fewer results; all remaining tagged `DataSet` |
| Neuron filter excludes all AFCA results | 0 results |
| Image filter excludes all AFCA results | 0 results |

### Term Info tests

Tests the Term Info panel content for six different VFB entity types. Each entity type has its own spec file.

#### `term-info-neuron.spec.ts` — individual neuron (VFB_jrchk7yg / WEDPN2A_R) (14 tests)

| Test | Description |
|------|-------------|
| shows symbol | First collapsible contains "WEDPN2A_R" |
| shows name with VFB and FlyEM IDs and semantic tags | Name has "WEDPN2A_R (FlyEM-HB:885788485)" and "VFB_jrchk7yg"; `secondary_neuron`, `GABAergic`, `Cholinergic`, `Adult` tag badges |
| shows classification with parent class | Contains "wedge projection neuron" |
| shows thumbnail with navigation | Thumbnail visible with Previous/Next buttons |
| shows neurotransmitter prediction with confidence and publication link | "gamma-aminobutyric acid"; confidence badge (`\d+%`) with docs link; FlyBase pub link with `gpt-fly` icon |
| shows anatomical relationships | "soma location", "is part of", "adult brain" from non-prediction sources |
| shows query options including NBLAST similarity | "NBLAST" and "similar morphology" |
| shows graphs section | "Show location" and "Show classification" |
| shows circuit browser link | "Circuit Browser Query" |
| shows cross references | "Neuprint" and "neuronbridge" |
| shows downloads | "OBJ" (mesh), "SWC" (skeleton), "Woolz" (slices), "NRRD" (signal) |
| shows alignment template | "JRC2018Unisex" |
| shows license | "CC-BY" |
| focus bar shows queries for the neuron | Focus bar contains "WEDPN2A_R" |

#### `term-info-cluster.spec.ts` — scRNAseq cluster (FBlc0006494) (6 tests)

| Test | Description |
|------|-------------|
| shows name with cluster ID and semantic tags | "PNS_neurons", "FBlc0006494"; `Nervous_system`, `Cluster`, `Adult` tags |
| shows classification as transcriptional cell cluster | "transcriptional cell cluster" |
| shows related individuals | "scRNAseq_2023_AFCA" (parent dataset) |
| shows relationships with cell type composition | "PNS neuron" |
| shows query for genes | "Genes expressed" |
| shows source | "scRNAseq_2023_AFCA" |

#### `term-info-neuron-class.spec.ts` — neuron class (FBbt_00100163 / adult pacemaker neuron) (6 tests)

| Test | Description |
|------|-------------|
| shows name with semantic tags | "adult pacemaker neuron", "FBbt_00100163"; `Neuron`, `Nervous_system`, `Adult` tags |
| shows alternative names | "clock neuron" |
| shows classification | "pacemaker neuron" |
| shows available images with navigation | Available Images visible with Next button |
| shows query options for neuron class | "transgene expression", "Subclasses", "available images", "transcriptomics", "downstream connectivity", "upstream connectivity" |
| shows graphs section | "Show location" and "Show classification" |

#### `term-info-split-gal4.spec.ts` — Split-GAL4 image (VFB_00063821 / JRC_MB099C) (6 tests)

| Test | Description |
|------|-------------|
| shows name with Split-GAL4 identifier and semantic tags | "JRC_MB099C", "VFB_00063821"; `Split` tag |
| shows classification with expression pattern | "expression pattern" |
| shows anatomy and image query options | "Anatomy", "is expressed in", "Images of fragments" |
| shows FlyLight and NeuronBridge cross references | Links to `splitgal4.janelia.org` with FlyLight icon; links to `neuronbridge.janelia.org` with NeuronBridge icon |
| shows downloads | "OBJ" |
| shows alignment template | "JRC2018Unisex" |

#### `term-info-dataset.spec.ts` — dataset (Berg2025 / Male CNS connectome) (7 tests)

| Test | Description |
|------|-------------|
| shows symbol | "male-cns" |
| shows name with dataset description and semantic tags | "Male CNS", "Berg2025"; `DataSet` tag |
| shows available images with navigation | Available Images visible with Next button |
| shows query to list images | "List all images" |
| shows description | "male-cns" and "Berg" |
| shows references with DOI link and pub tag | "Berg", "2025"; DOI link to `doi.org`; `gpt-doi` icon; `pub` tag badge |
| shows license | "CC-BY" |

#### `term-info-brain-region.spec.ts` — brain region / neuropil (FBbt_00045051 / cantle) (9 tests)

| Test | Description |
|------|-------------|
| shows name with semantic tags | "cantle", "FBbt_00045051"; `Synaptic_neuropil_domain`, `Nervous_system`, `Adult` tags |
| shows alternative names with synonyms | "CAN" and "PONPp" |
| shows classification as synaptic neuropil domain | "synaptic neuropil domain" |
| shows available images with navigation | Available Images visible with Next button |
| shows relationships with parent structures | "deutocerebrum" |
| shows query options for neurons innervating region | "Neurons with", "presynaptic terminals", "postsynaptic terminals" |
| shows description | "synaptic neuropil domain" and "saddle" |
| shows cross references | "Insect Brain DB" |
| shows references with citations | "Ito et al." and "Chiang et al." (using exact trigger match to avoid "Cross References") |

#### `term-info-links.spec.ts` — link resolution and queries across entity types (12 tests)

| Test | Description |
|------|-------------|
| clicking a classification link navigates to that class | Clicking "synaptic neuropil domain" updates Term Info to FBbt_00040007 |
| clicking an available image loads it into the layers panel | Clicking cantle image thumbnail adds "CAN on..." to Layers |
| clicking a publication citation navigates to the pub record | Clicking "Berg et al., 2025" updates Term Info to pub |
| DOI link points to a valid doi.org URL | href matches `https://doi.org/10.xxxx/...` |
| FlyLight cross reference links to splitgal4.janelia.org | href contains "splitgal4.janelia.org" and "MB099C" |
| NeuronBridge cross reference links to neuronbridge.janelia.org | href contains "neuronbridge.janelia.org" and "MB099C" |
| "List all available images" query returns results | Clicking cantle images query shows results table with Imaging_Technique column |
| Neuprint cross reference links to neuprint | href contains "neuprint" and body ID "885788485" |
| NeuronBridge cross reference for neuron links correctly | href contains "neuronbridge" and "885788485" |
| "Neurons with similar morphology" query returns results | NBLAST similarity query for WEDPN2A_R shows results with Score column |
| "Show neurons connected to" query returns results | Connectivity query for WEDPN2A_R shows "N results" indicator |
| "Single cell transcriptomics" query returns results | scRNAseq query for adult pacemaker neuron shows results table with Cell type column |

### Circuit Browser tests

#### `circuit-browser.spec.ts` — MBON21, MB-C1_R, LHCENT3_R (11 tests)

| Test | Description |
|------|-------------|
| Circuit Browser tab shows expected controls | Neuron 1/2 inputs, paths slider, weight field, Run Query & Clear buttons |
| Run Query disabled until both neurons set | Disabled with 0 or 1 neuron, enabled with both |
| typing MBON21 in Neuron 1 shows autocomplete options | Dropdown includes VFB_jrchk0f9 |
| selecting MBON21 populates Neuron 1 field | Input contains "MBON21" |
| typing MB-C1_R in Neuron 2 shows autocomplete options | Dropdown includes 5813021291 |
| selecting MB-C1_R populates Neuron 2 field | Input contains "MB-C1_R" |
| running a query shows a loading indicator | Spinner appears after clicking Run Query |
| MBON21 -> LHCENT3_R query returns connectivity results | "Cholinergic" label visible after query |
| Clear button resets the neuron fields | Both inputs empty, Run Query disabled |
| edge data includes synapse weight | Link weight contains 71; label contains "synapsed" (read from ForceGraph2D React component props) |
| graph nodes have short names and long names | MBON21 node: classLabel="MBON21", name with FlyEM-HB ID, title=VFB ID; same for LHCENT3_R |

### Viewer tests

#### `viewer.spec.ts` — Slice Viewer, 3D Viewer, Layers panel (20 tests)

Uses WEDPN2A_R (VFB_jrchk7yg) as the test entity.

**Slice Viewer (5 tests)**

| Test | Description |
|------|-------------|
| slice viewer canvas is visible | Canvas renders with non-zero dimensions |
| slice viewer has navigation controls | Center, Zoom In/Out, Step In/Out, Change Plane, Toggle 3D buttons |
| stepping through the stack changes the displayed slice | Canvas pixel hash changes after 3x step-in clicks |
| zooming changes the slice view | Canvas pixel hash changes after 2x zoom-in clicks |
| changing slice plane changes the view | Canvas pixel hash changes after changing plane |

**3D Viewer (5 tests)**

| Test | Description |
|------|-------------|
| 3D viewer panel is visible with a canvas | Tab visible; at least 2 canvases (slice + 3D) |
| 3D viewer has pan, rotate, zoom, and camera controls | Pan left/right/up/down/home, rotate left/right/home, zoom in/out, wireframe toggle |
| 3D viewer rotate controls are clickable | Rotate left + camera reset without errors |
| 3D viewer zoom controls are clickable | Zoom in/out without errors |
| 3D viewer wireframe toggle is clickable | Toggle on/off without errors |

**Layers Panel (10 tests)**

| Test | Description |
|------|-------------|
| layers table has expected columns | Controls, Name, Type, Thumbnail headers |
| layers include the template (JRC2018Unisex) | Template row visible |
| layers include the selected neuron | WEDPN2A_R row visible |
| neuron layer shows type classification | Row contains "wedge projection neuron" |
| layer controls expand and collapse | `fa-angle-down` toggles to `fa-angle-up` and back |
| neuron layer has a color indicator | Row has span with `color: rgb(...)` style |
| expanding a layer reveals a color picker button | `fa-tint` button appears after expanding |
| clicking color picker opens a chrome color picker | ChromePicker visible with hex input matching `#[0-9A-F]{6}` |
| template layer has visibility toggle | Eye icon (`fa-eye` / `fa-eye-slash`) visible |
| layers filter input is visible | Input with placeholder "Filter" |
