import './style.css';
import './overlays.css';
import { Cesium as C } from './cesium.js';
import { createGlobe, BASIN, ZONE_PROPS } from './globe.js';
import { STAGES, ZONES, ASSET_INFO, ZONE_GEO, CITIES, RIVER_LABELS } from './content.js';
import { ASSET_ICON, ICON, MARK } from './icons.js';
import { createRiverFlow } from './riverflow.js';
import { createDataFlow, HUB, STAGE_MODE, SENDS, RECEIVES } from './dataflow.js';
import { createOrbits } from './orbits.js';
import { createWeather } from './weather.js';
import { createCoverage, ACCESS } from './coverage.js';
import { createScenario, SCENARIO } from './scenario.js';
import tle from './data/tle.json';
import * as V from './views.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $('#app');

// ---------- static chrome ----------
$('#brand-mark').innerHTML = MARK;
const ACT_ICON = { prev: 'prev', next: 'next', home: 'home', layers: 'layers', fullscreen: 'expand', help: 'help' };
for (const b of $$('.topbar [data-act]')) b.innerHTML = ICON[ACT_ICON[b.dataset.act]];
$('.btn-play').innerHTML = ICON.play;
$('#zones-rail').innerHTML = V.zonesRail(ZONE_PROPS);
$('#process-rail').innerHTML = V.processRail();
$('#process-view').innerHTML = V.processView();
$('#scenario-bar').innerHTML = V.scenarioBar(SCENARIO);
$('#help').innerHTML = V.helpView();
$('#intro-stats').innerHTML = [
  [`${(BASIN.area_km2 / 1e6).toFixed(2)}M`, 'km² basin'],
  [BASIN.catchments, 'catchments mapped'],
  [ZONES.length, 'focus zones'],
  [STAGES.length, 'stage loop'],
].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');

// ---------- globe ----------
await document.fonts?.ready;
const globe = await createGlobe({ container: 'globe', creditContainer: $('#credits') });
globe.setSpace();
globe.spin(true);
$('#dock').innerHTML = V.dock(globe.layers);

// ---------- markers ----------
const layer = $('#markers');
const el = (html, cls) => {
  const d = document.createElement('div');
  d.className = `mk ${cls} is-hidden`;
  d.innerHTML = html;
  layer.appendChild(d);
  return d;
};

const zoneMarkers = {};
ZONES.forEach((z, i) => {
  const [lon, lat] = ZONE_GEO[z.k].anchor;
  const d = el(`<button class="zm${ZONE_GEO[z.k].side === 'l' ? ' side-l' : ''}" data-zone="${z.k}" aria-label="${z.name}">
      <span class="zm-pin"><span class="zm-ring"></span><b>${V.pad(i + 1)}</b></span>
      <span class="zm-label"><span class="zm-name">${z.name}</span><span class="zm-issue">${z.issue}</span></span>
    </button>`, 'mk-zone');
  zoneMarkers[z.k] = { d, h: globe.addMarker(d, lon, lat, 0, { maxAlt: 16_000_000 }) };
});

// Assets ring their zone's anchor; satellites sit in orbit with a sensing beam to the ground.
const assetMarkers = [];
ZONES.forEach(z => {
  const [lon, lat] = ZONE_GEO[z.k].anchor;
  const r = z.k === 'mouth' ? 0.95 : z.k === 'sangha' ? 1.15 : 1.5;
  const ground = z.assets.filter(a => a !== 'satellite');
  z.assets.forEach(a => {
    let mlon, mlat, h = 0, beam = null;
    if (a === 'satellite') {
      mlon = lon + 0.4; mlat = lat + 0.9; h = 420_000;
      beam = globe.addBeam([mlon, mlat, h], [lon, lat, 0]);
    } else {
      const j = ground.indexOf(a);
      const t = C.Math.toRadians(-150 + (j * 300) / Math.max(ground.length, 1) + 25);
      mlon = lon + r * Math.cos(t) * 1.15; mlat = lat + r * Math.sin(t);
    }
    const d = el(`<button class="am" data-asset="${a}" data-zone="${z.k}" aria-label="${ASSET_INFO[a].name}">
        <span class="am-ico">${ASSET_ICON[a]}</span><span class="am-label">${ASSET_INFO[a].name}</span></button>`, `mk-asset${a === 'satellite' ? ' is-orbit' : ''}`);
    const m = globe.addMarker(d, mlon, mlat, h, { maxAlt: 9_000_000 });
    m.on = false;
    assetMarkers.push({ z: z.k, a, m, beam, d, lon: mlon, lat: mlat, h });
  });
});

const labelMarkers = [
  ...CITIES.map(c => globe.addMarker(el(`<span class="cm-dot"></span><span class="cm-name">${c.name}</span>`, `mk-city side-${c.side || 'r'}`), c.lon, c.lat, 0, { maxAlt: 3_700_000 })),
  ...RIVER_LABELS.map(r => globe.addMarker(el(`<span>${r.name}</span>`, 'mk-river'), r.lon, r.lat, 0, { maxAlt: 3_700_000 })),
];

const hubEl = el(`<button class="hb" data-hub="1" aria-label="Basin Data Hub"><span class="hb-hex"><i></i></span>
  <span class="hb-label"><b>Basin Data Hub</b><em>CICOS · Kinshasa · concept</em></span></button>`, 'mk-hub');
const hubMk = globe.addMarker(hubEl, HUB.lon, HUB.lat, 0, { maxAlt: 16_000_000 });
hubMk.on = false;

// ---------- overlay modules ----------
createRiverFlow(globe);
const dataflow = createDataFlow(globe);
dataflow.setAssets(assetMarkers);
const orbits = await createOrbits(globe, { inBasin: globe.inBasin });
const weather = createWeather(globe);
await createCoverage(globe);
const scenario = createScenario(globe, { dataflow, makeMarker: el, hubEl });

// ---------- state ----------
const state = { view: 'globe', sel: null, hover: null, tour: 0, started: false, playing: false };

function syncDataflow() {
  const on = globe.layers.dataflow;
  hubMk.on = on || scenario.active;
  if (scenario.active) return;
  const sel = state.sel;
  const mode = sel?.type === 'stage' ? STAGE_MODE[sel.k] : 'all';
  dataflow.update({ on, mode, zone: sel?.type === 'zone' ? sel.k : null });
  hubEl.classList.toggle('is-busy', on && (mode === 'hub' || mode === 'loop'));
}

function applyHighlights() {
  const { sel, hover } = state;
  const zs = {};
  let linked = [];
  if (sel?.type === 'zone') {
    for (const z of ZONES) zs[z.k] = z.k === sel.k ? 'selected' : 'dim';
  } else if (sel?.type === 'beat') {
    for (const z of ZONES) zs[z.k] = z.k === 'ubangi' ? 'selected' : 'dim';
  } else if (sel?.type === 'stage') {
    linked = V.zonesForStage(sel.k).map(z => z.k);
  } else if (sel?.type === 'asset') {
    linked = V.zonesForAsset(sel.k).map(z => z.k);
  }
  if (linked.length) for (const z of ZONES) zs[z.k] = linked.includes(z.k) ? 'linked' : 'dim';
  if (hover && zs[hover] !== 'selected') zs[hover] = 'hover';
  globe.setZoneStates(zs);
  globe.setGlow(sel?.type === 'zone' ? sel.k : sel?.type === 'beat' ? 'ubangi' : null);

  for (const z of ZONES) {
    const s = zs[z.k] || 'idle';
    zoneMarkers[z.k].d.dataset.state = s;
    $(`.zr-item[data-zone="${z.k}"]`).dataset.state = s;
  }
  // Assets visible for the selected zone, the selected asset class, or the "all assets" layer.
  for (const am of assetMarkers) {
    const on = globe.layers.assets || (sel?.type === 'zone' && sel.k === am.z) || (sel?.type === 'asset' && sel.k === am.a)
      || (globe.layers.dataflow && !scenario.active && state.view === 'globe' && (!sel || ['stage', 'hub', 'basin'].includes(sel.type)));
    am.m.on = on;
    if (am.beam) am.beam.show = on;
    am.d.classList.toggle('is-active', sel?.type === 'asset' && sel.k === am.a);
    am.d.classList.toggle('is-mini', !(sel?.type === 'zone' && sel.k === am.z) && !(sel?.type === 'asset' && sel.k === am.a));
  }
  for (const m of labelMarkers) m.on = globe.layers.labels;
  syncDataflow();

  // Process rail + process view
  const zoneStages = sel?.type === 'zone' ? V.zoneBy[sel.k].stages : [];
  for (const n of $$('.pr-node, .pv-card')) {
    n.classList.toggle('is-active', sel?.type === 'stage' && sel.k === n.dataset.stage);
    n.classList.toggle('is-linked', zoneStages.includes(n.dataset.stage));
  }
  const ai = sel?.type === 'stage' ? STAGES.findIndex(s => s.k === sel.k) : -1;
  $('#process-rail').style.setProperty('--progress', ai < 0 ? 0 : ai / (STAGES.length - 1));
  $('#process-rail').classList.toggle('has-active', ai >= 0);
  $('.pr-loop').classList.toggle('is-active', sel?.type === 'stage' && sel.k === 'feedback');
  $('#pr-caption').innerHTML = V.railCaption(sel);
  for (const c of $$('.pv-cell')) c.classList.toggle('is-col', sel?.type === 'stage' && c.dataset.stage === sel.k);
  for (const r of $$('.pv-zone')) r.classList.toggle('is-active', sel?.type === 'zone' && r.dataset.zone === sel.k);
  for (const b of $$('.sc-beat')) {
    const i = +b.dataset.beat;
    b.classList.toggle('is-active', sel?.type === 'beat' && sel.k === i);
    b.classList.toggle('is-done', sel?.type === 'beat' && i < sel.k);
  }
}

// ---------- panel ----------
const panel = $('#panel');
function renderPanel() {
  const { sel } = state;
  const det = $('#pv-detail');
  const detHtml = sel?.type === 'stage' ? V.stageDetail(sel.k) : '';
  if (det.dataset.k !== (detHtml ? sel.k : '')) {
    det.innerHTML = detHtml;
    det.dataset.k = detHtml ? sel.k : '';
    det.classList.toggle('is-open', !!detHtml);
  }
  let html = '';
  if (sel?.type === 'basin') html = V.basinPanel(BASIN, ZONE_PROPS);
  else if (sel?.type === 'zone') html = V.zonePanel(sel.k, ZONE_PROPS, BASIN);
  else if (sel?.type === 'stage') html = V.stagePanel(sel.k);
  else if (sel?.type === 'asset') html = V.assetPanel(sel.k);
  else if (sel?.type === 'hub') html = V.hubPanel(assetMarkers.filter(a => SENDS.has(a.a)).length, assetMarkers.filter(a => RECEIVES.has(a.a)).length);
  else if (sel?.type === 'space') html = V.spacePanel(tle.fetched);
  else if (sel?.type === 'beat') html = V.beatPanel(sel.k, SCENARIO);
  if (html) {
    panel.classList.remove('is-swap');
    void panel.offsetWidth;
    panel.innerHTML = `<div class="p-inner">${html}</div>`;
    panel.classList.add('is-open', 'is-swap');
    panel.scrollTop = 0;
    renderSats();
  } else {
    panel.classList.remove('is-open');
  }
  app.classList.toggle('has-panel', !!html);
}

// ---------- selection ----------
function select(sel, { fly = true } = {}) {
  if (sel?.type !== 'beat' && state.view === 'scenario') leaveScenario();
  state.sel = sel;
  const flies = sel && fly && state.view === 'globe';
  hideIntro(!flies);
  if (flies) {
    if (sel.type === 'zone') globe.flyToZone(sel.k);
    else if (sel.type === 'space') globe.flySpace();
    else if (sel.type !== 'beat') globe.flyHome();
  }
  renderPanel();
  applyHighlights();
}

// ---------- views ----------
function setView(v) {
  if (state.view === 'scenario' && v !== 'scenario') leaveScenario();
  setViewDom(v);
  if (v !== 'globe') hideIntro();
}
function setViewDom(v) {
  state.view = v;
  app.dataset.view = v;
  for (const t of $$('.tabs [data-view]')) t.setAttribute('aria-selected', t.dataset.view === v);
  moveInk();
}
function moveInk() {
  const t = $(`.tabs [data-view="${state.view}"]`), ink = $('.tabs-ink');
  if (t) Object.assign(ink.style, { width: `${t.offsetWidth}px`, transform: `translateX(${t.offsetLeft - 4}px)` });
}
window.addEventListener('resize', moveInk);

// ---------- flood scenario ----------
const BEAT_SECS = 9;
let beatClock = 0;
function enterBeat(i) {
  i = Math.max(0, Math.min(SCENARIO.beats.length - 1, i));
  if (state.view !== 'scenario') setView('scenario');
  scenario.enter(i);
  beatClock = performance.now();
  state.sel = { type: 'beat', k: i };
  hideIntro(false);
  renderPanel();
  applyHighlights();
}
function leaveScenario() {
  if (!scenario.active) return;
  setPlaying(false);
  scenario.exit();
  if (state.sel?.type === 'beat') state.sel = null;
  setViewDom('globe');
  syncDataflow();
}
function setPlaying(p) {
  state.playing = p;
  app.classList.toggle('is-playing', p);
  beatClock = performance.now();
}
globe.onTick(() => {
  if (state.view !== 'scenario' || state.sel?.type !== 'beat') return;
  const n = SCENARIO.beats.length, i = state.sel.k;
  const k = state.playing ? Math.min((performance.now() - beatClock) / (BEAT_SECS * 1000), 1) : 0;
  $('#sc-fill').style.transform = `scaleX(${(i + k) / (n - 1)})`;
  if (state.playing && k >= 1) {
    if (i < n - 1) { enterBeat(i + 1); syncTour(); } else setPlaying(false);
  }
});

// ---------- overlays (dock, legend cards) ----------
function setLayer(k, on) {
  globe.layers[k] = on;
  for (const i of $$(`input[data-layer="${k}"]`)) i.checked = on;
  renderLegend();
  applyHighlights();
}
function renderLegend() {
  const L = globe.layers;
  $('#legend').innerHTML = [
    L.dataflow && V.legendDataflow(),
    L.sats && V.legendSats(),
    L.weather && V.legendWeather(weather),
    L.coverage && V.legendCoverage(ACCESS.pctOver100),
  ].filter(Boolean).join('');
  app.classList.toggle('has-legend', !!$('#legend').children.length);
  renderSats();
  const t = $('#wx-time');
  if (t) t.textContent = fmtUTC(weather.current);
  app.classList.toggle('wx-paused', !weather.playing);
}
const fmtUTC = d => `${d.toISOString().slice(5, 10).replace('-', '/')} ${d.toISOString().slice(11, 16)} UTC`;
function renderSats() {
  const now = orbits.simNow();
  for (const id of ['#legend-sats', '#panel-sats']) {
    const n = $(id);
    if (n) n.innerHTML = V.satRows(orbits.sats, now);
  }
}
let lastSatRender = 0;
orbits.onUpdate(() => {
  if (performance.now() - lastSatRender < 1000) return;
  lastSatRender = performance.now();
  renderSats();
});
weather.onFrame(t => { const n = $('#wx-time'); if (n) n.textContent = fmtUTC(t); });

// ---------- intro ----------
// Leaving the title card: cinematic fly-in, unless a selection is about to fly the camera itself.
function hideIntro(flyIn = true) {
  if (!app.classList.contains('is-intro')) return;
  app.classList.remove('is-intro');
  globe.spin(false);
  if (!state.started) {
    state.started = true;
    if (flyIn) globe.flyIntro();
    else globe.setOverlays(true);
  }
}
function showIntro() {
  select(null, { fly: false });
  setView('globe');
  app.classList.add('is-intro');
  state.started = false;
  globe.setOverlays(false);
  globe.camera.flyTo({
    destination: C.Cartesian3.fromDegrees(-4, 5, 21_000_000), duration: 2.4,
    complete: () => app.classList.contains('is-intro') && globe.spin(true),
  });
}

// ---------- presenter tour ----------
// Each chapter sets a sensible overlay preset when reached through the tour.
const PRESET = {
  base:     { dataflow: false, sats: false, weather: false },
  space:    { dataflow: false, sats: true, weather: true },
  process:  { dataflow: true, sats: false, weather: false },
  scenario: { dataflow: false, sats: false, weather: false },
};
const TOUR = [
  { ch: 'Intro', run: showIntro },
  { ch: 'The Basin', preset: 'base', run: () => { setView('globe'); select({ type: 'basin' }); } },
  ...ZONES.map(z => ({ ch: 'Focus Zones', preset: 'base', run: () => { setView('globe'); select({ type: 'zone', k: z.k }); } })),
  { ch: 'Space Segment', preset: 'space', run: () => { setView('globe'); select({ type: 'space' }); } },
  ...STAGES.map(s => ({ ch: 'The Process', preset: 'process', run: () => { setView('globe'); select({ type: 'stage', k: s.k }); } })),
  ...SCENARIO.beats.map((b, i) => ({ ch: 'Flood Scenario', preset: 'scenario', run: () => enterBeat(i) })),
  { ch: 'Process & Gaps', run: () => { select(null, { fly: false }); setView('process'); } },
];
const CHAPTERS = [...new Set(TOUR.map(t => t.ch))];
const TOUR_AT = { basin: 1, zone: 2, space: 2 + ZONES.length, stage: 3 + ZONES.length, beat: 3 + ZONES.length + STAGES.length };

function go(i) {
  i = Math.max(0, Math.min(TOUR.length - 1, i));
  const prevCh = TOUR[state.tour]?.ch;
  state.tour = i;
  const step = TOUR[i];
  if (step.preset && step.ch !== prevCh) for (const [k, v] of Object.entries(PRESET[step.preset])) if (globe.layers[k] !== v) setLayer(k, v);
  if (i === 1 && !state.started) {
    setView('globe');
    hideIntro(true);
    select({ type: 'basin' }, { fly: false });
  } else step.run();
  updateTourUI();
  if (step.ch !== prevCh && i > 0) toast(`${V.pad(CHAPTERS.indexOf(step.ch))}`, step.ch);
}
function updateTourUI() {
  $('#tour-chapter').textContent = TOUR[state.tour].ch;
  $('#tour-count').textContent = `${V.pad(state.tour)} / ${V.pad(TOUR.length - 1)}`;
  $('#tour-bar').style.transform = `scaleX(${state.tour / (TOUR.length - 1)})`;
}
let toastT;
function toast(n, text) {
  const t = $('#toast');
  t.innerHTML = `<span>${n}</span>${text}`;
  t.classList.remove('is-on'); void t.offsetWidth; t.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 1900);
}

// Keep the tour cursor in sync when the presenter clicks around freely.
function syncTour() {
  const { sel, view } = state;
  let i = -1;
  if (view === 'process' && !sel) i = TOUR.length - 1;
  else if (sel?.type === 'basin') i = TOUR_AT.basin;
  else if (sel?.type === 'space') i = TOUR_AT.space;
  else if (sel?.type === 'zone') i = TOUR_AT.zone + V.zoneIndex(sel.k);
  else if (sel?.type === 'stage') i = TOUR_AT.stage + STAGES.findIndex(s => s.k === sel.k);
  else if (sel?.type === 'beat') i = TOUR_AT.beat + sel.k;
  if (i >= 0) { state.tour = i; updateTourUI(); }
}

// ---------- events ----------
document.addEventListener('click', e => {
  if (e.target.closest('summary, label')) return;
  const t = e.target.closest('button, [data-zone], [data-stage], [data-act], [data-view], [data-page]');
  if (!t) return;
  const d = t.dataset;

  if (d.act) {
    switch (d.act) {
      case 'begin': go(1); return;
      case 'explore': explore(); return;
      case 'next': go(state.tour + 1); return;
      case 'prev': go(state.tour - 1); return;
      case 'home': setView('globe'); select({ type: 'basin' }); syncTour(); return;
      case 'close': select(null, { fly: false }); return;
      case 'layers': toggle('#layers-pop'); return;
      case 'help': toggle('#help'); return;
      case 'fullscreen': fullscreen(); return;
      case 'sc-play': setPlaying(!state.playing); return;
      case 'sc-exit': setView('globe'); select({ type: 'basin' }); syncTour(); return;
      case 'wx-play': weather.toggle(); app.classList.toggle('wx-paused', !weather.playing); return;
    }
  }
  if (d.view) {
    if (d.view === 'scenario') { enterBeat(0); syncTour(); return; }
    setView(d.view);
    if (d.view === 'process' && state.sel?.type !== 'stage') select(null, { fly: false });
    syncTour(); return;
  }
  if (d.beat) { enterBeat(+d.beat); syncTour(); return; }
  if (d.hub) { select({ type: 'hub' }); return; }
  if (d.page) {
    const [kind, dir] = d.page.split(':');
    if (kind === 'beat') { enterBeat((state.sel.k + +dir + SCENARIO.beats.length) % SCENARIO.beats.length); syncTour(); return; }
    const list = kind === 'zone' ? ZONES : STAGES;
    const i = list.findIndex(x => x.k === state.sel.k);
    select({ type: kind, k: list[(i + +dir + list.length) % list.length].k });
    syncTour(); return;
  }
  if (d.gap) {
    const s = STAGES.find(x => x.gapLabel === d.gap);
    select({ type: 'stage', k: s.k }, { fly: false }); syncTour(); return;
  }
  if (d.asset && (t.classList.contains('asset-more') || t.classList.contains('am'))) {
    if (t.classList.contains('am') && state.sel?.type === 'zone') { openAssetInPanel(d.asset); return; }
    select({ type: 'asset', k: d.asset }); return;
  }
  if (d.zone) {
    if (state.view !== 'globe') setView('globe');
    select({ type: 'zone', k: d.zone }); syncTour(); return;
  }
  if (d.stage) {
    if (state.view === 'scenario') setView('globe');
    select({ type: 'stage', k: d.stage }, { fly: state.view === 'globe' }); syncTour(); return;
  }
});

// Clicking an asset marker while its zone is open expands that asset in the panel.
function openAssetInPanel(a) {
  const det = $(`.asset[data-asset="${a}"]`, panel);
  if (!det) return;
  det.open = true;
  det.scrollIntoView({ behavior: 'smooth', block: 'center' });
  det.classList.remove('is-flash'); void det.offsetWidth; det.classList.add('is-flash');
}

function explore() {
  state.tour = 1; updateTourUI();
  select(null, { fly: false });
  hideIntro();
}
function toggle(sel) {
  const n = $(sel);
  n.hidden = !n.hidden;
  if (sel === '#layers-pop' && !n.hidden) n.innerHTML = V.layersPop(globe.layers);
}
function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
for (const box of ['#layers-pop', '#dock']) {
  $(box).addEventListener('change', e => {
    const k = e.target.dataset.layer;
    if (k) setLayer(k, e.target.checked);
  });
}
document.addEventListener('pointerdown', e => {
  for (const s of ['#layers-pop', '#help']) {
    const n = $(s);
    if (!n.hidden && !n.contains(e.target) && !e.target.closest('[data-act="layers"],[data-act="help"]')) n.hidden = true;
  }
});

// Globe hover + click
const canvas = globe.scene.canvas;
const tip = $('#hover-tip');
let moveRaf = 0, lastMove = null;
canvas.addEventListener('pointermove', e => {
  lastMove = e;
  if (moveRaf) return;
  moveRaf = requestAnimationFrame(() => {
    moveRaf = 0;
    const r = canvas.getBoundingClientRect();
    const p = new C.Cartesian2(lastMove.clientX - r.left, lastMove.clientY - r.top);
    const ll = globe.lonLatAt(p);
    hud(ll);
    const k = app.classList.contains('is-intro') || lastMove.buttons || state.view === 'scenario' ? null : globe.zoneAt(p);
    if (k !== state.hover) { state.hover = k; applyHighlights(); }
    canvas.style.cursor = k ? 'pointer' : '';
    if (k) {
      tip.innerHTML = `<b>${V.zoneBy[k].name}</b><span>${V.zoneBy[k].issue}</span>`;
      tip.style.transform = `translate3d(${lastMove.clientX + 16}px, ${lastMove.clientY + 14}px, 0)`;
      tip.classList.add('is-on');
    } else tip.classList.remove('is-on');
  });
});
canvas.addEventListener('pointerleave', () => { state.hover = null; tip.classList.remove('is-on'); applyHighlights(); });
let downAt = null;
canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; globe.spin(false); });
canvas.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5 || app.classList.contains('is-intro') || state.view === 'scenario') return;
  const r = canvas.getBoundingClientRect();
  const p = new C.Cartesian2(e.clientX - r.left, e.clientY - r.top);
  const k = globe.zoneAt(p);
  if (k) { select({ type: 'zone', k }); syncTour(); }
  else if (globe.inBasin(globe.lonLatAt(p))) { select({ type: 'basin' }, { fly: false }); syncTour(); }
  else if (state.sel) select(null, { fly: false });
});

// HUD
const hudEl = $('#hud');
let lastLL = null;
function hud(ll = lastLL) {
  lastLL = ll;
  const h = globe.camera.positionCartographic.height / 1000;
  const f = (v, p, n) => `${Math.abs(v).toFixed(3)}°${v >= 0 ? p : n}`;
  hudEl.innerHTML = `
    <span><i>LAT</i>${ll ? f(ll[1], 'N', 'S') : '——'}</span>
    <span><i>LON</i>${ll ? f(ll[0], 'E', 'W') : '——'}</span>
    <span><i>ALT</i>${V.fmt(Math.round(h))} km</span>`;
}
globe.camera.changed.addEventListener(() => hud());
globe.camera.percentageChanged = 0.01;
hud();

// Keyboard (presentation clickers send PageUp/PageDown or arrows)
const LAYER_KEYS = { d: 'dataflow', s: 'sats', w: 'weather', r: 'flow', g: 'coverage' };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key, lk = k.toLowerCase();
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); go(state.tour + 1); }
  else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); go(state.tour - 1); }
  else if (k === 'Escape') {
    if (!$('#help').hidden) $('#help').hidden = true;
    else if (!$('#layers-pop').hidden) $('#layers-pop').hidden = true;
    else if (app.classList.contains('is-intro')) explore();
    else if (state.view === 'scenario') { setView('globe'); select({ type: 'basin' }); syncTour(); }
    else if (state.sel) select(null, { fly: false });
    else if (state.view === 'process') setView('globe');
  }
  else if (/^[1-9]$/.test(k)) {
    if (state.view === 'scenario') setView('globe');
    select({ type: 'stage', k: STAGES[+k - 1].k }, { fly: state.view === 'globe' }); syncTour();
  }
  else if (lk === 'h') { setView('globe'); select({ type: 'basin' }); syncTour(); }
  else if (lk === 'p') { setView(state.view === 'process' ? 'globe' : 'process'); syncTour(); }
  else if (lk === 'k') { if (state.view === 'scenario') setPlaying(!state.playing); else { enterBeat(0); syncTour(); setPlaying(true); } }
  else if (LAYER_KEYS[lk]) setLayer(LAYER_KEYS[lk], !globe.layers[LAYER_KEYS[lk]]);
  else if (lk === 'l') toggle('#layers-pop');
  else if (lk === 'f') fullscreen();
  else if (k === '?') toggle('#help');
});

setView('globe');
applyHighlights();
renderLegend();
updateTourUI();
requestAnimationFrame(() => { moveInk(); app.classList.add('is-ready'); });
window.__conops = { globe, state, go, select, orbits, scenario, dataflow };
