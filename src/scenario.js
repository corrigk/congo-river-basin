// Flood scenario playback: an illustrative Upper-Ubangi flood walked through the nine Con Ops stages.
// Timings and magnitudes are notional; geography (river reach, gauges, towns) is real.
import { Cesium as C } from './cesium.js';
import { FLOW_CHAINS } from './riverflow.js';
import { HUB } from './dataflow.js';
import { kmBetween, resample } from './fx.js';
import { ASSET_ICON } from './icons.js';
import { token } from './theme.js';

export const SCENARIO = {
  title: 'Flood event · Upper Ubangi',
  note: 'Illustrative scenario. Timings and magnitudes are notional; river reach, gauges and towns are real.',
  beats: [
    { t: 'T−72 h', stage: 'observe', cam: 'upper', title: 'Heavy rain builds over the upper Ubangi',
      text: 'Precipitation radar and IMERG rainfall estimates flag an intense, slow-moving storm system over the Mbomou–Uele headwaters.',
      sos: ['GPM precipitation radar pass over the headwaters', 'Meteorological stations confirm rainfall totals'] },
    { t: 'T−60 h', stage: 'collect', cam: 'ubangi', title: 'River gauges start to rise',
      text: 'Gauges at Mobaye and Bangui report a rising stage. Residents and rangers report tributaries overtopping their banks.',
      sos: ['Hydrological gauges stream stage readings', 'Community reports geolocated and time-stamped'] },
    { t: 'T−48 h', stage: 'integrate', cam: 'wide', title: 'Observations fused at the Basin Data Hub',
      text: 'Satellite, gauge and community data from across the basin are quality-checked and merged into one common operating picture.',
      sos: ['Common basin-wide data architecture', 'Automated QA/QC and cross-validation'] },
    { t: 'T−40 h', stage: 'assess', cam: 'bangui', title: 'Radar maps early inundation',
      text: 'A Sentinel-1 SAR pass sees through the cloud cover and maps water already out of bank upstream of Bangui.',
      sos: ['SAR flood-extent mapping', 'Current conditions compared against the seasonal baseline'] },
    { t: 'T−36 h', stage: 'forecast', cam: 'bangui', title: 'Flood crest forecast for Bangui',
      text: 'Hydrological models driven by the fused data forecast the crest reaching Bangui in about a day and a half, with a much wider footprint.',
      sos: ['Rainfall–runoff and river routing models', 'Probabilistic inundation footprint'] },
    { t: 'T−30 h', stage: 'prioritize', cam: 'ubangi', title: 'At-risk communities ranked',
      text: 'Populations, infrastructure and river traffic inside the forecast footprint are ranked. Bangui’s riverside districts come first.',
      sos: ['Exposure overlay: people, roads, ports', 'Localized risk maps and priority list'] },
    { t: 'T−24 h', stage: 'deploy', cam: 'wide', title: 'Alerts and counter-measures go out',
      text: 'Localized alerts reach communities, ministries and CICOS. Patrol vessels and UAVs are tasked toward Bangui.',
      sos: ['Multi-channel alerts to communities', 'Vessels and UAVs tasked from the hub'] },
    { t: 'T 0', stage: 'support', cam: 'bangui', title: 'Crest arrives, response supported',
      text: 'Vessels and teams are in position as the crest passes, and the SoS keeps refreshing extent maps for responders on the ground.',
      sos: ['Near-real-time extent updates', 'Shared picture for agencies and NGOs'] },
    { t: 'T+7 d', stage: 'feedback', cam: 'wide', title: 'Lessons fed back into the models',
      text: 'Post-event radar mapping and gauge records are compared with the forecast, and models and alert thresholds are recalibrated.',
      sos: ['Forecast vs. observed verification', 'Model and threshold recalibration'] },
  ],
};

const CAMS = {
  upper:  { box: [18.5, 2.0, 27.5, 8.2], pitch: -52, scale: 2.1 },
  ubangi: { box: [16.6, 0.8, 24.6, 6.8], pitch: -55, scale: 2.1 },
  bangui: { box: [17.2, 2.4, 20.4, 5.4], pitch: -50, scale: 2.4 },
  wide:   { box: [12.5, -6.5, 26.0, 8.0], pitch: -60, scale: 2.0 },
};

const PLACES = {
  bangui: [18.56, 4.37], mobaye: [21.18, 4.32], mongoumba: [18.60, 3.64], impfondo: [18.06, 1.62],
};

// The real Ubangi main stem from HydroRIVERS (the chain passing Bangui), upstream → downstream.
function ubangiReach() {
  const near = (c, [x, y]) => Math.min(...c.map(p => kmBetween(p, [x, y])));
  const ch = FLOW_CHAINS.filter(c => near(c.c, PLACES.bangui) < 25).sort((a, b) => b.q - a.q)[0];
  const pts = resample(ch.c, 4);
  const idx = pt => pts.reduce((bi, p, i) => (kmBetween(p, pt) < kmBetween(pts[bi], pt) ? i : bi), 0);
  return { pts, idx };
}

export function createScenario(globe, { dataflow, makeMarker, hubEl }) {
  const { pts, idx } = ubangiReach();
  const iB = idx(PLACES.bangui), iIm = idx(PLACES.impfondo);
  const reach = (a, b) => pts.slice(Math.min(a, b), Math.max(a, b) + 1);
  const floodPath = reach(idx([19.25, 4.25]), idx([18.35, 3.2]));

  // ---- faded map elements (alpha animated toward a per-beat target) ----
  const fx = [];
  function fading(entity) {
    const f = { entity, a: 0, target: 0 };
    fx.push(f);
    return f;
  }
  const colorProp = (f, base) => new C.ColorMaterialProperty(new C.CallbackProperty(() => base.withAlpha(base.alpha * f.a), false));
  function corridor(path, widthM, css, alpha) {
    const f = fading(null);
    const base = C.Color.fromCssColorString(css).withAlpha(alpha);
    f.entity = globe.viewer.entities.add({
      show: false,
      corridor: { positions: C.Cartesian3.fromDegreesArray(path.flat()), width: widthM, material: colorProp(f, base), cornerType: C.CornerType.ROUNDED },
    });
    return f;
  }
  function swath(from, to, widthM, css) {
    const line = resample([from, to], 20);
    return corridor(line, widthM, css, 0.22);
  }
  function storm(lon, lat, a, b) {
    const f = fading(null);
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(210,225,255,0.95)'); grad.addColorStop(0.35, 'rgba(150,175,255,0.7)');
    grad.addColorStop(0.7, 'rgba(110,140,230,0.25)'); grad.addColorStop(1, 'rgba(110,140,230,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    f.entity = globe.viewer.entities.add({
      show: false, position: C.Cartesian3.fromDegrees(lon, lat),
      ellipse: {
        semiMajorAxis: a, semiMinorAxis: b, rotation: 0.4,
        material: new C.ImageMaterialProperty({ image: cv, transparent: true,
          color: new C.CallbackProperty(() => C.Color.WHITE.withAlpha(f.a * (0.75 + 0.25 * Math.sin(performance.now() / 500))), false) }),
      },
    });
    return f;
  }

  const els = {
    storm1: storm(24.2, 5.6, 330_000, 210_000),
    storm2: storm(22.6, 6.3, 220_000, 150_000),
    gpmSwath: swath([25.6, 11], [22.4, -1], 245_000, token('precip')),
    sarSwath: swath([20.4, 9], [18.2, -1.5], 250_000, token('river')),
    observed: corridor(floodPath, 9_000, token('river'), 0.55),
    forecast: corridor(floodPath, 26_000, token('rust-hi'), 0.35),
    peak: corridor(floodPath, 30_000, token('rust-hi'), 0.55),
  };

  // ---- HTML markers ----
  const mk = (html, cls, [lon, lat], h = 0) => {
    const d = makeMarker(html, cls);
    const m = globe.addMarker(d, lon, lat, h, { maxAlt: 12_000_000 });
    m.on = false;
    return { d, m };
  };
  const gauges = [
    mk('<span class="gg-ring"></span><span class="gg-dot"></span><span class="gg-label"><b>Bangui gauge</b><em></em></span>', 'mk-gauge', PLACES.bangui),
    mk('<span class="gg-ring"></span><span class="gg-dot"></span><span class="gg-label"><b>Mobaye gauge</b><em></em></span>', 'mk-gauge', PLACES.mobaye),
  ];
  const risks = [
    mk('<span class="rk-ring"></span><span class="rk-label"><b>1</b>Bangui riverside</span>', 'mk-risk', PLACES.bangui),
    mk('<span class="rk-ring"></span><span class="rk-label"><b>2</b>Mongoumba</span>', 'mk-risk', PLACES.mongoumba),
    mk('<span class="rk-ring"></span><span class="rk-label"><b>3</b>Mobaye</span>', 'mk-risk', PLACES.mobaye),
  ];
  const stormLabel = mk('<span class="st-label">Storm cell · intense rainfall</span>', 'mk-storm', [23.6, 7.6]);
  const vessels = [0, 1].map(i => mk(`<span class="vs-ico">${ASSET_ICON.water}</span>`, 'mk-vessel', PLACES.impfondo));
  const vesselPath = reach(iIm, iB).reverse(); // travel upstream from Impfondo to Bangui
  const passSat = mk(`<span class="ps-ico">${ASSET_ICON.satellite}</span><span class="ps-label"></span>`, 'mk-pass', [20, 9], 700_000);

  // ---- per-beat state ----
  const G = PLACES;
  const SAT_ORBIT = [19.3, 3.8, 700_000];
  const plan = [
    { storm: 1, gpm: 1, pass: 'gpm' },
    { storm: 0.5, gauges: 'rising', links: [[G.mobaye, 'in'], [G.bangui, 'in'], [[20.2, 5.4], 'in']] },
    { gauges: 'rising', network: 'in', hub: true },
    { gauges: 'rising', sar: 1, pass: 'sar', observed: 1 },
    { gauges: 'alert', observed: 1, forecast: 1, hub: true },
    { gauges: 'alert', forecast: 1, risks: true },
    { gauges: 'alert', forecast: 0.6, network: 'out', vessels: [0, 0.65], links: [[G.bangui, 'out'], [G.mongoumba, 'out'], [G.mobaye, 'out']] },
    { gauges: 'alert', peak: 1, vessels: [0.65, 1], risks: true },
    { gauges: 'rising', observed: 0.6, sar: 0.6, hub: true, links: [[G.bangui, 'in'], [G.mobaye, 'in'], [SAT_ORBIT, 'feedback']] },
  ];

  let active = false, beat = -1, beatStart = 0;
  function apply(i) {
    beat = i; beatStart = performance.now();
    const p = active ? plan[i] : {};
    els.storm1.target = els.storm2.target = p.storm || 0;
    els.gpmSwath.target = p.gpm || 0;
    els.sarSwath.target = p.sar || 0;
    els.observed.target = p.observed || 0;
    els.forecast.target = p.forecast || 0;
    els.peak.target = p.peak || 0;
    stormLabel.m.on = !!p.storm;
    for (const g of gauges) {
      g.m.on = !!p.gauges;
      g.d.dataset.state = p.gauges || '';
      g.d.querySelector('em').textContent = p.gauges === 'alert' ? 'Above flood stage' : 'Stage rising';
    }
    risks.forEach(r => { r.m.on = !!p.risks; });
    vessels.forEach(v => { v.m.on = !!p.vessels; });
    passSat.m.on = !!p.pass;
    passSat.d.dataset.kind = p.pass || '';
    passSat.d.querySelector('.ps-label').textContent = p.pass === 'gpm' ? 'GPM Core · precipitation radar' : 'Sentinel-1 · SAR';
    hubEl.classList.toggle('is-busy', !!p.hub);

    dataflow.clearCustom();
    const hub = [HUB.lon, HUB.lat, 0];
    for (const [pt, dir] of p.links || []) {
      if (dir === 'in') dataflow.addCustom([pt[0], pt[1], pt[2] || 0], hub, 'in');
      else if (dir === 'out') dataflow.addCustom(hub, [pt[0], pt[1], 0], 'out');
      else dataflow.addCustom(hub, [pt[0], pt[1], pt[2] || 0], 'out'); // feedback: retask / model update
    }
    dataflow.update({ on: active && !!p.network, mode: p.network || 'all', zone: null });
    if (active) {
      const cam = CAMS[SCENARIO.beats[i].cam];
      globe.flyToBox(cam.box, { pitch: cam.pitch, scale: cam.scale, shift: 0.16, duration: 2.2 });
    }
  }

  const along = (path, f) => {
    const x = Math.max(0, Math.min(1, f)) * (path.length - 1);
    const i = Math.floor(x), t = x - i, a = path[i], b = path[Math.min(i + 1, path.length - 1)];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };

  globe.onTick((secs, { overlay }) => {
    for (const f of fx) {
      f.a += (f.target * overlay - f.a) * 0.06;
      const show = f.a > 0.01;
      if (f.entity.show !== show) f.entity.show = show;
    }
    if (!active) return;
    const p = plan[beat] || {};
    const k = Math.min((performance.now() - beatStart) / 6500, 1);
    const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (p.vessels) {
      const [a, b] = p.vessels;
      vessels.forEach((v, i) => {
        const [x, y] = along(vesselPath, a + (b - a) * ease - i * 0.06);
        v.m.setPos(x + i * 0.05, y, 0);
      });
    }
    if (p.pass) {
      const [from, to] = p.pass === 'gpm' ? [[25.6, 11], [22.4, -1]] : [[20.4, 9], [18.2, -1.5]];
      const [x, y] = along([from, to], ease);
      passSat.m.setPos(x, y, 700_000);
    }
  });

  return {
    get active() { return active; },
    get beat() { return beat; },
    enter(i) { active = true; apply(i); },
    exit() { active = false; apply(0); beat = -1; },
  };
}
