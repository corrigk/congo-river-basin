# Congo River Basin: SoS Con Ops

Interactive concept-of-operations visualization for the Congo River Basin System of Systems. It shows how
satellites, aircraft/UAVs, ground stations, river assets, community reporting and governance institutions
would monitor **every hazard in the basin** and turn observations into action through one nine-stage loop.

It is a concept visualization, **not a live monitoring system**. The satellite orbits and weather layers use
real public data for illustration only.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Present from a production build (faster load):

```bash
npm run build && npm run preview   # http://localhost:4173
```

**Backup:** `congo-conops-backup.html` is a single self-contained file (app + data + fonts inlined).
Double-click it to open in Chrome/Edge. It loads Cesium from the jsDelivr CDN, so it needs internet.
Rebuild it with `npm run build:single`.

## Views

| Tab | What it shows |
| --- | --- |
| **System Overview** (landing view) | All-hazards flow: problems monitored → data collection → integrate & forecast → prioritize, act & feed back, plus a hazard × data-source matrix. Click a hazard, source or stage to highlight what it connects to. |
| **Mission Map** | The 3D globe: basin, focus zones, deployed assets, overlays, and the nine-stage rail. |
| **Process & Gaps** | The nine stages with requirements (R-1…R-5), capability gaps, stakeholders and zones. |

**Example: Flooding** is one worked example of the system: an illustrative Upper-Ubangi flood walked through
the same nine stages. Open it from the Flooding hazard ("See it in action") or the Ubangi zone panel, or reach it
in the tour. The river reach, gauges and towns are real; the timings and magnitudes are notional.

## Presenting

| Key | Action |
| --- | --- |
| → / Space / PgDn | Next briefing step (clickers work) |
| ← / PgUp | Previous step |
| 1 – 9 | Jump to a process stage |
| O | System Overview |
| H | Basin view on the map |
| P | Toggle Process & Gaps |
| D · S · W · R · G | Toggle Data flow · Satellites · Weather · River flow · Coverage gaps |
| K | Play / pause the flooding example |
| L | Layers · F fullscreen · ? shortcuts |
| Esc | Close panel / back to the map |

Tour: Intro → System Overview → The Basin → 6 focus zones → Space Segment → 9 process stages (with data flow)
→ Example: Flooding (9 beats) → Process & Gaps. Each chapter switches on the overlays that suit it. Clicking
anything keeps the tour cursor in sync, so you can go off-script and then press → to resume.

## Overlays (toggle bar on the map)

- **Data flow:** animated arcs between every deployed asset and the Basin Data Hub, a *concept* node at
  CICOS in Kinshasa. Mint arcs are observations flowing in; gold arcs are alerts and tasking flowing out. When a
  stage is selected the pattern follows it: 1–4 in, 5–6 the hub pulses, 7–8 out, 9 the full loop.
- **Satellites:** Sentinel-1A/1C, Landsat 8/9, GPM Core and SWOT, propagated from CelesTrak TLEs (SGP4),
  with time running ×90. The legend lists each satellite's altitude and its next pass over the basin.
- **Weather:** NASA GIBS, no key needed. It shows yesterday's VIIRS true-color clouds plus a looping GPM IMERG
  rainfall animation over the past ~day. **Needs internet.**
- **River flow:** comet pulses moving downstream along the HydroRIVERS main-stem network.
- **Coverage gaps:** distance to the nearest major road (Natural Earth), used as a proxy for where ground sensors
  are hardest to install and maintain.

## Content and what still needs verifying

- `src/content.js` holds the team-validated stages, requirements, gaps, zones, assets and stakeholders.
- `src/hazards.js` holds the all-hazards layer. Every hazard→zone and hazard→source link is tagged `content`
  (already stated in our zone or asset content) or `proposed` (inferred; drawn dashed on the page). Search for
  `TODO: verify` to find placeholder text.
- Zone blurbs are general-knowledge geography. The page says so; verify them before presenting.

## Data

| Layer | Source |
| --- | --- |
| Satellite imagery | Esri World Imagery (no token); offline fallback: Cesium's bundled Natural Earth II |
| Basin boundary, catchments, zone polygons | HydroSHEDS HydroBASINS level 6 (Africa) |
| River network (width = mean discharge) | HydroSHEDS HydroRIVERS (Africa) |
| National borders | Natural Earth 50m |

Zone polygons are derived from HydroBASINS drainage topology (`scripts/build-data.mjs`). Ubangi, Sangha, Kasai and
Lualaba are everything upstream of a point on each river. River Mouth is everything downstream of the Kasai
confluence. Cuvette Centrale is **approximated**: the remaining central-depression catchments.

To regenerate `src/data/*.json`, download and unzip the two HydroSHEDS files (URLs at the top of
`scripts/build-data.mjs`) and run `RAW=<folder> npm run data`. This also refreshes the satellite TLEs
(`tle.json`). Refresh them close to presentation day so the orbits stay accurate.

## Code map

- `src/content.js`: Con Ops content (stages, zones, assets, stakeholders), places, the data-hub concept,
  asset data-flow roles and the stage → data-flow mapping
- `src/hazards.js`: hazards and their links to sources, zones and forecast outputs
- `src/overview.js`, `src/overview.css`: the System Overview view
- `src/views.js`: HTML for map panels, rails and the Process & Gaps view
- `src/main.js`: state, selection, tabs, presenter tour, keyboard/mouse
- `src/globe.js`: Cesium viewer, imagery, vector layers, zone highlighting, camera moves, HTML-marker projection
- `src/style.css` (`:root` = the colour tokens), `src/overlays.css`, `src/theme.js` (lets JS read the tokens)
- `src/fx.js`: the animated "flow" line material and line helpers
- `src/dataflow.js`, `src/orbits.js`, `src/weather.js`, `src/riverflow.js`, `src/coverage.js`: map overlays
- `src/scenario.js`: Example: Flooding (beat text is at the top of the file, easy to edit)
