import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesium = 'node_modules/cesium/Build/Cesium';

export default defineConfig({
  base: './',
  plugins: [
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map(d => ({ src: `${cesium}/${d}`, dest: 'cesium', rename: { stripBase: 4 } })),
    }),
    {
      name: 'cesium-base-url',
      transformIndexHtml: html => html.replace('<!--cesium-->', `<script>window.CESIUM_BASE_URL = './cesium/';</script>`),
    },
  ],
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
  server: { port: 5173 },
});
