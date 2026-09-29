// Data Flow layer: animated arcs between deployed assets and the Basin Data Hub.
// Inbound (mint) = observations flowing to the hub; outbound (gold) = alerts / tasking flowing out.
import { Cesium as C } from './cesium.js';
import { flowMaterial, arc, setAlpha } from './fx.js';

export const HUB = { lon: 15.31, lat: -4.33, name: 'Basin Data Hub' };

// Which asset classes send data in, and which receive alerts / tasking.
export const SENDS = new Set(['satellite', 'uav', 'ground', 'water', 'community']);
export const RECEIVES = new Set(['government', 'community', 'water', 'uav']);

const IN = C.Color.fromCssColorString('#7CF5CF');
const OUT = C.Color.fromCssColorString('#E6C98F');

// Stage → which directions are active.
export const STAGE_MODE = {
  observe: 'in', collect: 'in', integrate: 'in', assess: 'in',
  forecast: 'hub', prioritize: 'hub',
  deploy: 'out', support: 'out',
  feedback: 'loop',
};

export function createDataFlow(globe) {
  const P = globe.scene.primitives;
  const links = [];

  function makeLink(from, to, dir, meta = {}) {
    const positions = arc(from, to, { n: 90, lift: 0.24 });
    const color = dir === 'in' ? IN : OUT;
    const base = C.Material.fromType('PolylineGlow', { color: color.withAlpha(0.55), glowPower: 0.22 });
    base.__base = 0.55;
    const pulse = flowMaterial(color.withAlpha(1), { repeat: 2, speed: 0.45, tail: 0.42 });
    const geom = w => new C.GeometryInstance({
      geometry: new C.PolylineGeometry({ positions, width: w, arcType: C.ArcType.NONE, vertexFormat: C.PolylineMaterialAppearance.VERTEX_FORMAT }),
    });
    const basePrim = P.add(new C.Primitive({ geometryInstances: geom(6), appearance: new C.PolylineMaterialAppearance({ material: base, translucent: true }), asynchronous: false }));
    const pulsePrim = P.add(new C.Primitive({ geometryInstances: geom(10), appearance: new C.PolylineMaterialAppearance({ material: pulse, translucent: true }), asynchronous: false }));
    const l = { dir, ...meta, basePrim, pulsePrim, base, pulse, target: 0, a: 0 };
    links.push(l);
    return l;
  }

  function removeLink(l) {
    P.remove(l.basePrim); P.remove(l.pulsePrim);
    links.splice(links.indexOf(l), 1);
  }

  // Standing links for every deployed asset marker.
  function setAssets(assets) {
    for (const a of assets) {
      const at = [a.lon, a.lat, a.h];
      const hub = [HUB.lon, HUB.lat, 0];
      if (SENDS.has(a.a)) makeLink(at, hub, 'in', { zone: a.z, asset: a.a, standing: true });
      if (RECEIVES.has(a.a)) makeLink(hub, at, 'out', { zone: a.z, asset: a.a, standing: true });
    }
  }

  let state = { on: false, mode: 'all', zone: null };
  function update(next) {
    state = { ...state, ...next };
    for (const l of links) {
      if (!l.standing) continue;
      const m = state.mode;
      let t = !state.on ? 0
        : m === 'all' || m === 'loop' ? 1
        : m === 'in' ? (l.dir === 'in' ? 1 : 0)
        : m === 'out' ? (l.dir === 'out' ? 1 : 0)
        : 0.25; // 'hub': faint network, the hub itself pulses
      if (state.zone && t) t *= l.zone === state.zone ? 1 : 0.18;
      l.target = t;
    }
  }

  // Temporary links (scenario beats). Returns handles; call clearCustom() to drop them.
  const custom = [];
  function addCustom(from, to, dir) {
    const l = makeLink(from, to, dir);
    l.target = 1;
    custom.push(l);
    return l;
  }
  function clearCustom() { while (custom.length) removeLink(custom.pop()); }

  globe.onTick((t, { overlay, near }) => {
    const vis = overlay * Math.max(near, 0.35);
    for (const l of links) {
      l.a += (l.target - l.a) * 0.08;
      const show = l.a > 0.01 && vis > 0.02;
      l.basePrim.show = l.pulsePrim.show = show;
      if (show) { setAlpha(l.base, l.a * vis); setAlpha(l.pulse, l.a * vis); }
    }
  });

  return { setAssets, update, addCustom, clearCustom, get state() { return state; } };
}
