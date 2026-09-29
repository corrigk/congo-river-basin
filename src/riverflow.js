// Animated river flow: comet pulses travelling downstream along HydroRIVERS main-stem chains.
import { Cesium as C } from './cesium.js';
import { flowMaterial, pieces, setAlpha } from './fx.js';
import flow from './data/flow.json';

export const FLOW_CHAINS = flow;

const CLASSES = [
  { min: 8000, width: 5,   piece: 220, speed: 0.55, color: '#E8FAFF', a: 0.95 }, // main stem
  { min: 1500, width: 3.5, piece: 150, speed: 0.5,  color: '#CFF1FF', a: 0.85 },
  { min: 0,    width: 2.4, piece: 100, speed: 0.45, color: '#B5E6FA', a: 0.7 },
];

export function createRiverFlow(globe) {
  const prims = CLASSES.map(cls => {
    const instances = [];
    for (const ch of flow) {
      if (CLASSES.find(c => ch.q >= c.min) !== cls) continue;
      for (const p of pieces(ch.c, cls.piece, 6)) {
        instances.push(new C.GeometryInstance({
          geometry: new C.PolylineGeometry({
            positions: C.Cartesian3.fromDegreesArrayHeights(p.flatMap(([x, y]) => [x, y, 900])),
            width: cls.width, arcType: C.ArcType.NONE, vertexFormat: C.PolylineMaterialAppearance.VERTEX_FORMAT,
          }),
        }));
      }
    }
    const material = flowMaterial(C.Color.fromCssColorString(cls.color).withAlpha(cls.a), { speed: cls.speed, tail: 0.45 });
    const prim = globe.scene.primitives.add(new C.Primitive({
      geometryInstances: instances, appearance: new C.PolylineMaterialAppearance({ material, translucent: true }), asynchronous: true,
    }));
    return { prim, material };
  });

  globe.onTick((t, { overlay, near }) => {
    const on = globe.layers.flow && globe.layers.rivers;
    for (const { prim, material } of prims) {
      prim.show = on && overlay * near > 0.02;
      setAlpha(material, overlay * near);
    }
  });
}
