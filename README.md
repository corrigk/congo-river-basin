# Congo River Basin — SoS Con Ops Globe

Interactive 3D globe for the Congo River Basin System-of-Systems Concept of Operations.
CesiumJS + real satellite imagery + HydroSHEDS basin/river data, with a presenter tour.

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

## Presenting

| Key | Action |
| --- | --- |
| → / Space / PgDn | Next briefing step (clickers work) |
| ← / PgUp | Previous step |
| 1 – 9 | Jump to a process stage |
| H | Basin overview |
| P | Toggle Process & Gaps |
| L | Layers · F fullscreen · ? shortcuts |
| Esc | Close panel / free explore |

| D · S · W · R · G | Toggle Data flow · Satellites · Weather · River flow · Coverage gaps |
| K | Play / pause the flood scenario |

Tour: Intro (space) → The Basin → 6 focus zones → Space Segment (live satellites + weather) → 9 process stages
(with data flow) → Flood Scenario (9 beats) → Process & Gaps. Each chapter switches on the overlays that suit it.

## Overlays (toggle bar at the top)

- **Data flow:** animated arcs between every deployed asset and the Basin Data Hub, a *concept* node at
  CICOS in Kinshasa. Mint arcs are observations flowing in; gold arcs are alerts and tasking flowing out. When a
  stage is selected the pattern follows it: 1–4 in, 5–6 the hub pulses, 7–8 out, 9 the full loop.
- **Satellites:** Sentinel-1A/1C, Landsat 8/9, GPM Core and SWOT, propagated live from CelesTrak TLEs (SGP4),
  with time running ×90. The legend lists each satellite's altitude and its next pass over the basin.
- **Weather:** NASA GIBS, no key needed. It shows yesterday's VIIRS true-colour clouds plus a looping GPM IMERG
  rainfall animation over the past ~day. **Needs internet** and always shows the latest data.
- **River flow:** comet pulses moving downstream along the HydroRIVERS main-stem network.
- **Coverage gaps:** distance to the nearest major road (Natural Earth), used as a proxy for where ground sensors
  are hardest to install and maintain.

## Flood Scenario

This is an illustrative Upper-Ubangi flood walked through the 9 stages, from rain and gauges through radar
mapping, the forecast, alerts and vessels, to feedback. The river reach, gauges and towns are real; the timings
and magnitudes are notional. Use the Flood Scenario tab, or press ▶ (or K) to autoplay.
Clicking anything on the globe keeps the tour cursor in sync, so you can go off-script and then press → to resume.

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

Zone blurbs are general-knowledge geography carried over from the prototype. Verify them before final submission.

## Code map

- `src/content.js`: Con Ops content (steps, zones, assets, stakeholders) plus marker anchors
- `src/globe.js`: Cesium viewer, imagery, vector layers, zone highlighting, camera moves, HTML-marker projection
- `src/views.js`: HTML for panels, rails, Process & Gaps view
- `src/main.js`: state, selection, presenter tour, keyboard/mouse
- `src/style.css`, `src/overlays.css`: design tokens (Old Gold / river blue / rust on near-black) and layout
- `src/fx.js`: the animated "flow" line material and line helpers
- `src/dataflow.js`, `src/orbits.js`, `src/weather.js`, `src/riverflow.js`, `src/coverage.js`: the overlays
- `src/scenario.js`: the flood scenario (beat text is at the top of the file, easy to edit)
