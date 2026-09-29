// Spotlight mask = a wide rectangle minus the basin, cut into grid cells smaller than the basin so no
// piece contains a hole (Cesium triangulates big polygons-with-holes poorly). Run after build-data.
import pc from 'polygon-clipping';
import fs from 'node:fs';

const basin = JSON.parse(fs.readFileSync('src/data/basin.json', 'utf8')).features[0].geometry;
const [W, S, E, N, COLS, ROWS] = [-40, -60, 85, 55, 6, 6];
const dx = (E - W) / COLS, dy = (N - S) / ROWS;
const features = [];
for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) {
  const [w, s] = [W + i * dx, S + j * dy], [e, n] = [w + dx, s + dy];
  const cell = [[[w, s], [e, s], [e, n], [w, n], [w, s]]];
  for (const poly of pc.difference(cell, basin.coordinates)) {
    if (poly.length > 1) throw new Error('mask cell still has a hole — use a finer grid');
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: poly } });
  }
}
fs.writeFileSync('src/data/mask.json', JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`mask.json: ${features.length} pieces`);
