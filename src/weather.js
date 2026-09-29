// Live weather from NASA GIBS (no key): the most recent full day of NOAA-20 VIIRS true-colour imagery
// (clouds as the satellite saw them) and an animated loop of GPM IMERG precipitation rate over the last day.
import { Cesium as C } from './cesium.js';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const FRAMES = 8;           // IMERG frames, 3 h apart
const STEP_H = 3;
const LATENCY_H = 6;        // IMERG early-run latency margin

const pad = n => String(n).padStart(2, '0');
const isoDay = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const isoTime = d => `${isoDay(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00Z`;

export function createWeather(globe) {
  const layers = globe.viewer.imageryLayers;
  const now = new Date();
  const cloudDay = new Date(now.getTime() - 864e5); // yesterday (UTC) is a complete global mosaic

  const clouds = layers.addImageryProvider(new C.UrlTemplateImageryProvider({
    url: `${GIBS}/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${isoDay(cloudDay)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    maximumLevel: 8, credit: new C.Credit('NASA GIBS · VIIRS NOAA-20'),
  }));
  Object.assign(clouds, { show: false, alpha: 0 });

  const last = new Date(now.getTime() - LATENCY_H * 36e5);
  last.setUTCMinutes(last.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  const frames = [];
  for (let i = FRAMES - 1; i >= 0; i--) {
    const t = new Date(last.getTime() - i * STEP_H * 36e5);
    const layer = layers.addImageryProvider(new C.UrlTemplateImageryProvider({
      url: `${GIBS}/IMERG_Precipitation_Rate_30min/default/${isoTime(t)}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
      maximumLevel: 6, credit: new C.Credit('NASA GIBS · GPM IMERG'),
    }));
    Object.assign(layer, { show: false, alpha: 0 });
    frames.push({ t, layer });
  }

  let playing = true, idx = FRAMES - 1, lastStep = 0, fade = 0;
  const listeners = new Set();
  globe.onTick((secs, { overlay }) => {
    const on = globe.layers.weather;
    fade += ((on ? 1 : 0) - fade) * 0.08;
    const vis = fade * Math.max(overlay, 0.6);
    clouds.show = vis > 0.01;
    clouds.alpha = 0.92 * vis;
    if (on && playing && secs - lastStep > 0.9) {
      lastStep = secs;
      idx = (idx + 1) % FRAMES;
      for (const f of listeners) f(frames[idx].t);
    }
    frames.forEach((f, i) => {
      // Keep every frame loaded (show) while active so the loop doesn't flicker; only the current one is opaque.
      f.layer.show = vis > 0.01;
      f.layer.alpha = i === idx ? 0.95 * vis : 0;
    });
  });

  return {
    cloudDay: isoDay(cloudDay),
    frames: frames.map(f => f.t),
    get current() { return frames[idx].t; },
    toggle() { playing = !playing; return playing; },
    get playing() { return playing; },
    onFrame: f => listeners.add(f),
  };
}
