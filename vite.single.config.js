// Backup build: one self-contained HTML file (app code, data and fonts inlined; Cesium from the jsDelivr CDN).
//   npm run build:single  ->  congo-conops-backup.html
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('./node_modules/cesium/package.json', import.meta.url)));
const CDN = `https://cdn.jsdelivr.net/npm/cesium@${pkg.version}/Build/Cesium/`;

export default defineConfig({
  base: './',
  resolve: {
    alias: [{ find: /^\.\/cesium\.js$/, replacement: fileURLToPath(new URL('./src/cesium-global.js', import.meta.url)) }],
  },
  plugins: [
    {
      name: 'cesium-cdn',
      transformIndexHtml: html => html.replace('<!--cesium-->',
        `<link rel="stylesheet" href="${CDN}Widgets/widgets.css" />
  <script>window.CESIUM_BASE_URL = '${CDN}';</script>
  <script src="${CDN}Cesium.js"></script>`),
    },
    viteSingleFile(),
    {
      name: 'copy-out',
      closeBundle() { fs.copyFileSync('dist-single/index.html', 'congo-conops-backup.html'); },
    },
  ],
  build: { target: 'es2022', outDir: 'dist-single', emptyOutDir: true },
});
