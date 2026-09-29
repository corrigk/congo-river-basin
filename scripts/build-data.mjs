// Builds the georeferenced overlays in src/data from HydroSHEDS + Natural Earth.
//
//   RAW=<dir with basins/ and rivers/ unzipped> npm run data
//
// Sources (free / open):
//   HydroBASINS lv06 Africa  https://data.hydrosheds.org/file/HydroBASINS/standard/hybas_af_lev06_v1c.zip
//   HydroRIVERS Africa       https://data.hydrosheds.org/file/HydroRIVERS/HydroRIVERS_v10_af_shp.zip
//   Natural Earth 50m admin-0 boundary lines (fetched below)
//
// Zone polygons are derived from the HydroBASINS drainage topology (NEXT_DOWN):
// a tributary sub-basin = the catchment containing a seed point on that river
// plus every catchment upstream of it.

import mapshaper from 'mapshaper';
import fs from 'node:fs';
import path from 'node:path';

const RAW = process.env.RAW;
if (!RAW) throw new Error('Set RAW to the folder containing basins/ and rivers/');
const OUT = path.resolve('src/data');
fs.mkdirSync(OUT, { recursive: true });

const ms = async (cmd, inputs) => mapshaper.applyCommands(cmd, inputs);
const write = (name, str) => {
  fs.writeFileSync(path.join(OUT, name), str);
  console.log(`  ${name.padEnd(22)} ${(Buffer.byteLength(str) / 1024).toFixed(0)} KB`);
};

// ---------- geometry helpers ----------
function ringContains(ring, [x, y]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyContains(geom, pt) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.some(p => ringContains(p[0], pt) && !p.slice(1).some(h => ringContains(h, pt)));
}
function centroid(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let sx = 0, sy = 0, n = 0;
  for (const [x, y] of polys[0][0]) { sx += x; sy += y; n++; }
  return [sx / n, sy / n];
}
function bbox(geom) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const walk = c => (typeof c[0] === 'number'
    ? (b[0] = Math.min(b[0], c[0]), b[1] = Math.min(b[1], c[1]), b[2] = Math.max(b[2], c[0]), b[3] = Math.max(b[3], c[1]))
    : c.forEach(walk));
  walk(geom.coordinates);
  return b.map(v => +v.toFixed(3));
}

// ---------- basins ----------
console.log('Reading HydroBASINS…');
let out = await ms(`-i "${RAW}/basins/hybas_af_lev06_v1c.shp" -o format=geojson all.json`);
const all = JSON.parse(out['all.json']).features;

const at = pt => all.find(f => polyContains(f.geometry, pt));
const congoMain = at([20, 0]).properties.MAIN_BAS;
const congo = all.filter(f => f.properties.MAIN_BAS === congoMain);
console.log(`  Congo MAIN_BAS ${congoMain}: ${congo.length} catchments`);

const byId = new Map(congo.map(f => [f.properties.HYBAS_ID, f]));
const upstreamOf = new Map();
for (const f of congo) {
  const d = f.properties.NEXT_DOWN;
  if (!upstreamOf.has(d)) upstreamOf.set(d, []);
  upstreamOf.get(d).push(f.properties.HYBAS_ID);
}
// Snap a seed to the river itself: the catchment within ~0.25° holding the largest upstream area.
function snap([x0, y0], r = 0.25) {
  let best = null;
  for (let dx = -r; dx <= r; dx += 0.05) for (let dy = -r; dy <= r; dy += 0.05) {
    const f = congo.find(c => polyContains(c.geometry, [x0 + dx, y0 + dy]));
    if (f && (!best || f.properties.UP_AREA > best.properties.UP_AREA)) best = f;
  }
  return best.properties.HYBAS_ID;
}
function catchmentAbove(pt) {
  const seed = snap(pt);
  const set = new Set([seed]);
  const stack = [seed];
  while (stack.length) for (const u of upstreamOf.get(stack.pop()) || []) if (!set.has(u)) { set.add(u); stack.push(u); }
  return set;
}

// Seed points [lon, lat] on each river (just above its confluence / at its defining point).
const SEEDS = {
  ubangi:  [18.06, 1.62],   // Ubangi at Impfondo
  sangha:  [16.05, 1.61],   // Sangha at Ouesso
  kasai:   [16.95, -3.05],  // Kasai near Mushie, above Kwamouth
  lualaba: [25.20, 0.52],   // Lualaba at Boyoma Falls / Kisangani
};
const zoneOf = new Map();
for (const [k, pt] of Object.entries(SEEDS)) for (const id of catchmentAbove(pt)) zoneOf.set(id, k);

// River mouth zone: everything downstream of the Kasai confluence (Kwamouth) to the Atlantic.
const aboveKwamouth = catchmentAbove([16.20, -3.17]);
for (const f of congo) {
  const id = f.properties.HYBAS_ID;
  if (!aboveKwamouth.has(id) && !zoneOf.has(id)) zoneOf.set(id, 'mouth');
}

// Cuvette Centrale: remaining central-depression catchments (Likouala, Ruki, Lulonga, Busira…).
for (const f of congo) {
  const id = f.properties.HYBAS_ID;
  if (zoneOf.has(id)) continue;
  const [x, y] = centroid(f.geometry);
  if (x < 23.6 && y > -3.2 && y < 3.2) zoneOf.set(id, 'cuvette');
}

const tagged = {
  type: 'FeatureCollection',
  features: congo.map(f => ({ type: 'Feature', geometry: f.geometry, properties: { zone: zoneOf.get(f.properties.HYBAS_ID) || 'other' } })),
};
const counts = {};
for (const f of tagged.features) counts[f.properties.zone] = (counts[f.properties.zone] || 0) + 1;
console.log('  catchments per zone', counts);

console.log('Dissolving + simplifying…');
out = await ms(
  `-i congo.json -dissolve zone -filter "zone !== 'other'" -simplify 12% keep-shapes -o format=geojson precision=0.0005 zones.json`,
  { 'congo.json': tagged });
const zones = JSON.parse(out['zones.json']);
const stats = {};
for (const f of congo) {
  const z = zoneOf.get(f.properties.HYBAS_ID) || 'other';
  stats[z] ??= { area: 0, n: 0 };
  stats[z].area += f.properties.SUB_AREA;
  stats[z].n++;
}
for (const f of zones.features) {
  const s = stats[f.properties.zone];
  Object.assign(f.properties, { bbox: bbox(f.geometry), area_km2: Math.round(s.area), catchments: s.n });
}
write('zones.json', JSON.stringify(zones));

out = await ms(`-i congo.json -dissolve -simplify 12% keep-shapes -o format=geojson geojson-type=FeatureCollection precision=0.0005 basin.json`, { 'congo.json': tagged });
const basin = JSON.parse(out['basin.json']);
basin.features[0].properties = {
  bbox: bbox(basin.features[0].geometry),
  area_km2: Math.round(Math.max(...congo.map(f => f.properties.UP_AREA))),
  catchments: congo.length,
};
write('basin.json', JSON.stringify(basin));

out = await ms(`-i congo.json -innerlines -simplify 12% -o format=geojson geojson-type=FeatureCollection precision=0.0005 catch.json`, { 'congo.json': tagged });
write('catchments.json', out['catch.json'].toString());

// ---------- rivers ----------
console.log('Reading HydroRIVERS (large)…');
out = await ms(
  `-i "${RAW}/rivers/HydroRIVERS_v10_af_shp/HydroRIVERS_v10_af.shp" -filter "UPLAND_SKM >= 2000 && MAIN_RIV > 0" ` +
  `-filter-fields MAIN_RIV,UPLAND_SKM,DIS_AV_CMS,ORD_FLOW -o format=geojson rivers.json`);
const rivers = JSON.parse(out['rivers.json']).features;
const mouthSeg = rivers
  .filter(f => { const [x, y] = f.geometry.coordinates.at(-1); return x > 11.5 && x < 13.5 && y > -7 && y < -5; })
  .sort((a, b) => b.properties.UPLAND_SKM - a.properties.UPLAND_SKM)[0];
const congoRiv = mouthSeg.properties.MAIN_RIV;
const congoRivers = rivers.filter(f => f.properties.MAIN_RIV === congoRiv);
console.log(`  Congo MAIN_RIV ${congoRiv}: ${congoRivers.length} segments`);

// Width class from mean discharge (m³/s): 0 = trunk … 3 = small tributary.
const cls = q => (q >= 8000 ? 0 : q >= 1500 ? 1 : q >= 300 ? 2 : 3);
out = await ms(
  `-i r.json -dissolve c -simplify 25% -o format=geojson precision=0.0005 r2.json`,
  { 'r.json': { type: 'FeatureCollection', features: congoRivers.map(f => ({ ...f, properties: { c: cls(f.properties.DIS_AV_CMS) } })) } });
write('rivers.json', out['r2.json'].toString());

// ---------- country borders (context) ----------
console.log('Fetching Natural Earth borders…');
const ne = await (await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_boundary_lines_land.geojson')).json();
out = await ms(`-i ne.json -clip bbox=4,-18,40,14 -filter-fields NAME -o format=geojson precision=0.001 b.json`, { 'ne.json': ne });
write('borders.json', out['b.json'].toString());

console.log('Done.');
