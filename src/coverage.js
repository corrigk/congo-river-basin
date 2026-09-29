// Coverage-gap overlay: distance to the nearest major road (Natural Earth), a proxy for where
// in-situ sensors are hardest to install and maintain. Grid built by scripts/build-extras.mjs.
import { Cesium as C } from './cesium.js';
import access from './data/access.json';

export const ACCESS = access;

// km → [r, g, b, a]
function ramp(km) {
  if (km < 40) return [0, 0, 0, 0];
  if (km < 100) { const t = (km - 40) / 60; return [230, 170, 90, 15 + t * 70]; }
  const t = Math.min((km - 100) / 150, 1);
  return [219 - t * 40, 106 - t * 50, 67 - t * 30, 140 + t * 80];
}

export async function createCoverage(globe) {
  const { w, h, unitKm, bbox } = access;
  const raw = Uint8Array.from(atob(access.d), c => c.charCodeAt(0));
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  const g = small.getContext('2d');
  const img = g.createImageData(w, h);
  for (let i = 0; i < raw.length; i++) {
    const [r, gg, b, a] = raw[i] === 255 ? [0, 0, 0, 0] : ramp(raw[i] * unitKm);
    img.data.set([r, gg, b, a], i * 4);
  }
  g.putImageData(img, 0, 0);
  // Upscale with smoothing for soft contours.
  const big = document.createElement('canvas');
  big.width = w * 8; big.height = h * 8;
  const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true; bg.imageSmoothingQuality = 'high';
  bg.drawImage(small, 0, 0, big.width, big.height);

  const layer = globe.viewer.imageryLayers.addImageryProvider(
    await C.SingleTileImageryProvider.fromUrl(big.toDataURL('image/png'), {
      rectangle: C.Rectangle.fromDegrees(...bbox), credit: new C.Credit('Natural Earth roads'),
    }));
  Object.assign(layer, { show: false, alpha: 0 });

  let fade = 0;
  globe.onTick((t, { overlay }) => {
    fade += ((globe.layers.coverage ? 1 : 0) - fade) * 0.08;
    layer.show = fade * overlay > 0.01;
    layer.alpha = fade * overlay;
  });
}
