// Space segment: real observation satellites propagated from CelesTrak TLEs (SGP4 via satellite.js).
// Time runs accelerated from "now" so passes are visible during a presentation.
import { Cesium as C } from './cesium.js';
import * as sat from 'satellite.js';
import tle from './data/tle.json';
import { ASSET_ICON } from './icons.js';
import { token } from './theme.js';

const SPEED = 90; // simulated seconds per real second
const KIND = {
  sar:     { color: token('river'), label: 'SAR' },
  optical: { color: token('alert'), label: 'Optical' },
  precip:  { color: token('precip'), label: 'Precipitation' },
  hydro:   { color: token('hydro'), label: 'Surface water' },
};

function iconImage(color) {
  const s = 64, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = 'rgba(8,10,14,0.85)'; g.strokeStyle = color; g.lineWidth = 3;
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, Math.PI * 2); g.fill(); g.stroke();
  const img = new Image();
  const svg = ASSET_ICON.satellite.replace('stroke="currentColor"', `stroke="${color}"`).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" ');
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return new Promise(res => { img.onload = () => { g.drawImage(img, 14, 14, 36, 36); res(cv); }; img.onerror = () => res(cv); });
}

export async function createOrbits(globe, { inBasin }) {
  const { scene } = globe;
  const bb = scene.primitives.add(new C.BillboardCollection());
  const labels = scene.primitives.add(new C.LabelCollection());
  const lines = scene.primitives.add(new C.PolylineCollection());

  const sats = await Promise.all(tle.sats.map(async t => {
    const k = KIND[t.kind];
    const color = C.Color.fromCssColorString(k.color);
    const rec = sat.twoline2satrec(t.l1, t.l2);
    return {
      ...t, rec, color, kindLabel: k.label,
      bill: bb.add({ image: await iconImage(k.color), width: 30, height: 30, show: false }),
      label: labels.add({
        text: t.name, font: '600 13px Inter, sans-serif', fillColor: C.Color.WHITE, outlineColor: C.Color.BLACK,
        outlineWidth: 3, style: C.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new C.Cartesian2(20, -2),
        horizontalOrigin: C.HorizontalOrigin.LEFT, verticalOrigin: C.VerticalOrigin.CENTER, show: false,
      }),
      ahead: lines.add({ width: 1.6, material: C.Material.fromType('PolylineDash', { color: color.withAlpha(0.55), dashLength: 14 }), show: false }),
      trail: lines.add({ width: 2.4, material: C.Material.fromType('PolylineGlow', { color: color.withAlpha(0.9), glowPower: 0.25 }), show: false }),
      nadir: lines.add({ width: 1.2, material: C.Material.fromType('Color', { color: color.withAlpha(0.5) }), show: false }),
      swath: lines.add({ width: 16, material: C.Material.fromType('Color', { color: color.withAlpha(0.22) }), show: false }),
      over: false, nextPass: null,
    };
  }));

  const simStart = Date.now(), realStart = performance.now();
  const simNow = () => new Date(simStart + (performance.now() - realStart) * SPEED);

  function geo(s, date) {
    const pv = sat.propagate(s.rec, date);
    if (!pv || !pv.position) return null;
    const g = sat.eciToGeodetic(pv.position, sat.gstime(date));
    return { lon: sat.degreesLong(g.longitude), lat: sat.degreesLat(g.latitude), h: g.height * 1000 };
  }
  const cart = p => C.Cartesian3.fromDegrees(p.lon, p.lat, p.h);
  function track(s, date, fromMin, toMin, stepMin, surface = false) {
    const out = [];
    for (let m = fromMin; m <= toMin; m += stepMin) {
      const p = geo(s, new Date(date.getTime() + m * 60000));
      if (p) out.push(C.Cartesian3.fromDegrees(p.lon, p.lat, surface ? 3000 : p.h));
    }
    return out;
  }
  // Next time (sim) the sub-satellite point enters the basin, scanning ahead up to 24 h.
  function findNextPass(s, from) {
    for (let m = 0; m < 24 * 60; m += 0.5) {
      const p = geo(s, new Date(from.getTime() + m * 60000));
      if (p && inBasin([p.lon, p.lat])) return new Date(from.getTime() + m * 60000);
    }
    return null;
  }

  let lastTrack = 0, visible = false;
  const listeners = new Set();
  globe.onTick(() => {
    const on = globe.layers.sats;
    if (on !== visible) {
      visible = on;
      for (const s of sats) for (const o of [s.bill, s.label, s.ahead, s.trail, s.nadir]) o.show = on;
      if (!on) for (const s of sats) s.swath.show = false;
    }
    if (!on) return;
    const now = simNow();
    const redrawTracks = performance.now() - lastTrack > 250;
    for (const s of sats) {
      const p = geo(s, now);
      if (!p) continue;
      const c = cart(p);
      s.bill.position = c; s.label.position = c;
      s.nadir.positions = [c, C.Cartesian3.fromDegrees(p.lon, p.lat, 0)];
      s.pos = p;
      const over = inBasin([p.lon, p.lat]);
      if (over !== s.over) { s.over = over; s.label.fillColor = over ? s.color : C.Color.WHITE; }
      if (redrawTracks) {
        s.trail.positions = track(s, now, -22, 0, 1);
        s.ahead.positions = track(s, now, 0, 80, 2);
        s.swath.show = over || !!(s.swathUntil && now < s.swathUntil);
        if (over) s.swathUntil = new Date(now.getTime() + 6 * 60000);
        if (s.swath.show) s.swath.positions = track(s, now, -10, 0, 0.5, true);
        if (!s.nextPass || s.nextPass < now) s.nextPass = over ? now : findNextPass(s, now) || new Date(now.getTime() + 864e5);
      }
    }
    if (redrawTracks) { lastTrack = performance.now(); for (const f of listeners) f(sats, now); }
  });

  return {
    sats, simNow,
    onUpdate: f => listeners.add(f),
  };
}
