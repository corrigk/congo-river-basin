import { STEPS, ZONES, ASSET_INFO, STAKE, ZONE_GEO, OODA } from './content.js';
import { ASSET_ICON, ICON } from './icons.js';

export const pad = n => String(n).padStart(2, '0');
export const fmt = n => n.toLocaleString('en-US');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const stepBy = Object.fromEntries(STEPS.map(s => [s.k, s]));
export const zoneBy = Object.fromEntries(ZONES.map(z => [z.k, z]));
export const zoneIndex = k => ZONES.findIndex(z => z.k === k);
export const zonesForStage = k => ZONES.filter(z => z.stages.includes(k));
export const zonesForAsset = k => ZONES.filter(z => z.assets.includes(k));

const PHASE_SPANS = OODA.map(p => ({ p, from: STEPS.findIndex(s => s.ooda === p), n: STEPS.filter(s => s.ooda === p).length }));

// ---------- left rail ----------
export function zonesRail(zp) {
  return `
    <div class="zr-head"><span>Focus zones</span><span class="zr-count">${pad(ZONES.length)}</span></div>
    <ol class="zr-list">
      ${ZONES.map((z, i) => `
        <li><button class="zr-item" data-zone="${z.k}">
          <span class="zr-n">${pad(i + 1)}</span>
          <span class="zr-body">
            <span class="zr-name">${esc(z.name)}</span>
            <span class="zr-meta"><span class="zr-issue">${esc(z.issue)}</span><span class="zr-area">${fmt(Math.round(zp[z.k].area_km2 / 1000))}k km²</span></span>
          </span>
        </button></li>`).join('')}
    </ol>`;
}

// ---------- bottom process rail ----------
export function processRail() {
  return `
    <div class="pr-grid">
      ${PHASE_SPANS.map(({ p, from, n }) => `<div class="pr-phase" style="grid-column:${from + 1} / span ${n}"><span>${p}</span></div>`).join('')}
      <div class="pr-track" style="grid-column:1 / -1"></div>
      ${STEPS.map((s, i) => `
        <button class="pr-node" data-stage="${s.k}" style="grid-column:${i + 1}" title="${pad(s.n)} · ${esc(s.title)}">
          <span class="pr-dot"><b>${s.n}</b></span>
        </button>`).join('')}
    </div>
    <button class="pr-loop" data-stage="feedback" title="Feedback closes the loop">${ICON.loop}</button>
    <div class="pr-caption" id="pr-caption"></div>`;
}

export function railCaption(sel) {
  if (sel?.type === 'stage') {
    const s = stepBy[sel.k];
    return `<span class="pr-cap-n">${pad(s.n)}</span><span class="pr-cap-t">${esc(s.title)}</span><span class="pr-cap-g">${esc(s.gapLabel)}</span>`;
  }
  if (sel?.type === 'zone') {
    const z = zoneBy[sel.k];
    return `<span class="pr-cap-hint">Stages active in <b>${esc(z.name)}</b> are marked</span>`;
  }
  return `<span class="pr-cap-hint">Select a stage to see where it plays out across the basin</span>`;
}

// ---------- detail panel ----------
const head = (eyebrow, title, extra = '') => `
  <button class="p-close icon-btn" data-act="close" title="Close (Esc)">${ICON.close}</button>
  <div class="p-eyebrow">${eyebrow}</div>
  <h2 class="p-title">${title}</h2>${extra}`;

const stageChip = s => `
  <button class="chip chip-stage" data-stage="${s.k}"><b>${pad(s.n)}</b><span>${esc(s.title)}</span>${ICON.arrow}</button>`;
const zoneChip = z => `
  <button class="chip chip-zone" data-zone="${z.k}"><i></i><span>${esc(z.name)}</span>${ICON.arrow}</button>`;

export function basinPanel(basin, zp) {
  return `
    ${head('<span>Area of interest</span><i></i><span>HydroSHEDS</span>', 'Congo River Basin')}
    <div class="p-stats">
      <div><b>${(basin.area_km2 / 1e6).toFixed(2)}M</b><span>km² drainage area</span></div>
      <div><b>${basin.catchments}</b><span>level-6 catchments</span></div>
      <div><b>${ZONES.length}</b><span>focus zones</span></div>
    </div>
    <p class="p-text">The basin boundary, sub-basins and river network are drawn from HydroSHEDS drainage data. Rivers are sized by mean annual discharge, and the focus zones are sub-basins traced up the drainage network from each tributary.</p>
    <div class="p-legend">
      <div><i class="lg-line gold"></i>Basin divide</div>
      <div><i class="lg-line river thick"></i>Main stem · &gt;8,000 m³/s</div>
      <div><i class="lg-line river"></i>Tributaries</div>
      <div><i class="lg-line dash"></i>National borders</div>
    </div>
    <h3 class="p-h">Focus zones</h3>
    <div class="p-chips">${ZONES.map(zoneChip).join('')}</div>`;
}

export function zonePanel(k, zp, basin) {
  const z = zoneBy[k], i = zoneIndex(k), p = zp[k];
  const stages = z.stages.map(s => stepBy[s]);
  return `
    ${head(`<span>Focus zone ${pad(i + 1)}</span><i></i><span>${ZONE_GEO[k].kind}</span>`, esc(z.name), `<div class="p-issue"><i></i>${esc(z.issue)}</div>`)}
    <div class="p-stats">
      <div><b>${fmt(p.area_km2)}</b><span>km² drainage</span></div>
      <div><b>${p.catchments}</b><span>catchments</span></div>
      <div><b>${((p.area_km2 / basin.area_km2) * 100).toFixed(1)}%</b><span>of the basin</span></div>
    </div>
    <p class="p-text">${esc(z.blurb)}</p>
    <h3 class="p-h">Process stages active here</h3>
    <div class="p-chips">${stages.map(stageChip).join('')}</div>
    <h3 class="p-h">Assets deployed</h3>
    <div class="p-assets">${z.assets.map(a => assetRow(a)).join('')}</div>
    ${pager('zone', i, ZONES.length, ZONES[(i + ZONES.length - 1) % ZONES.length].name, ZONES[(i + 1) % ZONES.length].name)}`;
}

function assetRow(a) {
  const info = ASSET_INFO[a];
  return `
    <details class="asset" data-asset="${a}">
      <summary><span class="asset-ico">${ASSET_ICON[a]}</span><span class="asset-name">${esc(info.name)}</span><span class="asset-n">${info.items.length}</span>${ICON.next}</summary>
      <ul>${info.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <button class="asset-more" data-asset="${a}">Where else it's deployed ${ICON.arrow}</button>
    </details>`;
}

export function stagePanel(k) {
  const s = stepBy[k], i = STEPS.indexOf(s);
  const zones = zonesForStage(k);
  return `
    ${head(`<span>Stage ${pad(s.n)} of ${pad(STEPS.length)}</span><i></i><span>${s.ooda}</span>`, esc(s.title))}
    <div class="p-block req">
      <div class="p-block-top"><span class="tag">${esc(s.req)}</span><span class="lbl">Requirement</span></div>
      <p>${esc(s.reqText)}</p>
    </div>
    <div class="p-block gap">
      <div class="p-block-top"><span class="lbl">${esc(s.gapLabel)}</span></div>
      <p>${esc(s.gapText)}</p>
    </div>
    <h3 class="p-h">Stakeholders</h3>
    <div class="p-stake">${s.stake.map(x => `<span class="stake">${esc(STAKE[x].name)}</span>`).join('')}</div>
    <h3 class="p-h">Where it plays out</h3>
    <div class="p-chips">${zones.length ? zones.map(zoneChip).join('') : `<div class="p-basinwide">${ICON.globe}<span>Basin-wide. This stage runs across the whole system, not in one zone.</span></div>`}</div>
    ${pager('stage', i, STEPS.length, STEPS[(i + STEPS.length - 1) % STEPS.length].title, STEPS[(i + 1) % STEPS.length].title)}`;
}

export function assetPanel(a) {
  const info = ASSET_INFO[a];
  return `
    ${head('<span>Asset class</span><i></i><span>Observation &amp; response</span>', esc(info.name), `<div class="p-asset-hero">${ASSET_ICON[a]}</div>`)}
    <ul class="p-list">${info.items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <h3 class="p-h">Deployed in</h3>
    <div class="p-chips">${zonesForAsset(a).map(zoneChip).join('')}</div>`;
}

const pager = (kind, i, n, prevName, nextName) => `
  <div class="p-pager">
    <button data-page="${kind}:-1">${ICON.prev}<span><small>Previous</small>${esc(prevName)}</span></button>
    <span class="p-pager-n">${pad(i + 1)} / ${pad(n)}</span>
    <button data-page="${kind}:1"><span><small>Next</small>${esc(nextName)}</span>${ICON.next}</button>
  </div>`;

// ---------- Process & Gaps view ----------
export function processView() {
  const cols = `grid-template-columns: var(--pv-label) repeat(${STEPS.length}, minmax(0, 1fr))`;
  const row = (label, cells, cls = '') => `<div class="pv-row ${cls}" style="${cols}"><div class="pv-label">${label}</div>${cells}</div>`;
  const gaps = [...new Set(STEPS.map(s => s.gapLabel))];
  return `
    <div class="pv-inner">
      <header class="pv-head">
        <div>
          <div class="pv-eyebrow">Nine-stage operational loop</div>
          <h2 class="pv-title">Process &amp; Gaps</h2>
        </div>
        <p class="pv-lede">Each stage traces to a system requirement, and to the capability gap that blocks it today. Select any stage for the detail, or a zone to fly there.</p>
      </header>

      <div class="pv-table">
        ${row('OODA phase', PHASE_SPANS.map(({ p, from, n }) => `<div class="pv-phase" style="grid-column:${from + 2} / span ${n}"><span>${p}</span></div>`).join(''), 'pv-phases')}
        ${row('Stage', STEPS.map(s => `
          <button class="pv-card" data-stage="${s.k}" style="--i:${s.n}">
            <span class="pv-num">${pad(s.n)}</span>
            <span class="pv-card-title">${esc(s.title)}</span>
            <span class="pv-req">${esc(s.req)}</span>
            <span class="pv-gap" data-gap="${esc(s.gapLabel)}"><i></i>${esc(s.gapLabel.replace(/ gap$/, ''))}</span>
          </button>`).join(''), 'pv-cards')}
        ${row('', `<div class="pv-loop" style="grid-column:2 / -1"><span>${ICON.loop} Feedback closes the loop: new data and lessons learned update the models</span></div>`, 'pv-looprow')}
        <div class="pv-detail" id="pv-detail"></div>

        <div class="pv-section">Stakeholders</div>
        ${Object.entries(STAKE).map(([k, v]) => row(esc(v.name),
          STEPS.map(s => `<div class="pv-cell" data-stage="${s.k}">${s.stake.includes(k) ? '<i class="dot"></i>' : '<i class="nodot"></i>'}</div>`).join(''),
          'pv-mrow')).join('')}

        <div class="pv-section">Focus zones <small>select a zone to fly there</small></div>
        ${ZONES.map((z, i) => row(`<button class="pv-zone" data-zone="${z.k}"><b>${pad(i + 1)}</b>${esc(z.name)}</button>`,
          STEPS.map(s => `<div class="pv-cell" data-stage="${s.k}">${z.stages.includes(s.k) ? '<i class="dot zone"></i>' : '<i class="nodot"></i>'}</div>`).join(''),
          'pv-mrow pv-zrow')).join('')}
      </div>

      <div class="pv-gaps">
        <div class="pv-section">Capability gaps</div>
        <div class="pv-gap-list">
          ${gaps.map(gp => {
            const ss = STEPS.filter(s => s.gapLabel === gp);
            return `<button class="pv-gapcard" data-gap="${esc(gp)}"><span class="pv-gap-name"><i></i>${esc(gp)}</span><span class="pv-gap-text">${esc(ss[0].gapText)}</span><span class="pv-gap-stages">${ss.map(s => `<b>${pad(s.n)}</b>`).join('')}</span></button>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

// Full-width stage detail band used inside the Process & Gaps view.
export function stageDetail(k) {
  const s = stepBy[k];
  const zones = zonesForStage(k);
  return `
    <div class="pvd">
      <div class="pvd-head">
        <span class="pvd-num">${pad(s.n)}</span>
        <div><div class="p-eyebrow"><span>${s.ooda} phase</span></div>
        <h3 class="pvd-title">${esc(s.title)}</h3></div>
      </div>
      <div class="p-block req"><div class="p-block-top"><span class="tag">${esc(s.req)}</span><span class="lbl">Requirement</span></div><p>${esc(s.reqText)}</p></div>
      <div class="p-block gap"><div class="p-block-top"><span class="lbl">${esc(s.gapLabel)}</span></div><p>${esc(s.gapText)}</p></div>
      <div class="pvd-side">
        <h4 class="p-h">Stakeholders</h4>
        <div class="p-stake">${s.stake.map(x => `<span class="stake">${esc(STAKE[x].name)}</span>`).join('')}</div>
        <h4 class="p-h">Where it plays out</h4>
        <div class="p-stake">${zones.length ? zones.map(z => `<button class="stake stake-zone" data-zone="${z.k}"><i></i>${esc(z.name)}</button>`).join('') : '<span class="stake">Basin-wide</span>'}</div>
      </div>
      <button class="p-close icon-btn" data-act="close" title="Close (Esc)">${ICON.close}</button>
    </div>`;
}

// ---------- data hub / space / scenario panels ----------
export function hubPanel(nIn, nOut) {
  return `
    ${head('<span>Data flow</span><i></i><span>Concept node</span>', 'Basin Data Hub', `<div class="p-hub-hero"><span class="hb-hex"></span></div>`)}
    <p class="p-text">A shared data hub co-located with CICOS in Kinshasa. It ingests every observation, runs the fusion and forecast models, and pushes alerts and tasking back out. It's the architecture that closes the <b>Data Integration</b> and <b>Response Coordination</b> gaps.</p>
    <div class="p-stats">
      <div><b class="c-in">${nIn}</b><span>inbound feeds</span></div>
      <div><b class="c-out">${nOut}</b><span>outbound links</span></div>
      <div><b>9</b><span>stages served</span></div>
    </div>
    <div class="p-legend">
      <div><i class="lg-line flow-in"></i>Observations in</div>
      <div><i class="lg-line flow-out"></i>Alerts &amp; tasking out</div>
    </div>
    <h3 class="p-h">How it changes by stage</h3>
    <div class="p-chips">
      ${[['observe', 'Stages 1–4: data flows in'], ['forecast', 'Stages 5–6: hub fuses, forecasts, ranks'], ['deploy', 'Stages 7–8: alerts and tasking flow out'], ['feedback', 'Stage 9: everything loops back']]
        .map(([k, t]) => `<button class="chip chip-stage" data-stage="${k}"><b>${pad(stepBy[k].n)}</b><span>${t}</span>${ICON.arrow}</button>`).join('')}
    </div>`;
}

export function spacePanel(tleDate) {
  return `
    ${head('<span>Space segment</span><i></i><span>Live orbits</span>', 'Eyes in orbit')}
    <p class="p-text">Six real Earth-observation satellites, propagated from today's orbital elements. Radar sees through the basin's near-constant cloud, optical imagers map land cover, GPM measures rainfall, and SWOT measures river and lake heights.</p>
    <p class="p-text">The weather layer is NASA's latest global view: VIIRS true-colour clouds from yesterday, plus a looping GPM IMERG rainfall animation over the past day.</p>
    <h3 class="p-h">Tracked satellites</h3>
    <div class="sat-list" id="panel-sats"></div>
    <p class="p-foot">TLEs: CelesTrak, fetched ${tleDate}. Time runs ×90 so passes are visible live. Weather: NASA GIBS.</p>`;
}

export function satRows(sats, now) {
  const mins = d => Math.max(0, Math.round((d - now) / 60000));
  const fmtIn = m => (m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} m` : `${m} min`);
  return sats.map(s => `
    <div class="sat-row${s.over ? ' is-over' : ''}" style="--c:${s.color.toCssColorString()}">
      <i></i>
      <span class="sat-name"><b>${esc(s.name)}</b><small>${esc(s.role)}</small></span>
      <span class="sat-stat">${s.over ? '<em>Over basin</em>' : s.nextPass ? `in ${fmtIn(mins(s.nextPass))}` : '—'}<small>${s.pos ? `${fmt(Math.round(s.pos.h / 1000))} km` : ''}</small></span>
    </div>`).join('');
}

export function beatPanel(i, sc) {
  const b = sc.beats[i], s = stepBy[b.stage];
  return `
    ${head(`<span>Flood scenario</span><i></i><span>${b.t}</span>`, esc(b.title))}
    <button class="chip chip-stage p-beat-stage" data-stage="${s.k}"><b>${pad(s.n)}</b><span>${esc(s.title)} · ${s.ooda}</span>${ICON.arrow}</button>
    <p class="p-text">${esc(b.text)}</p>
    <h3 class="p-h">What the SoS does</h3>
    <ul class="p-list p-sos">${b.sos.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div class="p-block gap">
      <div class="p-block-top"><span class="lbl">Where today's gap bites · ${esc(s.gapLabel)}</span></div>
      <p>${esc(s.gapText)}</p>
    </div>
    <p class="p-foot">${esc(sc.note)}</p>
    ${pager('beat', i, sc.beats.length, sc.beats[(i + sc.beats.length - 1) % sc.beats.length].title, sc.beats[(i + 1) % sc.beats.length].title)}`;
}

export function scenarioBar(sc) {
  return `
    <button class="sc-play icon-btn" data-act="sc-play" title="Play / pause (K)"><span class="i-play">${ICON.play}</span><span class="i-pause">${ICON.pause}</span></button>
    <div class="sc-track">
      ${sc.beats.map((b, i) => `<button class="sc-beat" data-beat="${i}" title="${esc(b.title)}"><span class="sc-dot"><b>${stepBy[b.stage].n}</b></span><span class="sc-t">${b.t}</span></button>`).join('')}
      <div class="sc-line"><i id="sc-fill"></i></div>
    </div>
    <button class="icon-btn" data-act="sc-exit" title="Exit scenario">${ICON.close}</button>`;
}

// ---------- overlay dock + legend cards ----------
const OVERLAYS = [
  ['dataflow', 'Data flow', 'D', ICON.flow],
  ['sats', 'Satellites', 'S', ICON.orbit],
  ['weather', 'Weather', 'W', ICON.cloud],
  ['flow', 'River flow', 'R', ICON.wave],
  ['coverage', 'Coverage gaps', 'G', ICON.gap],
];
export function dock(layers) {
  return OVERLAYS.map(([k, t, key, ico]) => `
    <label class="dk" title="${t} (${key})"><input type="checkbox" data-layer="${k}" ${layers[k] ? 'checked' : ''}>
      <span class="dk-ico">${ico}</span><span class="dk-t">${t}</span><i class="dk-sw"></i></label>`).join('');
}

export function legendDataflow() {
  return `<div class="lg-card" data-card="dataflow">
    <div class="lg-h">Data flow</div>
    <div class="lg-row"><i class="lg-line flow-in"></i>Observations → hub</div>
    <div class="lg-row"><i class="lg-line flow-out"></i>Alerts &amp; tasking → field</div>
    <div class="lg-note">Follows the selected stage: 1–4 in · 5–6 hub · 7–8 out · 9 loop</div></div>`;
}
export function legendSats() {
  return `<div class="lg-card" data-card="sats"><div class="lg-h">Satellites <span class="lg-live">Live ×90</span></div><div class="sat-list compact" id="legend-sats"></div></div>`;
}
export function legendWeather(w) {
  return `<div class="lg-card" data-card="weather">
    <div class="lg-h">Weather <button class="lg-btn" data-act="wx-play" title="Play / pause rain loop"><span class="i-play">${ICON.play}</span><span class="i-pause">${ICON.pause}</span></button></div>
    <div class="lg-row"><span class="wx-k">Clouds</span>VIIRS true colour · ${w.cloudDay}</div>
    <div class="lg-row"><span class="wx-k">Rain</span>GPM IMERG · <b id="wx-time"></b></div>
    <div class="wx-ramp"><i></i><span>Light</span><span>Heavy</span></div></div>`;
}
export function legendCoverage(pct) {
  return `<div class="lg-card" data-card="coverage">
    <div class="lg-h">Coverage gaps</div>
    <div class="cv-ramp"><i></i><span>40 km</span><span>100</span><span>250+ km</span></div>
    <div class="lg-note">Distance to the nearest major road, a proxy for where ground sensors are hardest to install and maintain. <b>${pct}%</b> of the basin is more than 100 km from one.</div></div>`;
}

// ---------- misc ----------
export function layersPop(layers) {
  const items = [
    ['zones', 'Focus zones', 'HydroSHEDS sub-basins'],
    ['rivers', 'River network', 'HydroRIVERS · by discharge'],
    ['catchments', 'Catchment mesh', 'HydroBASINS level 6'],
    ['borders', 'National borders', 'Natural Earth'],
    ['labels', 'Place labels', 'Cities & rivers'],
    ['assets', 'All assets', 'Show every deployed asset'],
    ['mask', 'Focus mask', 'Dim outside the basin'],
    ['lighting', 'Sun lighting', 'Day / night terminator'],
  ];
  return `<div class="lp-head">Map layers</div>` + items.map(([k, t, d]) => `
    <label class="lp-row"><span><b>${t}</b><small>${d}</small></span>
      <input type="checkbox" data-layer="${k}" ${layers[k] ? 'checked' : ''}><i class="switch"></i></label>`).join('');
}

export function helpView() {
  const rows = [
    ['→ &nbsp;Space &nbsp;PgDn', 'Next briefing step'], ['← &nbsp;PgUp', 'Previous step'],
    ['1 – 9', 'Jump to a process stage'], ['H', 'Basin overview'], ['P', 'Toggle Process & Gaps'],
    ['D &nbsp;S &nbsp;W &nbsp;R &nbsp;G', 'Data flow · Satellites · Weather · River flow · Gaps'], ['K', 'Play / pause scenario'],
    ['L', 'Layers'], ['F', 'Fullscreen'], ['Esc', 'Close / free explore'],
    ['Drag · Scroll', 'Rotate · zoom the globe'], ['Ctrl + drag', 'Tilt the camera'],
  ];
  return `<div class="help-head"><span>Keyboard &amp; mouse</span><button class="icon-btn" data-act="help">${ICON.close}</button></div>
    <dl>${rows.map(([k, v]) => `<dt>${k.split(' &nbsp;').map(x => `<kbd>${x}</kbd>`).join('')}</dt><dd>${v}</dd>`).join('')}</dl>`;
}
