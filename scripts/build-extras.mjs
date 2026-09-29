// Extra overlays for the globe (run after build-data.mjs):
//   flow.json    — HydroRIVERS main-stem chains, ordered upstream → downstream (river-flow animation)
//   tle.json     — current two-line elements for the observation satellites (CelesTrak)
//   access.json  — distance-to-nearest-major-road grid over the basin (coverage-gap proxy, Natural Earth roads)
//
//   RAW=<dir with rivers/ unzipped> node scripts/build-extras.mjs

import mapshaper from 'mapshaper';
import fs from 'node:fs';
import path from 'node:path';

const RAW = process.env.RAW;
if (!RAW) throw new Error('Set RAW to the folder containing rivers/');
const OUT = path.resolve('src/data');
const write = (name, obj) => {
  const s = JSON.stringify(obj);
  fs.writeFileSync(path.join(OUT, name), s);
  console.log(`  ${name.padEnd(14)} ${(s.length / 1024).toFixed(0)} KB`);
};
const basin = JSON.parse(fs.readFileSync(path.join(OUT, 'basin.json'), 'utf8')).features[0];
const [BW, BS, BE, BN] = basin.properties.bbox;

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inBasin = (x, y) => ringContains(basin.geometry.coordinates[0], x, y);
const km = ([x1, y1], [x2, y2]) => {
  const k = Math.cos(((y1 + y2) / 2) * Math.PI / 180);
  return Math.hypot((x2 - x1) * k, y2 - y1) * 111.32;
};

// Ramer–Douglas–Peucker on [lon, lat] arrays.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-12;
    let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ---------- river flow chains ----------
console.log('Reading HydroRIVERS…');
const out = await mapshaper.applyCommands(
  `-i "${RAW}/rivers/HydroRIVERS_v10_af_shp/HydroRIVERS_v10_af.shp" -filter "DIS_AV_CMS >= 120 && MAIN_RIV > 0" ` +
  `-filter-fields HYRIV_ID,NEXT_DOWN,MAIN_RIV,UPLAND_SKM,DIS_AV_CMS -o format=geojson r.json`);
const segs = JSON.parse(out['r.json']).features.map(f => ({ ...f.properties, c: f.geometry.coordinates }));
const mouth = segs.filter(s => { const [x, y] = s.c.at(-1); return x > 11.5 && x < 13.5 && y > -7 && y < -5; })
  .sort((a, b) => b.UPLAND_SKM - a.UPLAND_SKM)[0];
const congo = segs.filter(s => s.MAIN_RIV === mouth.MAIN_RIV);
const byId = new Map(congo.map(s => [s.HYRIV_ID, s]));
// Main upstream predecessor of each segment = the one with the largest upstream area.
const mainUp = new Map();
for (const s of congo) {
  const d = byId.get(s.NEXT_DOWN);
  if (!d) continue;
  const cur = mainUp.get(d.HYRIV_ID);
  if (!cur || s.UPLAND_SKM > cur.UPLAND_SKM) mainUp.set(d.HYRIV_ID, s);
}
// Each chain starts at a source (no main predecessor) and follows its main continuation downstream,
// ending where it joins a larger river (segments end exactly where the next one starts).
const chains = [];
for (const s of congo) {
  if (mainUp.has(s.HYRIV_ID)) continue;
  let pts = [...s.c], cur = s, q = s.DIS_AV_CMS;
  for (let d = byId.get(cur.NEXT_DOWN); d && mainUp.get(d.HYRIV_ID) === cur; d = byId.get(cur.NEXT_DOWN)) {
    pts.push(...d.c.slice(1));
    cur = d; q = Math.max(q, d.DIS_AV_CMS);
  }
  pts = simplify(pts, 0.012);
  if (pts.length > 1) chains.push({ q: Math.round(q), c: pts.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]) });
}
chains.sort((a, b) => b.q - a.q);
write('flow.json', chains);
console.log(`  ${chains.length} chains, trunk discharge ${chains[0].q} m³/s`);

// ---------- satellites ----------
console.log('Fetching TLEs…');
const SATS = [
  { name: 'Sentinel-1A', q: 'SENTINEL-1A', role: 'C-band SAR imaging (ESA)', kind: 'sar' },
  { name: 'Sentinel-1C', q: 'SENTINEL-1C', role: 'C-band SAR imaging (ESA)', kind: 'sar' },
  { name: 'Landsat 8', q: 'LANDSAT 8', role: 'Optical / thermal imaging (NASA · USGS)', kind: 'optical' },
  { name: 'Landsat 9', q: 'LANDSAT 9', role: 'Optical / thermal imaging (NASA · USGS)', kind: 'optical' },
  { name: 'GPM Core', q: 'GPM-CORE', role: 'Precipitation radar (NASA · JAXA)', kind: 'precip' },
  { name: 'SWOT', q: 'SWOT', role: 'Surface water & river height (NASA · CNES)', kind: 'hydro' },
];
const tles = [];
for (const s of SATS) {
  const txt = await (await fetch(`https://celestrak.org/NORAD/elements/gp.php?NAME=${encodeURIComponent(s.q)}&FORMAT=TLE`)).text();
  const [, l1, l2] = txt.trim().split(/\r?\n/).map(l => l.trim());
  if (!l1?.startsWith('1 ') || !l2?.startsWith('2 ')) throw new Error(`No TLE for ${s.q}`);
  tles.push({ name: s.name, role: s.role, kind: s.kind, l1, l2 });
}
write('tle.json', { fetched: new Date().toISOString().slice(0, 10), sats: tles });

// ---------- ground-access grid (distance to nearest major road) ----------
console.log('Fetching Natural Earth roads (≈50 MB)…');
const roads = await (await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_roads.geojson')).json();
const PAD = 4;
const verts = [];
for (const f of roads.features) {
  const g = f.geometry; if (!g) continue;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
  for (const l of lines) for (let i = 0; i < l.length; i++) {
    const [x, y] = l[i];
    if (x < BW - PAD || x > BE + PAD || y < BS - PAD || y > BN + PAD) continue;
    verts.push([x, y]);
    const n = l[i + 1];
    if (n) { // densify to ~4 km
      const steps = Math.floor(km(l[i], n) / 4);
      for (let k = 1; k < steps; k++) verts.push([x + ((n[0] - x) * k) / steps, y + ((n[1] - y) * k) / steps]);
    }
  }
}
const bins = new Map();
for (const v of verts) {
  const key = `${Math.floor(v[0])},${Math.floor(v[1])}`;
  if (!bins.has(key)) bins.set(key, []);
  bins.get(key).push(v);
}
const RES = 0.2;
const W = Math.ceil((BE - BW) / RES), H = Math.ceil((BN - BS) / RES);
const grid = new Uint8Array(W * H);
let cells = 0, far = 0;
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const p = [BW + (i + 0.5) * RES, BN - (j + 0.5) * RES];
  if (!inBasin(p[0], p[1])) { grid[j * W + i] = 255; continue; }
  let best = Infinity;
  for (let r = 0; r <= 4 && best > (r - 1) * 100; r++) {
    for (let bx = Math.floor(p[0]) - r; bx <= Math.floor(p[0]) + r; bx++)
      for (let by = Math.floor(p[1]) - r; by <= Math.floor(p[1]) + r; by++) {
        if (Math.max(Math.abs(bx - Math.floor(p[0])), Math.abs(by - Math.floor(p[1]))) !== r) continue;
        for (const v of bins.get(`${bx},${by}`) || []) best = Math.min(best, km(p, v));
      }
  }
  const d = Math.min(best, 500);
  grid[j * W + i] = Math.min(254, Math.round(d / 2)); // 2 km units
  cells++; if (d > 100) far++;
}
write('access.json', {
  bbox: [BW, BS, BW + W * RES, BN], w: W, h: H, unitKm: 2,
  pctOver100: +((far / cells) * 100).toFixed(1),
  d: Buffer.from(grid).toString('base64'),
});
console.log(`  ${((far / cells) * 100).toFixed(1)}% of the basin is >100 km from a major road`);
